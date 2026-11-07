import type { Deal } from "@/lib/api/schemas";
import { contractSize } from "./accounts";
import { rng, round2, roundTo } from "./random";

const SYMBOLS = [
  { symbol: "EURUSD", price: 1.083, digits: 5 },
  { symbol: "GBPUSD", price: 1.27, digits: 5 },
  { symbol: "USDJPY", price: 151.4, digits: 3 },
  { symbol: "XAUUSD", price: 2640, digits: 2 },
  { symbol: "US30", price: 43800, digits: 1 },
] as const;

/**
 * ~70 closed deals over the last 90 days for one account. Profit follows from
 * prices (P/L = Δprice × volume × contract size, ÷ price for USD-base pairs),
 * so the history is internally consistent.
 */
export function seedDeals(
  login: number,
  now: number,
  count = 72,
  commissionPerLot: number | null = null,
): Deal[] {
  const r = rng(login);
  const deals: Deal[] = [];
  for (let i = 0; i < count; i++) {
    const s = r.pick(SYMBOLS);
    const side = r.chance(0.55) ? "buy" : "sell";
    const volume = r.pick([0.01, 0.05, 0.1, 0.1, 0.2, 0.2, 0.5, 1]);
    const closeTime = now - r.int(1, 89 * 24) * 3_600_000 - r.int(0, 59) * 60_000;
    const openTime = closeTime - r.int(10, 60 * 30) * 60_000;
    const openPrice = roundTo(s.price * (1 + (r.next() - 0.5) * 0.04), s.digits);
    const move = (r.next() - 0.45) * 0.008; // slight positive edge
    const closePrice = roundTo(openPrice * (1 + move), s.digits);
    const dir = side === "buy" ? 1 : -1;
    let profit = (closePrice - openPrice) * dir * volume * contractSize(s.symbol);
    if (s.symbol === "USDJPY") profit /= closePrice;
    const nights = Math.floor((closeTime - openTime) / 86_400_000);
    deals.push({
      ticket: 70_000_000 + (login % 100_000) * 100 + i,
      login,
      symbol: s.symbol,
      side,
      volume,
      openPrice,
      openTime: new Date(openTime).toISOString(),
      closePrice,
      closeTime: new Date(closeTime).toISOString(),
      sl: r.chance(0.6) ? roundTo(openPrice * (1 - dir * 0.006), s.digits) : null,
      tp: r.chance(0.5) ? roundTo(openPrice * (1 + dir * 0.01), s.digits) : null,
      swap: round2(-nights * volume * 2.1),
      commission: commissionPerLot ? round2(-commissionPerLot * volume * 2) : 0,
      profit: round2(profit),
      digits: s.digits,
    });
  }
  return deals.sort((a, b) => b.closeTime.localeCompare(a.closeTime));
}

export const dealNet = (d: Pick<Deal, "profit" | "swap" | "commission">) =>
  round2(d.profit + d.swap + d.commission);
