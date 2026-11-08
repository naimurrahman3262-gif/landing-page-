/**
 * Contract specs used by the native calculators (brief §6.6). These are common
 * MT5 defaults and must be checked against WinproFX's real symbol specs (open
 * question): contract size, pip size and digits differ between brokers.
 */
export interface Instrument {
  symbol: string;
  market: "fx" | "metals" | "crypto";
  base: string;
  quote: string;
  /** Units per 1.00 lot. */
  contractSize: number;
  /** Price change that counts as one pip. */
  pipSize: number;
  digits: number;
}

const fx = (symbol: string, digits = 5): Instrument => ({
  symbol,
  market: "fx",
  base: symbol.slice(0, 3),
  quote: symbol.slice(3),
  contractSize: 100_000,
  pipSize: symbol.endsWith("JPY") ? 0.01 : 0.0001,
  digits: symbol.endsWith("JPY") ? 3 : digits,
});

export const INSTRUMENTS: Instrument[] = [
  fx("EURUSD"),
  fx("GBPUSD"),
  fx("USDJPY"),
  fx("AUDUSD"),
  fx("USDCAD"),
  fx("USDCHF"),
  fx("EURGBP"),
  fx("EURJPY"),
  {
    symbol: "XAUUSD",
    market: "metals",
    base: "XAU",
    quote: "USD",
    contractSize: 100,
    pipSize: 0.1,
    digits: 2,
  },
  {
    symbol: "XAGUSD",
    market: "metals",
    base: "XAG",
    quote: "USD",
    contractSize: 5_000,
    pipSize: 0.01,
    digits: 3,
  },
  { symbol: "BTCUSD", market: "crypto", base: "BTC", quote: "USD", contractSize: 1, pipSize: 1, digits: 2 },
];

export const instrument = (symbol: string) => INSTRUMENTS.find((i) => i.symbol === symbol);
