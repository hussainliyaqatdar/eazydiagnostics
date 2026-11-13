"use client";
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, MAPS_KEY_PRESENT } from "@/lib/google-maps";

export type PickedLocation = { lat: number; lng: number };
// What the dialog hands back: the pin, and the address Google gives for it (looked up once, on Confirm).
export type PickedResult = PickedLocation & { address?: string };
type Suggestion = { id: string; main: string; secondary: string; prediction: any };

const BENGALURU: PickedLocation = { lat: 12.9716, lng: 77.5946 };

// "Search location": a dialog on larger screens and a drawer that slides up from the bottom on phones. The patient
// searches for their address (Google Places), or taps "Use current location", then moves the map so the pin sits on
// their doorstep. The pin is fixed in the middle of the map and the map moves under it, which works with a thumb.
// Nothing is saved until "Confirm location". Without a Maps API key it still offers "Use current location".
export default function LocationPickerModal({
  open,
  onClose,
  onPick,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (loc: PickedResult) => void;
  initial?: PickedLocation | null;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const tokenRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const searchSeq = useRef(0);
  // Set when the text box was filled by choosing a result, so that does not start another search.
  const skipSearch = useRef(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<PickedLocation | null>(initial ?? null);
  const [confirming, setConfirming] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  // Lock page scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Reset each time it opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSuggestions([]);
    setMessage("");
    setConfirming(false);
    setCenter(initial ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // One address lookup, when the patient confirms (not each time the map moves, which would be billed each time).
  // If it fails or is slow, the pin is still saved without an address.
  async function confirm() {
    if (!center || confirming) return;
    setConfirming(true);
    let address: string | undefined;
    try {
      const lookup = geocoderRef.current?.geocode({ location: center });
      const res = lookup ? await Promise.race([lookup, new Promise<null>((r) => setTimeout(() => r(null), 3000))]) : null;
      address = (res as any)?.results?.[0]?.formatted_address || undefined;
    } catch {
      address = undefined;
    }
    onPick({ ...center, address });
  }

  // Load the map once the dialog opens.
  useEffect(() => {
    if (!open || !MAPS_KEY_PRESENT) return;
    let cancelled = false;
    setStatus("loading");
    loadGoogleMaps()
      .then(async (g) => {
        if (cancelled) return;
        const [{ Map }, places, { Geocoder }] = await Promise.all([g.maps.importLibrary("maps"), g.maps.importLibrary("places"), g.maps.importLibrary("geocoding")]);
        if (cancelled || !mapEl.current) return;
        placesRef.current = places;
        tokenRef.current = new places.AutocompleteSessionToken();
        geocoderRef.current = new Geocoder();
        const start = initial ?? BENGALURU;
        const map = new Map(mapEl.current, {
          center: start,
          zoom: initial ? 17 : 12,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        mapRef.current = map;
        // The pin is the middle of the map: every time the map stops moving, that is the chosen spot.
        map.addListener("idle", () => {
          const c = map.getCenter();
          if (!c) return;
          const loc = { lat: c.lat(), lng: c.lng() };
          setCenter(loc);
        });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Suggestions as the patient types (a short pause between keystrokes).
  useEffect(() => {
    if (!open || status !== "ready") return;
    const text = query.trim();
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (text.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = placesRef.current;
        const { suggestions: found } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          sessionToken: tokenRef.current,
          includedRegionCodes: ["in"],
          ...(center ? { locationBias: { center, radius: 30000 } } : {}),
        });
        if (seq !== searchSeq.current) return;
        setSuggestions(
          (found ?? [])
            .filter((s: any) => s.placePrediction)
            .slice(0, 6)
            .map((s: any, i: number) => ({
              id: `${i}-${s.placePrediction.placeId}`,
              main: s.placePrediction.mainText?.text ?? s.placePrediction.text?.text ?? "",
              secondary: s.placePrediction.secondaryText?.text ?? "",
              prediction: s.placePrediction,
            }))
        );
      } catch {
        if (seq === searchSeq.current) setSuggestions([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, status]);

  async function choose(s: Suggestion) {
    setMessage("");
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress"] });
      const loc = place.location;
      if (!loc) throw new Error("no location");
      mapRef.current?.setZoom(17);
      mapRef.current?.panTo({ lat: loc.lat(), lng: loc.lng() });
      skipSearch.current = true;
      setQuery(s.main);
      setSuggestions([]);
      // A new session starts after a place is chosen (keeps Google's billing per search, not per keystroke).
      tokenRef.current = new placesRef.current.AutocompleteSessionToken();
    } catch {
      setMessage("Couldn't open that place. Try another result.");
    }
  }

  function useCurrent() {
    if (!navigator.geolocation) {
      setMessage("Location isn't supported on this browser.");
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocating(false);
        if (mapRef.current) {
          mapRef.current.setZoom(17);
          mapRef.current.panTo(loc);
        } else {
          // No map (no API key): the current location is used straight away.
          onPick(loc);
        }
      },
      () => {
        setLocating(false);
        setMessage("Couldn't access your location. Please allow location access, or search for your address.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (!open) return null;
  const mapsOn = MAPS_KEY_PRESENT && status !== "error";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search location" className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-gray-900">Search location</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          {mapsOn ? (
            <div className="relative">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your area, street or landmark"
                aria-label="Search location"
                disabled={status !== "ready"}
                className="w-full rounded-md border bg-white px-3 py-2.5 text-sm disabled:bg-gray-50"
              />
              {(suggestions.length > 0 || (searching && query.trim().length >= 3)) && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white shadow-lg" role="listbox">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => choose(s)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-brand-light">
                        <span className="text-sm font-medium text-gray-900">{s.main}</span>
                        {s.secondary && <span className="text-xs text-gray-500">{s.secondary}</span>}
                      </button>
                    </li>
                  ))}
                  {searching && suggestions.length === 0 && <li className="px-3 py-2 text-xs text-gray-500">Searching&hellip;</li>}
                </ul>
              )}
            </div>
          ) : (
            <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {MAPS_KEY_PRESENT ? "The map couldn't load right now." : "Map search isn't available right now."} You can use your current location, or close this and choose &ldquo;Add manually&rdquo; to paste a Google Maps link.
            </p>
          )}

          <button
            type="button"
            onClick={useCurrent}
            disabled={locating}
            className="flex items-center justify-center gap-2 rounded-md border border-brand bg-white px-4 py-2.5 text-sm font-medium text-brand-dark transition hover:bg-brand-light disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {locating ? "Locating…" : "Use current location"}
          </button>
          {message && <p className="text-xs text-red-600">{message}</p>}

          {mapsOn && (
            <>
              <div className="relative h-64 w-full overflow-hidden rounded-lg border bg-gray-100 sm:h-72">
                <div ref={mapEl} className="h-full w-full" />
                {status === "loading" && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Loading map&hellip;</div>}
                {status === "ready" && (
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" aria-hidden="true">
                    <svg viewBox="0 0 24 34" className="h-10 w-7 drop-shadow-md">
                      <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.6 12 34 12 34s12-13.4 12-22.3C24 5.2 18.6 0 12 0z" fill="#FF7A45" />
                      <circle cx="12" cy="11.5" r="4.5" fill="#fff" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600">Move the map so the pin sits on your doorstep.</p>
            </>
          )}
        </div>

        {mapsOn && (
          <div className="border-t px-4 py-3">
            <button
              type="button"
              disabled={status !== "ready" || !center || confirming}
              onClick={confirm}
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirming ? "Saving\u2026" : "Confirm location"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
