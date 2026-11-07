import type { Account, AccountType, PendingOrder, Position } from "@/lib/api/schemas";
import { round2 } from "./random";

export const SERVER_LIVE = "WinproFX-Live";
export const SERVER_DEMO = "WinproFX-Demo";

/**
 * Account types. `minDeposit` is the single source for both "Open account"
 * and the Deposit page (brief §6.3: the minimum must match).
 */
export const ACCOUNT_TYPES: AccountType[] = [
  {
    id: "standard",
    name: "Standard",
    minDeposit: 50,
    spreadFrom: 1.2,
    commissionPerLot: null,
    maxLeverage: 1000,
    leverageOptions: [50, 100, 200, 300, 500, 1000],
    currencies: ["USD"],
    demoBalances: [1000, 10000, 50000, 100000],
  },
  {
    id: "pro",
    name: "Pro",
    minDeposit: 500,
    spreadFrom: 0.1,
    commissionPerLot: 3.5,
    maxLeverage: 500,
    leverageOptions: [50, 100, 200, 300, 500],
    currencies: ["USD"],
    demoBalances: [10000, 50000, 100000],
  },
  {
    id: "cent",
    name: "Cent",
    minDeposit: 10,
    spreadFrom: 1.5,
    commissionPerLot: null,
    maxLeverage: 1000,
    leverageOptions: [100, 200, 500, 1000],
    currencies: ["USC"],
    demoBalances: [100000, 1000000],
  },
];

/** The one open trade (brief §8): XAUUSD buy, +$215.80. */
export const MAIN_POSITION: Position = {
  ticket: 88412037,
  login: 137481,
  symbol: "XAUUSD",
  side: "buy",
  volume: 0.2,
  openPrice: 2641.36,
  openTime: "",
  currentPrice: 2652.15,
  sl: 2610,
  tp: 2690,
  swap: 0,
  commission: 0,
  // (2652.15 − 2641.36) × 0.20 lots × 100 oz = 215.80
  profit: 215.8,
  digits: 2,
};

export function seedPositions(now: number): Position[] {
  return [{ ...MAIN_POSITION, openTime: new Date(now - 2 * 86_400_000 - 3 * 3_600_000).toISOString() }];
}

export function seedPendingOrders(now: number): PendingOrder[] {
  return [
    {
      ticket: 88412110,
      login: 137481,
      symbol: "EURUSD",
      type: "buyLimit",
      volume: 0.5,
      price: 1.0782,
      currentPrice: 1.08311,
      sl: 1.0741,
      tp: null,
      createdAt: new Date(now - 5 * 3_600_000).toISOString(),
      digits: 5,
    },
    {
      ticket: 88412115,
      login: 137481,
      symbol: "GBPUSD",
      type: "sellStop",
      volume: 0.3,
      price: 1.2655,
      currentPrice: 1.27042,
      sl: 1.2705,
      tp: 1.256,
      createdAt: new Date(now - 26 * 3_600_000).toISOString(),
      digits: 5,
    },
  ];
}

function account(
  partial: Partial<Account> & Pick<Account, "login" | "type">,
  positions: Position[],
): Account {
  const base: Account = {
    label: null,
    kind: "live",
    status: "active",
    archived: false,
    currency: partial.type === "cent" ? "USC" : "USD",
    balance: 0,
    credit: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    marginLevel: null,
    leverage: 500,
    server: SERVER_LIVE,
    openPositions: 0,
    createdAt: "2025-04-02T10:00:00Z",
    campaign: null,
    ...partial,
  };
  return withMargin(base, positions);
}

/** Recompute equity/margin from balance, credit and open positions (MT5 rules). */
export function withMargin(acc: Account, positions: Position[]): Account {
  const own = positions.filter((p) => p.login === acc.login);
  const floating = round2(own.reduce((s, p) => s + p.profit + p.swap, 0));
  const margin = round2(
    own.reduce((s, p) => s + (p.volume * contractSize(p.symbol) * p.openPrice) / acc.leverage, 0),
  );
  const equity = round2(acc.balance + acc.credit + floating);
  return {
    ...acc,
    equity,
    margin,
    freeMargin: round2(equity - margin),
    marginLevel: margin > 0 ? round2((equity / margin) * 100) : null,
    openPositions: own.length,
  };
}

export function contractSize(symbol: string): number {
  if (symbol === "XAUUSD") return 100;
  if (symbol === "US30") return 1;
  return 100_000;
}

/** Verified persona: 11 live accounts (incl. cent + ended campaign), 2 demo, 1 archived. */
export function seedAccounts(positions: Position[]): Account[] {
  return [
    account(
      {
        login: 137481,
        type: "standard",
        label: "Main",
        balance: 75919.7,
        credit: 48.34,
        createdAt: "2025-03-20T08:15:00Z",
      },
      positions,
    ),
    account({ login: 137502, type: "standard", createdAt: "2025-04-11T12:00:00Z" }, positions),
    account(
      {
        login: 137518,
        type: "pro",
        label: "Scalping",
        balance: 1240.5,
        leverage: 200,
        createdAt: "2025-05-03T09:30:00Z",
      },
      positions,
    ),
    account(
      {
        login: 137533,
        type: "cent",
        label: "Cent practice",
        balance: 95000,
        leverage: 1000,
        createdAt: "2025-06-14T15:10:00Z",
      },
      positions,
    ),
    account(
      {
        login: 137547,
        type: "standard",
        label: "Diwali bonus",
        status: "readOnly",
        balance: 52,
        // 23:59:59 on 24 Oct in the persona's zone (Asia/Dhaka, GMT+6).
        campaign: { name: "Diwali trading contest", endedAt: "2026-10-24T17:59:59Z" },
        createdAt: "2026-10-01T06:00:00Z",
      },
      positions,
    ),
    account({ login: 137560, type: "standard", createdAt: "2025-07-01T10:00:00Z" }, positions),
    account(
      { login: 137574, type: "standard", status: "inactive", createdAt: "2025-07-19T10:00:00Z" },
      positions,
    ),
    account(
      { login: 137589, type: "pro", status: "disabled", leverage: 100, createdAt: "2025-08-05T10:00:00Z" },
      positions,
    ),
    account({ login: 137603, type: "standard", leverage: 200, createdAt: "2025-09-12T10:00:00Z" }, positions),
    account(
      { login: 137617, type: "standard", status: "inactive", createdAt: "2025-11-30T10:00:00Z" },
      positions,
    ),
    account({ login: 137625, type: "pro", leverage: 300, createdAt: "2026-02-08T10:00:00Z" }, positions),
    account(
      {
        login: 2001845,
        kind: "demo",
        type: "standard",
        label: "Strategy test",
        balance: 10000,
        server: SERVER_DEMO,
        createdAt: "2026-01-10T10:00:00Z",
      },
      positions,
    ),
    account(
      {
        login: 2001846,
        kind: "demo",
        type: "pro",
        balance: 100000,
        leverage: 200,
        server: SERVER_DEMO,
        createdAt: "2026-03-22T10:00:00Z",
      },
      positions,
    ),
    account(
      {
        login: 136990,
        type: "standard",
        archived: true,
        status: "inactive",
        createdAt: "2024-11-05T10:00:00Z",
      },
      positions,
    ),
  ];
}

export const WALLET_BALANCE = 1009;

/** Convert an account amount to USD (cent accounts are in cents). */
export function toUsd(amount: number, currency: string): number {
  return currency === "USC" ? amount / 100 : amount;
}
