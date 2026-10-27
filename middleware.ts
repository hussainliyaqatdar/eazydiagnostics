import { NextRequest, NextResponse } from "next/server";

// The /admin pages show patients' and doctors' personal details, so they sit
// behind HTTP Basic auth. Set ADMIN_PASSWORD (and optionally ADMIN_USER, default
// "admin") on the server. With no password set, /admin is open in local
// development and locked completely in production.
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Admin is disabled: set ADMIN_PASSWORD on the server.", { status: 503 });
  }

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
