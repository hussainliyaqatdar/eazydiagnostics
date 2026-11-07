import { NextRequest, NextResponse } from "next/server";
import { extractCoords, extractPageCoords, isGoogleMapsUrl } from "@/lib/maps-link";

// Reads a location off a Google Maps link, server-side (a browser can't read
// the final URL of a cross-origin redirect).
//
// Share links (maps.app.goo.gl/...) redirect to one of two kinds of page:
//  - one with the coordinates in the URL (".../@12.89,77.58,17z/..."), or
//  - a bare place page (".../place/Name/data=!4m2!3m1!1s0x...") that has only a
//    place ID in the URL. The coordinates are then in the page itself (the map
//    image's "center=" value), so we read the page.
// Either way the link is returned too: even if no coordinates can be found, a
// valid Google Maps link is enough for our phlebotomist to find the address, so
// missing coordinates never block a booking.
export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "Please provide a valid link" }, { status: 400 });
  }
  const link = url.trim();
  if (!isGoogleMapsUrl(link)) {
    return NextResponse.json({ error: "That doesn't look like a Google Maps link" }, { status: 400 });
  }

  try {
    const res = await fetch(link, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "en-IN,en;q=0.9" },
      signal: AbortSignal.timeout(10_000),
    });
    // A redirect may not leave Google Maps; if it does, don't read the page.
    if (!isGoogleMapsUrl(res.url)) return NextResponse.json({ link });

    let coords = extractCoords(res.url);
    if (!coords) {
      // Bounded read: the place page is a few hundred KB; the coordinates are early in it.
      const html = (await res.text()).slice(0, 600_000);
      coords = extractPageCoords(html);
    }
    return NextResponse.json({ ...(coords ?? {}), link });
  } catch {
    // Couldn't open it from here - the link itself is still valid to hand to the phlebotomist.
    return NextResponse.json({ link });
  }
}
