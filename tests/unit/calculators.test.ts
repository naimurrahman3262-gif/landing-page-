import { describe, expect, it } from "vitest";
import { instrument } from "@/config/instruments";
import { pipValue, positionSize, profitLoss, quoteToUsd, requiredMargin } from "@/lib/calculators";

const EURUSD = instrument("EURUSD")!;
const USDJPY = instrument("USDJPY")!;
const EURGBP = instrument("EURGBP")!;
const XAUUSD = instrument("XAUUSD")!;

describe("calculators", () => {
  it("converts the quote currency to USD", () => {
    const mids = { GBPUSD: 1.25, USDJPY: 150 };
    expect(quoteToUsd("USD", mids)).toBe(1);
    expect(quoteToUsd("GBP", mids)).toBe(1.25);
    expect(quoteToUsd("JPY", mids)).toBeCloseTo(1 / 150);
    expect(quoteToUsd("CHF", mids)).toBeNull();
  });

  it("pip value: $10 per lot on EURUSD, ~$6.67 on USDJPY at 150, £-converted on EURGBP", () => {
    expect(pipValue(EURUSD, 1, 1)).toBeCloseTo(10);
    expect(pipValue(USDJPY, 1, 1 / 150)).toBeCloseTo(6.6667, 3);
    expect(pipValue(EURGBP, 0.5, 1.25)).toBeCloseTo(6.25);
    expect(pipValue(XAUUSD, 1, 1)).toBeCloseTo(10);
  });

  it("margin = notional in USD / leverage", () => {
    expect(requiredMargin(EURUSD, 1, 1.1, 100, 1)).toBeCloseTo(1100);
    expect(requiredMargin(USDJPY, 1, 150, 500, 1 / 150)).toBeCloseTo(200);
    expect(requiredMargin(XAUUSD, 0.1, 2000, 200, 1)).toBeCloseTo(100);
  });

  it("profit/loss follows the side", () => {
    expect(profitLoss(EURUSD, "buy", 1, 1.1, 1.105, 1)).toEqual({
      amount: expect.closeTo(500),
      pips: expect.closeTo(50),
    });
    expect(profitLoss(EURUSD, "sell", 1, 1.1, 1.105, 1).amount).toBeCloseTo(-500);
  });

  it("position size rounds down so the risk is never exceeded", () => {
    // $10,000 × 1% = $100 over 20 pips at $10/pip/lot → 0.5 lots
    expect(positionSize(EURUSD, 10_000, 1, 20, 1)).toEqual({ lots: 0.5, risk: 100 });
    // $1,000 × 2% = $20 over 30 pips → 0.0666 → 0.06
    expect(positionSize(EURUSD, 1_000, 2, 30, 1).lots).toBe(0.06);
  });
});
