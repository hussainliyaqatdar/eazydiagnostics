// Google Maps links: which hosts we accept and how to read coordinates out of
// a URL. Shared by the link resolver and by booking validation, so the two can
// never disagree about what counts as a Google Maps link.

const ALLOWED_HOSTS = ["maps.app.goo.gl", "goo.gl", "google.com", "www.google.com", "maps.google.com"];

export function isGoogleMapsUrl(input: unknown): input is string {
  if (typeof input !== "string" || input.length > 1000) return false;
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_HOSTS.some((h) => u.host === h || u.host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function valid(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

// Tried in priority order: the precise marker position (!3d..!4d..), the
// viewport centre (@lat,lng), the search form (/search/lat,lng), ?q=lat,lng,
// and the map-image centre (center=lat%2Clng) that place pages embed.
const PATTERNS = [
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  /\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/,
  /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
  /center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/,
];

// For a Google place page's HTML: only the map-image centre (og:image "center=")
// is the place itself - the page holds other coordinates for nearby places.
export function extractPageCoords(html: string): { lat: number; lng: number } | null {
  const m = html.match(/center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return valid(lat, lng) ? { lat, lng } : null;
}

export function extractCoords(text: string): { lat: number; lng: number } | null {
  for (const p of PATTERNS) {
    const m = text.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}
