import { http, HttpResponse } from "msw";
import type { ReferralProgram, Signal } from "@/lib/api/schemas";
import { funnelViolations } from "@/lib/referrals";
import { seedQuotes, seedReferralProgram, seedSignals } from "../fixtures/insights";
import { isVerifiedPersona } from "../store";
import { assertInvariant, BACKEND_URL, forcedError, mockLatency } from "../utils";
import { sessionUser } from "./auth";

const B = BACKEND_URL;
const json = (body: unknown, status = 200) => HttpResponse.json(body as object, { status });
const fail = (status: number, code: string, message: string) => json({ code, message }, status);

interface InsightsData {
  signals: Signal[];
  watchlist: string[];
  referrals: ReferralProgram;
}
const g = globalThis as unknown as { __wpxInsights?: Map<string, InsightsData> };

function data(userId: string): InsightsData {
  g.__wpxInsights ??= new Map();
  let d = g.__wpxInsights.get(userId);
  if (!d) {
    const now = Date.now();
    const program = seedReferralProgram(now);
    if (!isVerifiedPersona(userId)) {
      // First-time state: a link, nothing else yet.
      program.funnel = { clicks: 0, registered: 0, kycApproved: 0, webinar: 0, eligible: 0, rewarded: 0 };
      program.earnings = { total: 0, pending: 0 };
      program.referrals = [];
      program.campaign = null;
    }
    d = { signals: seedSignals(now), watchlist: ["EURUSD", "XAUUSD", "BTCUSD"], referrals: program };
    g.__wpxInsights.set(userId, d);
  }
  return d;
}

async function guard(request: Request, domain: string) {
  await mockLatency();
  const forced = forcedError(request, domain);
  if (forced) return forced;
  const s = sessionUser(request);
  return s ? s.user : fail(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
}

const EMBEDS = ["autochartist", "social", "pamm"] as const;

export const insightsHandlers = [
  http.get(`${B}/market/quotes`, async ({ request }) => {
    const user = await guard(request, "quotes");
    if (user instanceof Response) return user;
    return json({ items: seedQuotes(Date.now()) });
  }),

  http.get(`${B}/insights/watchlist`, async ({ request }) => {
    const user = await guard(request, "watchlist");
    if (user instanceof Response) return user;
    return json({ symbols: data(user.id).watchlist });
  }),
  http.put(`${B}/insights/watchlist`, async ({ request }) => {
    const user = await guard(request, "watchlist");
    if (user instanceof Response) return user;
    const b = (await request.json().catch(() => ({}))) as { symbols?: unknown };
    const symbols = Array.isArray(b.symbols)
      ? b.symbols.filter((x): x is string => typeof x === "string")
      : null;
    if (!symbols || symbols.length > 12) return fail(422, "VALIDATION", "Choose up to 12 symbols.");
    data(user.id).watchlist = [...new Set(symbols)];
    return json({ symbols: data(user.id).watchlist });
  }),

  /** Client positioning. Only shown when source + timestamp are present (§6.6). */
  http.get(`${B}/insights/sentiment`, async ({ request }) => {
    const user = await guard(request, "sentiment");
    if (user instanceof Response) return user;
    const longs: Record<string, number> = { EURUSD: 62, GBPUSD: 41, USDJPY: 55, XAUUSD: 71, BTCUSD: 58 };
    const symbols = new URL(request.url).searchParams.get("symbols")?.split(",") ?? Object.keys(longs);
    return json({
      source: "WinproFX client positions",
      asOf: new Date(Date.now() - 5 * 60_000).toISOString(),
      items: symbols.filter((s) => s in longs).map((symbol) => ({ symbol, longPercent: longs[symbol] })),
    });
  }),

  http.get(`${B}/insights/signals`, async ({ request }) => {
    const user = await guard(request, "signals");
    if (user instanceof Response) return user;
    return json({ items: data(user.id).signals, syncedAt: new Date().toISOString() });
  }),
  http.put(`${B}/insights/signals/:id/favourite`, async ({ request, params }) => {
    const user = await guard(request, "signals");
    if (user instanceof Response) return user;
    const s = data(user.id).signals.find((x) => x.id === params.id);
    if (!s) return fail(404, "NOT_FOUND", "We couldn't find that signal.");
    const b = (await request.json().catch(() => ({}))) as { favourite?: boolean };
    s.favourite = !!b.favourite;
    return json(s);
  }),

  /** SSO handoff for embeds. Mock URLs point at /mock-embed (mock builds only). */
  http.get(`${B}/embeds/:provider`, async ({ request, params }) => {
    const provider = String(params.provider);
    const user = await guard(request, `embed-${provider}`);
    if (user instanceof Response) return user;
    if (!EMBEDS.includes(provider as (typeof EMBEDS)[number]))
      return fail(404, "NOT_FOUND", "Unknown provider.");
    const forced = forcedError(request, "embed-timeout");
    const theme = new URL(request.url).searchParams.get("theme") === "light" ? "light" : "dark";
    const token = Math.random().toString(36).slice(2, 12);
    const page = forced ? "hang" : provider;
    return json({
      url: `/mock-embed/${page}?theme=${theme}&token=${token}`,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
  }),

  http.get(`${B}/rewards/referrals`, async ({ request }) => {
    const user = await guard(request, "referrals");
    if (user instanceof Response) return user;
    const program = { ...data(user.id).referrals, syncedAt: new Date().toISOString() };
    const violations = funnelViolations(program.funnel);
    assertInvariant(violations.length === 0, `referral funnel is not monotonic: ${violations.join(", ")}`);
    return json(program);
  }),
];
