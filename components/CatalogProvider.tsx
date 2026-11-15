"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Catalog, EMPTY_CATALOG } from "@/lib/catalog";
import { fromWire, type WireCatalog } from "@/lib/catalog-wire";

type Value = { catalog: Catalog; ready: boolean };
const CatalogContext = createContext<Value>({ catalog: EMPTY_CATALOG, ready: false });

const STORAGE_PREFIX = "catalog:";

// What this tab already has, so moving between pages never downloads or rebuilds it.
let memo: { key: string; catalog: Catalog } | null = null;

// Gives the browser the catalog (tests and packages, for search and the cart). It is downloaded once per catalog
// version and kept in localStorage, so a repeat visit has it straight away and a search never waits on the network.
// `version` and `refId` come from the server: the catalog version, and the doctor id of the affiliate link (whose
// own custom panels are included).
export function CatalogProvider({ version, refId, children }: { version: number; refId: string | null; children: React.ReactNode }) {
  const key = `${STORAGE_PREFIX}v${version}:${refId ?? ""}`;
  const [value, setValue] = useState<Value>({ catalog: EMPTY_CATALOG, ready: false });

  useEffect(() => {
    if (memo?.key === key) {
      setValue({ catalog: memo.catalog, ready: true });
      return;
    }
    let cancelled = false;
    const use = (wire: WireCatalog) => {
      const catalog = fromWire(wire);
      memo = { key, catalog };
      if (!cancelled) setValue({ catalog, ready: true });
    };
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        use(JSON.parse(saved));
        return () => {
          cancelled = true;
        };
      }
    } catch {
      // No storage (private window): fall through to the network.
    }
    fetch(`/api/catalog?v=${version}${refId ? `&ref=${encodeURIComponent(refId)}` : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<WireCatalog>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((wire) => {
        use(wire);
        try {
          // Older versions are no use any more.
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX) && k !== key) localStorage.removeItem(k);
          }
          localStorage.setItem(key, JSON.stringify(wire));
        } catch {
          // Storage full or blocked: it just downloads again next time.
        }
      })
      .catch((err) => console.error("The catalog could not be loaded:", err));
    return () => {
      cancelled = true;
    };
  }, [key, version, refId]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

// The catalog for searching and pricing in the browser.
export function useCatalog(): Catalog {
  return useContext(CatalogContext).catalog;
}

// False until the catalog has arrived (so a cart can say "loading" instead of "empty").
export function useCatalogReady(): boolean {
  return useContext(CatalogContext).ready;
}
