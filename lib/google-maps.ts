// Client-side. Loads the Google Maps JavaScript API once, only when it is first needed (the "Search location"
// dialog on the checkout page). The key is a browser key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY): restrict it in Google
// Cloud to this site's address and to the Maps JavaScript, Places (New) and Geocoding APIs.
export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const MAPS_KEY_PRESENT = MAPS_KEY.length > 0;

let loading: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly&loading=async&region=IN&language=en`;
    script.async = true;
    script.onload = () => (w.google?.maps?.importLibrary ? resolve(w.google) : reject(new Error("Maps API missing")));
    script.onerror = () => reject(new Error("Maps API failed to load"));
    document.head.appendChild(script);
  }).catch((err) => {
    loading = null; // allow another try next time the dialog opens
    throw err;
  });
  return loading;
}
