/**
 * Browser → BFF fetch wrapper. All client calls go to `/api/*` (same origin,
 * httpOnly session cookie, no tokens in JS). Mutations carry the CSRF
 * double-submit header. POSTs are never retried here.
 */
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/auth/constants";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** Field → validation message key (from Zod on the BFF/backend). */
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/** In mock mode, `?mockError=x` on the page is forwarded so the BFF/mock can fail on purpose. */
function mockErrorHeader(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled" || typeof window === "undefined") return {};
  const value = new URLSearchParams(window.location.search).get("mockError");
  return value ? { "x-mock-error": value } : {};
}

export interface ApiFetchInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Idempotency key for money-moving POSTs (§9). */
  idempotencyKey?: string;
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const method = (init.method ?? (init.body !== undefined ? "POST" : "GET")).toUpperCase();
  const mutating = !["GET", "HEAD"].includes(method);
  const csrf = readCookie(CSRF_COOKIE);

  const res = await fetch(`/api${path}`, {
    ...init,
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(mutating && csrf ? { [CSRF_HEADER]: csrf } : {}),
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      ...mockErrorHeader(),
      ...init.headers,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const body = (await res.json().catch(() => null)) as
    (T & { code?: string; message?: string; fields?: Record<string, string> }) | null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.code ?? "UNKNOWN",
      body?.message ?? res.statusText,
      body?.fields ?? {},
    );
  }
  return body as T;
}
