import { delay, HttpResponse } from "msw";

/** Base URL of the (mocked) upstream backend the BFF talks to. */
export const BACKEND_URL = process.env.BACKEND_URL ?? "https://backend.mock.winprofx.local";

/** Realistic mock latency: 300–900 ms. Set MOCK_LATENCY=off to disable (unit tests). */
export async function mockLatency(): Promise<void> {
  if (process.env.MOCK_LATENCY === "off") return;
  await delay(300 + Math.round(Math.random() * 600));
}

/**
 * `?mockError=<domain>` switch. The BFF forwards the page's `mockError` query
 * value as the `x-mock-error` header; a handler for that domain then fails.
 */
export function forcedError(request: Request, domain: string): Response | null {
  const value = request.headers.get("x-mock-error") ?? new URL(request.url).searchParams.get("mockError");
  if (!value) return null;
  const domains = value.split(",").map((d) => d.trim());
  if (!domains.includes(domain) && !domains.includes("all")) return null;
  return HttpResponse.json(
    { code: "MOCK_FORCED_ERROR", message: `Forced error for "${domain}" (mockError switch).` },
    { status: 503 },
  );
}

/** Dev-only invariant check: logs a console error on violation (brief §8). */
export function assertInvariant(condition: boolean, message: string): void {
  if (!condition && process.env.NODE_ENV !== "production") {
    console.error(`[mock invariant] ${message}`);
  }
}
