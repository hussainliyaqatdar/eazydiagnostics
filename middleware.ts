import { NextRequest, NextResponse } from "next/server";

// The /admin pages show doctors' personal details, so they CAN sit behind HTTP
// Basic auth: set ADMIN_PASSWORD (and optionally ADMIN_USER, default "admin") on
// the server to turn the login on. With no password set the admin pages are
// open to anyone who knows the URL - an accepted choice for now; set the
// password before sharing the site widely.
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.ADMIN_USER || "admin";
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const i = decoded.indexOf(":");
      if (i >= 0 && decoded.slice(0, i) === user && decoded.slice(i + 1) === password) return NextResponse.next();
    } catch {
      // Malformed header - fall through to the login prompt.
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Eazy Diagnostics admin"' },
  });
}
