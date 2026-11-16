// Client-side. Loads the Google Maps JavaScript API once, only when it is first needed (the "Search location"
// dialog on the checkout page). The key is a browser key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY): restrict it in Google
// Cloud to this site's address and to the Maps JavaScript, Places (New) and Geocoding APIs.
export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const MAPS_KEY_PRESENT = MAPS_KEY.length > 0;

let loading: Promise<any> | null = null;

const ready = (w: any) => !!w.google?.maps?.importLibrary;

// Resolves with `google` once the API is ready to use. The script tag finishing is not enough on its own: with
// loading=async the API can finish setting itself up a moment after the tag's load event, which made the very
// first attempt fail while a second one worked. So this waits for Google's own "ready" callback, and as a
// backstop also checks for the API every 100 ms (for up to 15 seconds).
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (ready(w)) return Promise.resolve(w.google);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    let done = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const script = document.createElement("script");
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(timeout);
      delete w.__eazyMapsReady;
      if (err) {
        script.remove(); // so a retry starts clean
        reject(err);
      } else resolve(w.google);
    };

    w.__eazyMapsReady = () => finish();
    // Google calls this when the key is refused (wrong website restriction, API not enabled, billing off).
    w.gm_authFailure = () => finish(new Error("Google refused the Maps API key (check its website restriction, the enabled APIs and billing)."));

    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly&loading=async&region=IN&language=en&callback=__eazyMapsReady`;
    script.async = true;
    script.onerror = () => finish(new Error("The Maps API script could not be loaded (blocked or offline)."));
    document.head.appendChild(script);

    poll = setInterval(() => ready(w) && finish(), 100);
    timeout = setTimeout(() => finish(new Error("The Maps API took too long to load.")), 15_000);
  }).catch((err) => {
    loading = null; // allow another try next time the dialog opens
    throw err;
  });
  return loading;
}
