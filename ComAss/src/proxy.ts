import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { isDemoMode } from "@/lib/config";

/**
 * Optimistic auth gate (Next.js 16 "proxy", formerly middleware).
 * - Unauthenticated API calls get a 401 JSON response.
 * - Unauthenticated page visits are sent to /login (remembering where they were going).
 * - Signed-in users visiting /login are sent on to the app, unless their Gmail
 *   token could not be refreshed, in which case /login lets them sign in again.
 * - Demo mode (Google OAuth not configured): pages are open, since the app only
 *   uses local sample data and cannot send email. API routes still enforce auth.
 * This is NOT the only check: API route handlers also call requireAuth().
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const isLogin = pathname === "/login" || pathname === "/login/";

  if (isDemoMode() && !pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  let token: JWT | null = null;
  try {
    token = await getToken({ req: request });
  } catch {
    // Missing/invalid secret or undecodable cookie: treat as signed out.
  }

  if (token) {
    if (isLogin && !token.error) {
      const url = request.nextUrl.clone();
      const target = new URL(safeCallbackUrl(searchParams.get("callbackUrl")), request.url);
      url.pathname = target.pathname;
      url.search = target.search;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isLogin) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const dest = safeCallbackUrl(pathname + search);
  if (dest !== "/") url.searchParams.set("callbackUrl", dest);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Skip only: NextAuth's own endpoints (/api/auth/...), Next internals, and the
    // exact public files. Anything else (including future /api/* routes) is gated.
    "/((?!api/auth/|_next/|(?:favicon\\.ico|sample-leads\\.csv|file\\.svg|globe\\.svg|next\\.svg|vercel\\.svg|window\\.svg)$).*)",
  ],
};
