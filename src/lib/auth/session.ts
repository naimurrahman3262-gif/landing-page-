/**
 * Signed session cookie, readable on the Edge (middleware) and in Node (BFF).
 *
 * The cookie is httpOnly, so client JS can never read it. It carries the
 * backend session token plus the few flags middleware needs to route without
 * calling the backend: email verified, 2FA still pending, expiry.
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 */

import { AUTH_ROUTES } from "./constants";

export * from "./constants";

export interface SessionPayload {
  /** Backend session token. Never sent to the browser in a readable form. */
  token: string;
  /** Email verified? Unverified users are routed to /verify-email. */
  ev: boolean;
  /** Second factor still required? Routed to /2fa. */
  mfa: boolean;
  /** "Remember me": keeps the 30-day lifetime when the cookie is re-issued. */
  rem: boolean;
  /** Expiry, epoch seconds. */
  exp: number;
}

export const SESSION_TTL = { short: 12 * 60 * 60, remember: 30 * 24 * 60 * 60 } as const;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    throw new Error("SESSION_SECRET must be set (≥ 32 chars) in production.");
  }
  return "dev-only-session-secret-change-me-0123456789";
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

/** Returns the payload if the signature is valid and the session hasn't expired. */
export async function verifySession(
  value: string | undefined,
  now = Date.now(),
): Promise<SessionPayload | null> {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64Url(sig) as BufferSource,
      encoder.encode(body),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Only allow same-origin relative paths as `?next=` targets (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/api") || AUTH_ROUTES.some((r) => next === r || next.startsWith(`${r}?`)))
    return fallback;
  return next;
}
