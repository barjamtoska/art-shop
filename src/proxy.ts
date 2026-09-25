import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/*
 * A first, cheap filter for the admin area: no session cookie, no entry.
 * It cannot tell a valid session from a forged cookie, so the admin layout
 * and every server action check the real session (src/lib/admin.ts).
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin/sign-in")) return NextResponse.next();
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/admin/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
