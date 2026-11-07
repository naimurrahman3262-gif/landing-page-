import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthResult, User } from "@/lib/api/schemas";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  SESSION_TTL,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/session";

/**
 * BFF helpers shared by route handlers and server components.
 * The browser only ever talks to /api/*; only this layer talks to the backend.
 */

export const BACKEND_URL = process.env.BACKEND_URL ?? "https://backend.mock.winprofx.local";
const IS_PROD = process.env.NODE_ENV === "production";

export interface BackendResponse<T = unknown> {
  status: number;
  ok: boolean;
  body: T;
}

export async function backend<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {},
): Promise<BackendResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: init.method ?? "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const body = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, ok: res.ok, body };
  } catch {
    return {
      status: 502,
      ok: false,
      body: {
        code: "BACKEND_UNREACHABLE",
        message: "We couldn't reach our servers. Try again in a moment.",
      } as T,
    };
  }
}

/** Headers forwarded from the browser request to the backend. */
export function forwardHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  const idem = req.headers.get("idempotency-key");
  if (idem) out["Idempotency-Key"] = idem;
  const mockError = req.headers.get("x-mock-error");
  if (mockError && process.env.NEXT_PUBLIC_API_MOCKING === "enabled") out["x-mock-error"] = mockError;
  const country = req.headers.get("x-vercel-ip-country");
  if (country) out["X-Client-Country"] = country;
  return out;
}

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

/* ------------------------------ session ------------------------------ */

export async function readSession(req?: NextRequest): Promise<SessionPayload | null> {
  const value = req ? req.cookies.get(SESSION_COOKIE)?.value : (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(value);
}

export async function writeSession(
  res: NextResponse,
  result: Pick<AuthResult, "token" | "mfaRequired"> & { user: Pick<User, "emailVerified"> },
  remember: boolean,
) {
  const ttl = remember ? SESSION_TTL.remember : SESSION_TTL.short;
  const payload: SessionPayload = {
    token: result.token,
    ev: result.user.emailVerified,
    mfa: result.mfaRequired,
    rem: remember,
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  res.cookies.set(SESSION_COOKIE, await signSession(payload), {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    // Without "remember me" the cookie ends with the browser session.
    ...(remember ? { maxAge: ttl } : {}),
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/* -------------------------------- CSRF -------------------------------- */

/**
 * Double-submit check for every mutating BFF call: the header must equal the
 * cookie (set by middleware), and the Origin must be this site.
 */
export function checkCsrf(req: NextRequest): NextResponse | null {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return null;
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return errorResponse(403, "CSRF", "Request blocked.");
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  const header = req.headers.get(CSRF_HEADER);
  if (!cookie || !header || cookie !== header) {
    return errorResponse(403, "CSRF", "Your session needs a refresh. Reload the page and try again.");
  }
  return null;
}

/** For server components: the signed-in user, or null (no session / expired at backend). */
export async function getCurrentUser(): Promise<{ user: User; session: SessionPayload } | "expired" | null> {
  const session = await readSession();
  if (!session) return null;
  const res = await backend<User>("/me", { token: session.token });
  if (res.status === 401) return "expired";
  if (!res.ok) return null;
  return { user: res.body, session };
}
