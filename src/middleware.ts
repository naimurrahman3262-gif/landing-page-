import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, CSRF_COOKIE, SESSION_COOKIE, randomToken, verifySession } from "@/lib/auth/session";

/**
 * Route guard (Edge runtime on Vercel). No backend calls here: routing is
 * decided from the signed session cookie only.
 *
 *  no session              → /login?next=<path>
 *  2FA pending             → /2fa
 *  email not verified      → /verify-email
 *  signed in on an auth page → / (or ?next)
 *
 * It also issues the CSRF double-submit cookie.
 */
const ONBOARDING = { mfa: "/2fa", email: "/verify-email" } as const;
const PUBLIC_WHEN_SIGNED_OUT = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  let res: NextResponse;
  const redirect = (to: string) => NextResponse.redirect(new URL(to, req.url));
  // Lets server components know the current path (e.g. to come back after a session expires).
  const headers = new Headers(req.headers);
  headers.set("x-pathname", `${pathname}${search}`);
  const pass = () => NextResponse.next({ request: { headers } });

  if (pathname.startsWith("/api/") || pathname.startsWith("/dev/")) {
    // API routes enforce auth themselves; /dev/* is the style guide (404 in production).
    res = pass();
  } else if (!session) {
    if (PUBLIC_WHEN_SIGNED_OUT.includes(pathname)) res = pass();
    else {
      const target = isAuthRoute ? "/" : `${pathname}${search}`;
      res = redirect(`/login?next=${encodeURIComponent(target)}`);
    }
  } else if (session.mfa) {
    res = pathname === ONBOARDING.mfa ? pass() : redirect(ONBOARDING.mfa);
  } else if (!session.ev) {
    res = pathname === ONBOARDING.email ? pass() : redirect(ONBOARDING.email);
  } else if (isAuthRoute) {
    const next = req.nextUrl.searchParams.get("next");
    res = redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
  } else {
    res = pass();
  }

  if (!req.cookies.get(CSRF_COOKIE)) {
    res.cookies.set(CSRF_COOKIE, randomToken(24), {
      httpOnly: false, // read by apiFetch and echoed in a header
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|mockServiceWorker.js|.*\\.(?:png|jpg|svg|webp|woff2)$).*)",
  ],
};
