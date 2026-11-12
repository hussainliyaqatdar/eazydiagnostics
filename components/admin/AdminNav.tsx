"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; hint: string; match: string[]; icon: string };

// Simple line icons (24x24, stroke), shown when the pane is collapsed.
const ICONS: Record<string, string> = {
  orders: "M9 5h6M9 3h6a1 1 0 011 1v1H8V4a1 1 0 011-1zM8 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2M9 12h6M9 16h4",
  clinics: "M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3 3 0 100-6 3 3 0 000 6zM20 19v-1a3 3 0 00-2.5-2.96M15.5 5.2a3 3 0 010 5.6",
  whatsapp: "M21 12a8 8 0 01-11.6 7.1L4 20.5l1.5-5.2A8 8 0 1121 12zM9 9.5c0 3 2.5 5.5 5.5 5.5",
  email: "M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zM3.5 7.5L12 13l8.5-5.5",
  inbox: "M4 13l2-7h12l2 7M4 13v5a1 1 0 001 1h14a1 1 0 001-1v-5M4 13h4l1 2h6l1-2h4",
};

// Every admin page, grouped. `match` lists the path prefixes that count as "this page" (an order's own page
// belongs to Orders, a clinic's page to Clinics and doctors).
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Operations",
    items: [{ href: "/admin/orders", label: "Orders", hint: "Visits, statuses, reports", match: ["/admin/orders"], icon: "orders" }],
  },
  {
    title: "Partners",
    items: [{ href: "/admin/doctors", label: "Clinics & doctors", hint: "Clinics, doctors, affiliate links", match: ["/admin/doctors", "/admin/clinics"], icon: "clinics" }],
  },
  {
    title: "Messaging",
    items: [
      { href: "/admin/whatsapp", label: "WhatsApp", hint: "Templates, mapping, message log", match: ["/admin/whatsapp"], icon: "whatsapp" },
      { href: "/admin/email", label: "Email delivery", hint: "Email status", match: ["/admin/email"], icon: "email" },
      { href: "/admin/inbox", label: "Dev inbox", hint: "Emails captured in development", match: ["/admin/inbox"], icon: "inbox" },
    ],
  },
];

const STORAGE_KEY = "admin-nav-collapsed";
const isActive = (path: string, item: Item) => item.match.some((m) => path === m || path.startsWith(`${m}/`));

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

// The side navigation for every /admin page. On wide screens it can be collapsed to a narrow icon rail (the
// choice is remembered in this browser); on narrow screens it is a collapsible menu bar.
export default function AdminNav() {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const current = GROUPS.flatMap((g) => g.items).find((i) => isActive(path, i));

  // The remembered choice is read after the first paint, so the server and the browser render the same thing first.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage can be blocked; the pane simply starts expanded.
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        // Not remembered.
      }
      return !c;
    });
  }

  const linkList = (rail: boolean) => (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-1">
          {!rail && <span className="px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{g.title}</span>}
          {g.items.map((item) => {
            const active = isActive(path, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={rail ? item.label : undefined}
                title={rail ? item.label : undefined}
                onClick={() => setOpen(false)}
                className={
                  rail
                    ? `flex h-10 w-10 items-center justify-center self-center rounded-md transition ${active ? "bg-brand-light text-brand-dark" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`
                    : `flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition ${active ? "border-brand bg-brand-light font-semibold text-brand-dark" : "border-transparent text-gray-700 hover:bg-gray-100"}`
                }
              >
                <Icon name={item.icon} className={rail ? "h-5 w-5" : "h-4 w-4 shrink-0 opacity-70"} />
                {!rail && (
                  <span className="flex min-w-0 flex-col">
                    {item.label}
                    <span className={`text-[11px] font-normal ${active ? "text-brand-dark/70" : "text-gray-400"}`}>{item.hint}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      {!rail && (
        <div className="flex flex-col gap-1 border-t pt-3">
          <Link href="/for-doctors#signup" className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800">Doctor sign-up form</Link>
          <Link href="/" className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800">&larr; Back to the site</Link>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Narrow screens: a bar showing where you are, with the menu behind it. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-800"
        >
          <span>
            <span className="text-xs font-normal text-gray-400">Admin &middot; </span>
            {current?.label ?? "Menu"}
          </span>
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
        {open && <div className="mt-2 rounded-lg border bg-white p-3">{linkList(false)}</div>}
      </div>

      {/* Wide screens: stays in view while the page scrolls; collapses to an icon rail. */}
      <aside className={`hidden shrink-0 transition-[width] duration-200 lg:block ${collapsed ? "w-14" : "w-56"}`}>
        <div className="sticky top-20 rounded-lg border bg-white p-2">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand the navigation" : "Collapse the navigation"}
            title={collapsed ? "Expand the navigation" : "Collapse the navigation"}
            className={`mb-2 flex h-8 items-center rounded-md text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 ${collapsed ? "w-10 justify-center self-center" : "w-full justify-between px-2"}`}
          >
            {!collapsed && <span className="font-semibold uppercase tracking-wide">Admin</span>}
            <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div className={collapsed ? "flex flex-col items-center" : "px-1 pb-1"}>{linkList(collapsed)}</div>
        </div>
      </aside>
    </>
  );
}
