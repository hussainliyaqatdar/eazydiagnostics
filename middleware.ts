import { NextRequest, NextResponse } from "next/server";
import { REF_CLEAR, REF_COOKIE, REF_HEADER, validRef } from "./lib/brand";
import { REF_PARAM } from "./lib/referral-storage";

// Two jobs:
//
// 1. The /admin pages show doctors' personal details, so they CAN sit behind HTTP
//    Basic auth: set ADMIN_PASSWORD (and optionally ADMIN_USER, default "admin") on
//    the server to turn the login on. With no password set the admin pages are
//    open to anyone who knows the URL - an accepted choice for now; set the
//    password before sharing the site widely.
//
// 2. Remember which doctor's referral link the visitor opened (/?ref=DR-XXXX), so
//    every page - starting with the first one - can show that clinic's version of
//    the site. The doctor id goes on the request (for this page) and in a cookie
//    (for the next ones). /?ref=clear forgets it.
//
// Static files and images skip the middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|images/|brands/|.*\\.(?:jpg|jpeg|png|webp|svg|ico|html|txt|xml)$).*)"],
};

const ONE_DAY = 60 * 60 * 24;

function adminDenied(req: NextRequest): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;

  const user = process.env.ADMIN_USER || "admin";
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const i = decoded.indexOf(":");
      if (i >= 0 && decoded.slice(0, i) === user && decoded.slice(i + 1) === password) return null;
    } catch {
      // Malformed header - fall through to the login prompt.
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Eazy Diagnostics admin"' },
  });
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    const denied = adminDenied(req);
    if (denied) return denied;
    return NextResponse.next();
  }

  const asked = req.nextUrl.searchParams.get(REF_PARAM)?.trim().toUpperCase();
  // Someone who types the address, opens a bookmark or arrives from another site (e.g.
  // Google) without a referral link is on the public site: a clinic's version must not
  // follow them there from an earlier visit. Moving around inside the site, and
  // reloading a page, keep it. (Non-browser clients send none of these headers.)
  const isReload = /max-age=0|no-cache/i.test(`${req.headers.get("cache-control") ?? ""} ${req.headers.get("pragma") ?? ""}`);
  const freshEntry =
    req.headers.get("sec-fetch-dest") === "document" &&
    ["none", "cross-site"].includes(req.headers.get("sec-fetch-site") ?? "") &&
    !isReload;
  // The bare home address is always the public site, however it was reached (typing it,
  // refreshing it, a bookmark). A clinic's own home links carry its ?ref= (see homeHref).
  // Background prefetches don't count.
  const isBackground = req.headers.has("rsc") || req.headers.has("next-router-prefetch");
  const bareHome = path === "/" && !asked && !isBackground;
  const leftClinic = (freshEntry || bareHome) && !validRef(asked);

  const clear = asked === REF_CLEAR || leftClinic;
  const fromLink = clear ? null : validRef(asked);
  const current = clear ? null : fromLink ?? validRef(req.cookies.get(REF_COOKIE)?.value);

  // Never trust a header the visitor sent: set it from the link or cookie, or remove it.
  const requestHeaders = new Headers(req.headers);
  if (current) requestHeaders.set(REF_HEADER, current);
  else requestHeaders.delete(REF_HEADER);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (fromLink) res.cookies.set(REF_COOKIE, fromLink, { path: "/", maxAge: ONE_DAY, sameSite: "lax" });
  if (clear) res.cookies.delete(REF_COOKIE);
  return res;
}
