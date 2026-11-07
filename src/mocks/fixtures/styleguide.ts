/**
 * Sample values for the /dev/components style guide only. Never imported by
 * product routes. Figures mirror the brief's fixture edge cases.
 */
export const STYLEGUIDE = {
  syncedAt: "2026-11-07T08:32:00Z",
  equity: 76183.84,
  balance: 75919.7,
  openPnl: 215.8,
  wallet: 1009,
  centBalance: 95000,
  moneyIn: 250,
  moneyOut: -1240,
  rejectedDeposit: 1.04,
  negativeBalance: -159203.22,
  equityDelta: 2.4,
  pnlDelta: -0.85,
  login: 137481,
  leverage: 500,
  referralLink: "https://my.winprofx.com/register?ref=WPX-48213",
  leverageOptions: [50, 100, 200, 500, 1000],
  countries: ["Bangladesh", "India", "Vietnam", "United Arab Emirates"],
  longTerms: Array.from({ length: 12 }, (_, i) => `Clause ${i + 1}`),
} as const;
