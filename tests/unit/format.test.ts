import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MINUS,
  PLACEHOLDER,
  formatAccountId,
  formatCentEquivalent,
  formatDate,
  formatLeverage,
  formatMoney,
  formatNumber,
  formatPercent,
  maskTail,
} from "@/lib/format";

afterEach(() => vi.restoreAllMocks());

describe("formatMoney", () => {
  it("always shows 2 decimals and grouping", () => {
    expect(formatMoney(75919.7)).toBe("$75,919.70");
    expect(formatMoney(1009)).toBe("$1,009.00");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("puts the minus sign (U+2212) before the symbol", () => {
    expect(formatMoney(-1240)).toBe(`${MINUS}$1,240.00`);
    expect(formatMoney(-159203.22)).toBe(`${MINUS}$159,203.22`);
    expect(formatMoney(-159203.22)).not.toContain("$-");
  });

  it("shows direction with sign: always", () => {
    expect(formatMoney(50.9, "USD", { sign: "always" })).toBe("+$50.90");
    expect(formatMoney(-50.9, "USD", { sign: "always" })).toBe(`${MINUS}$50.90`);
    expect(formatMoney(0, "USD", { sign: "always" })).toBe("$0.00");
  });

  it("drops the sign with sign: never", () => {
    expect(formatMoney(-1240, "USD", { sign: "never" })).toBe("$1,240.00");
  });

  it("never renders a negative zero", () => {
    expect(formatMoney(-0)).toBe("$0.00");
    expect(formatMoney(-0.004)).toBe("$0.00");
    expect(formatMoney(-0.004, "USD", { sign: "always" })).toBe("$0.00");
  });

  it("rounds half away from zero at 2 decimals", () => {
    expect(formatMoney(1.005)).toBe("$1.01");
    expect(formatMoney(-2.675)).toBe(`${MINUS}$2.68`);
  });

  it("formats other currencies with narrow symbols", () => {
    expect(formatMoney(5000, "EUR")).toBe("€5,000.00");
    expect(formatMoney(4200, "INR", { decimals: 0 })).toBe("₹4,200");
    expect(formatMoney(5000, "BDT")).toBe("৳5,000.00");
  });

  it("formats cent accounts as USC with a USD equivalent", () => {
    expect(formatMoney(95000, "USD", { cents: true })).toBe("95,000 USC");
    expect(formatMoney(95000, "USC")).toBe("95,000 USC");
    expect(formatMoney(95000.5, "USC")).toBe("95,000.50 USC");
    expect(formatMoney(-1200, "USC")).toBe(`${MINUS}1,200 USC`);
    expect(formatCentEquivalent(95000)).toBe("≈ $950.00");
  });

  it("renders a placeholder (never NaN) for non-finite input and logs it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(formatMoney(Number.NaN)).toBe(PLACEHOLDER);
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe(PLACEHOLDER);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("formatNumber", () => {
  it("formats lots, prices and counts", () => {
    expect(formatNumber(0.01, 2)).toBe("0.01");
    expect(formatNumber(2387.456, 2)).toBe("2,387.46");
    expect(formatNumber(285)).toBe("285");
    expect(formatNumber(-3.5, 1)).toBe(`${MINUS}3.5`);
  });
});

describe("formatDate", () => {
  const iso = "2026-11-02T10:58:00Z";

  it("formats dates in the user's time zone", () => {
    expect(formatDate(iso, "date", { timeZone: "Asia/Dhaka" })).toBe("2 Nov 2026");
    expect(formatDate(iso, "datetime", { timeZone: "Asia/Dhaka" })).toBe("2 Nov 2026, 16:58 (GMT+6)");
    expect(formatDate(iso, "time", { timeZone: "Asia/Dhaka" })).toBe("16:58");
  });

  it("handles half-hour offsets and UTC", () => {
    expect(formatDate(iso, "datetime", { timeZone: "Asia/Kolkata" })).toBe("2 Nov 2026, 16:28 (GMT+5:30)");
    expect(formatDate(iso, "datetime", { timeZone: "UTC" })).toBe("2 Nov 2026, 10:58 (GMT+0)");
  });

  it("uses the local calendar day, not the UTC day (the old 'Today shows yesterday' bug)", () => {
    // 23:30 UTC on 1 Nov is already 2 Nov in Dhaka.
    expect(formatDate("2026-11-01T23:30:00Z", "date", { timeZone: "Asia/Dhaka" })).toBe("2 Nov 2026");
  });

  it("formats relative times", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    const tz = { now, timeZone: "UTC" };
    expect(formatDate("2026-11-07T11:59:40Z", "relative", tz)).toBe("just now");
    expect(formatDate("2026-11-07T11:55:00Z", "relative", tz)).toBe("5 minutes ago");
    expect(formatDate("2026-11-07T09:00:00Z", "relative", tz)).toBe("3 hours ago");
    expect(formatDate("2026-11-06T08:00:00Z", "relative", tz)).toBe("yesterday");
    expect(formatDate("2026-11-03T08:00:00Z", "relative", tz)).toBe("4 days ago");
    expect(formatDate("2026-10-20T08:00:00Z", "relative", tz)).toBe("20 Oct 2026");
  });

  it("renders a placeholder for invalid dates", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(formatDate("not-a-date", "date")).toBe(PLACEHOLDER);
  });
});

describe("formatAccountId / formatLeverage / formatPercent / maskTail", () => {
  it("uses one account ID format", () => {
    expect(formatAccountId(137481)).toBe("MT5 · 137481");
  });

  it("formats leverage", () => {
    expect(formatLeverage(500)).toBe("1:500");
    expect(formatLeverage(1000)).toBe("1:1000");
  });

  it("formats percentage points", () => {
    expect(formatPercent(12.5)).toBe("12.50%");
    expect(formatPercent(1543.2)).toBe("1,543.20%");
    expect(formatPercent(2.4, { sign: "always" })).toBe("+2.40%");
    expect(formatPercent(-2.4, { sign: "always" })).toBe(`${MINUS}2.40%`);
  });

  it("masks account numbers", () => {
    expect(maskTail("1234 5678 9012 5467")).toBe("•••• 5467");
  });
});
