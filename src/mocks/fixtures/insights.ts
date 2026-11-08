import type { ReferralProgram, Signal } from "@/lib/api/schemas";
import { INSTRUMENTS } from "@/config/instruments";

/** Mid prices used to build mock quotes and signal levels. */
export const MIDS: Record<string, number> = {
  EURUSD: 1.0842,
  GBPUSD: 1.2715,
  USDJPY: 151.42,
  AUDUSD: 0.6538,
  USDCAD: 1.3871,
  USDCHF: 0.8823,
  EURGBP: 0.8527,
  EURJPY: 164.17,
  XAUUSD: 2381.4,
  XAGUSD: 28.215,
  BTCUSD: 67250,
  NZDUSD: 0.5964,
  USDTRY: 34.21,
  USDZAR: 18.07,
};

export function seedQuotes(now: number) {
  const at = new Date(now).toISOString();
  return INSTRUMENTS.map((i) => {
    const mid = MIDS[i.symbol]!;
    const half = i.pipSize * 0.6;
    return {
      symbol: i.symbol,
      bid: +(mid - half).toFixed(i.digits),
      ask: +(mid + half).toFixed(i.digits),
      at,
    };
  });
}

export function seedSignals(now: number): Signal[] {
  const ago = (m: number) => new Date(now - m * 60_000).toISOString();
  const s = (
    id: string,
    symbol: string,
    group: Signal["group"],
    direction: Signal["direction"],
    digits: number,
    step: number,
    minutes: number,
    summary: string,
  ): Signal => {
    const entry = MIDS[symbol]!;
    const dir = direction === "buy" ? 1 : direction === "sell" ? -1 : 0;
    return {
      id,
      symbol,
      group,
      direction,
      timeframe: "4H",
      entry,
      target: dir ? +(entry + dir * step * 2).toFixed(digits) : null,
      stop: dir ? +(entry - dir * step).toFixed(digits) : null,
      digits,
      summary,
      source: "WinproFX Research",
      issuedAt: ago(minutes),
      favourite: false,
    };
  };
  return [
    s("sg_1", "EURUSD", "major", "buy", 5, 0.0035, 25, "Higher lows since Monday; buyers defending 1.0800."),
    s(
      "sg_2",
      "GBPUSD",
      "major",
      "sell",
      5,
      0.004,
      70,
      "Rejected at 1.2780 resistance twice; momentum fading.",
    ),
    s(
      "sg_3",
      "USDJPY",
      "major",
      "neutral",
      3,
      0.6,
      130,
      "Range-bound between 150.80 and 152.00 ahead of data.",
    ),
    s("sg_4", "XAUUSD", "major", "buy", 2, 12, 15, "Breakout above 2,375 held on the retest."),
    s("sg_5", "EURGBP", "minor", "sell", 5, 0.0025, 200, "Lower highs on the 4-hour chart."),
    s("sg_6", "EURJPY", "minor", "buy", 3, 0.5, 340, "Trend intact above the 50-period average."),
    s(
      "sg_7",
      "NZDUSD",
      "minor",
      "neutral",
      5,
      0.003,
      400,
      "No clear direction; waiting for a break of 0.6000.",
    ),
    s("sg_8", "USDTRY", "exotic", "buy", 4, 0.15, 520, "Steady uptrend; wide spreads, so size down."),
    s("sg_9", "USDZAR", "exotic", "sell", 4, 0.12, 610, "Failed to hold 18.20; support at 17.85."),
  ];
}

export function seedReferralProgram(now: number): ReferralProgram {
  const day = (d: number) => new Date(now - d * 86_400_000).toISOString();
  return {
    link: "https://my.winprofx.com/register?ref=RC7H2K",
    code: "RC7H2K",
    currency: "USD",
    rewards: { referrer: 50, friend: 25, minDeposit: 200, minLots: 2 },
    funnel: { clicks: 214, registered: 37, kycApproved: 21, webinar: 12, eligible: 6, rewarded: 4 },
    earnings: { total: 200, pending: 100 },
    referrals: [
      { id: "rf_1", name: "Ayesha K.", joinedAt: day(2), status: "registered", reward: null },
      { id: "rf_2", name: "Tanvir H.", joinedAt: day(5), status: "kycApproved", reward: null },
      { id: "rf_3", name: "Minh T.", joinedAt: day(9), status: "webinar", reward: null },
      { id: "rf_4", name: "Priya S.", joinedAt: day(14), status: "eligible", reward: 50 },
      { id: "rf_5", name: "Omar F.", joinedAt: day(18), status: "eligible", reward: 50 },
      { id: "rf_6", name: "Lan N.", joinedAt: day(31), status: "rewarded", reward: 50 },
      { id: "rf_7", name: "Karim R.", joinedAt: day(44), status: "rewarded", reward: 50 },
      { id: "rf_8", name: "Sadia B.", joinedAt: day(70), status: "expired", reward: null },
    ],
    campaign: {
      name: "Autumn referral bonus",
      startedAt: "2026-09-01T00:00:00.000Z",
      endsAt: "2026-10-24T17:59:59.000Z",
      endedAt: "2026-10-24T17:59:59.000Z",
      summary: "Double rewards for friends who verified during the campaign.",
    },
    syncedAt: new Date(now).toISOString(),
  };
}
