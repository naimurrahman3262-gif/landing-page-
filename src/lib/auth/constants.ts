/** Cookie and header names, safe to import from client code. */
export const SESSION_COOKIE = "wpx_session";
export const CSRF_COOKIE = "wpx_csrf";
export const CSRF_HEADER = "x-csrf-token";
export const RESET_COOKIE = "wpx_reset";
export const THEME_COOKIE = "wpx_theme";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const NAV_COOKIE = "wpx_nav";

/** Routes rendered without the app shell; reachable without a full session. */
export const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/2fa",
];
