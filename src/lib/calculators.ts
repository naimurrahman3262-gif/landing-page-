import { z } from "zod";
import type { Instrument } from "@/config/instruments";

/**
 * Trading calculators (brief §6.6). Pure functions; results are in USD (the
 * account currency). `quoteToUsd` converts one unit of the quote currency to USD.
 */

/** Rate that converts 1 unit of `quote` into USD, from mid prices keyed by symbol. */
export function quoteToUsd(quote: string, mids: Record<string, number>): number | null {
  if (quote === "USD") return 1;
  const direct = mids[`${quote}USD`];
  if (direct) return direct;
  const inverse = mids[`USD${quote}`];
  if (inverse) return 1 / inverse;
  return null;
}

export function pipValue(inst: Instrument, lots: number, toUsd: number): number {
  return lots * inst.contractSize * inst.pipSize * toUsd;
}

export function requiredMargin(
  inst: Instrument,
  lots: number,
  price: number,
  leverage: number,
  toUsd: number,
): number {
  return (lots * inst.contractSize * price * toUsd) / leverage;
}

export function profitLoss(
  inst: Instrument,
  side: "buy" | "sell",
  lots: number,
  open: number,
  close: number,
  toUsd: number,
): { amount: number; pips: number } {
  const move = (close - open) * (side === "buy" ? 1 : -1);
  return { amount: move * lots * inst.contractSize * toUsd, pips: move / inst.pipSize };
}

/** Largest position (rounded down to 0.01 lot) that risks at most `riskPercent` of `balance`. */
export function positionSize(
  inst: Instrument,
  balance: number,
  riskPercent: number,
  stopPips: number,
  toUsd: number,
): { lots: number; risk: number } {
  const risk = (balance * riskPercent) / 100;
  const perLot = stopPips * pipValue(inst, 1, toUsd);
  const lots = perLot > 0 ? Math.floor((risk / perLot) * 100 + 1e-9) / 100 : 0;
  return { lots, risk };
}

/* Inputs, validated with the same messages everywhere (keys in `validation`). */
const positive = z.coerce.number({ message: "numberRequired" }).positive("numberPositive");
const lots = z.coerce.number({ message: "numberRequired" }).min(0.01, "lotsMin").max(100, "lotsMax");

export const PositionSizeInput = z.object({
  balance: positive,
  riskPercent: z.coerce.number({ message: "numberRequired" }).gt(0, "numberPositive").max(100, "riskMax"),
  stopPips: positive,
});
export const PipValueInput = z.object({ lots });
export const MarginInput = z.object({ lots, price: positive, leverage: z.coerce.number().int().positive() });
export const ProfitInput = z.object({ lots, open: positive, close: positive, side: z.enum(["buy", "sell"]) });
