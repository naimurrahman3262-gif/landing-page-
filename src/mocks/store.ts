import type {
  Account,
  Deal,
  Handoff,
  Notification,
  PayoutMethod,
  PendingOrder,
  Position,
  Transaction,
} from "@/lib/api/schemas";
import { seedPayoutMethods } from "./fixtures/methods";
import { WALLET_BALANCE, seedAccounts, seedPendingOrders, seedPositions } from "./fixtures/accounts";
import { seedDeals } from "./fixtures/deals";
import { seedTransactions } from "./fixtures/transactions";
import { seedNotifications, seedUsers, type MockUser } from "./fixtures/users";

/** Everything financial for one user. Created on first access. */
export interface Portfolio {
  accounts: Account[];
  wallet: number;
  positions: Position[];
  orders: PendingOrder[];
  deals: Map<number, Deal[]>;
  transactions: Transaction[];
  profileComplete: boolean;
  platformDownloaded: boolean;
  syncedAt: string;
  payouts: PayoutMethod[];
  /** Extra detail for transactions created in this session (handoff, rate, masked destination). */
  details: Map<string, FundsDetail>;
}

export interface FundsDetail {
  handoff: Handoff | null;
  destinationMasked: string | null;
  rate: number | null;
  localAmount: number | null;
  localCurrency: string | null;
  /** Deposits move pending → processing → approved over time (mock settlement). */
  settle?: { processingAt: number; doneAt: number; outcome: "approved" | "failed" };
}

/**
 * In-memory mock backend state. Kept on globalThis so it survives dev hot
 * reloads and is shared by every module instance in the server process.
 */
interface MockDb {
  users: Map<string, MockUser>;
  /** session token → { userId, mfaPending } */
  sessions: Map<string, { userId: string; mfaPending: boolean }>;
  /** flow id → { email, purpose } for password reset / email-code sign-in */
  flows: Map<string, { email: string; purpose: "reset" | "email-code" }>;
  /** QR sign-in tokens → approval state */
  qr: Map<string, { createdAt: number; approved: boolean }>;
  notifications: Map<string, Notification[]>;
  portfolios: Map<string, Portfolio>;
  /** step-up token → { userId, expiresAt } */
  stepUp: Map<string, { userId: string; expiresAt: number }>;
}

const g = globalThis as unknown as { __wpxMockDb?: MockDb };

function seed(): MockDb {
  const users = new Map(seedUsers().map((u) => [u.id, u]));
  return {
    users,
    sessions: new Map(),
    flows: new Map(),
    qr: new Map(),
    notifications: new Map([["u_1001", seedNotifications()]]),
    portfolios: new Map(),
    stepUp: new Map(),
  };
}

export function db(): MockDb {
  g.__wpxMockDb ??= seed();
  return g.__wpxMockDb;
}

export function resetDb(): void {
  g.__wpxMockDb = seed();
}

export function findUserByEmail(email: string): MockUser | undefined {
  const needle = email.trim().toLowerCase();
  return [...db().users.values()].find((u) => u.email.toLowerCase() === needle);
}

export function publicUser({ password: _password, ...user }: MockUser) {
  return user;
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** The verified persona gets the full fixture set; everyone else starts empty (first-time state). */
export function portfolio(userId: string): Portfolio {
  const store = db().portfolios;
  let p = store.get(userId);
  if (!p) {
    const now = Date.now();
    if (isVerifiedPersona(userId)) {
      const positions = seedPositions(now);
      p = {
        accounts: seedAccounts(positions),
        wallet: WALLET_BALANCE,
        positions,
        orders: seedPendingOrders(now),
        deals: new Map([
          [137481, seedDeals(137481, now)],
          [137518, seedDeals(137518, now, 24, 3.5)],
        ]),
        transactions: seedTransactions(now),
        profileComplete: true,
        platformDownloaded: true,
        syncedAt: new Date(now).toISOString(),
        payouts: seedPayoutMethods(),
        details: new Map(),
      };
    } else {
      p = {
        accounts: [],
        wallet: 0,
        positions: [],
        orders: [],
        deals: new Map(),
        transactions: [],
        profileComplete: false,
        platformDownloaded: false,
        syncedAt: new Date(now).toISOString(),
        payouts: [],
        details: new Map(),
      };
    }
    store.set(userId, p);
  }
  // Prices "tick": the sync time is when the data was read from MT5.
  p.syncedAt = new Date().toISOString();
  return p;
}

/** The verified persona and its test clones get the full fixture set. */
function isVerifiedPersona(userId: string): boolean {
  return userId === "u_1001" || !!db().users.get(userId)?.email.startsWith("verified+");
}

/**
 * Test isolation: "verified+<anything>@winprofx.test" signs in as a private
 * clone of the verified persona with its own freshly seeded portfolio, so
 * parallel tests that move money can't change each other's figures.
 */
export function cloneVerifiedPersona(email: string): MockUser | undefined {
  if (!/^verified\+[\w.-]+@winprofx\.test$/i.test(email)) return undefined;
  const base = db().users.get("u_1001")!;
  const id = newId("u");
  const clone: MockUser = { ...base, id, email: email.toLowerCase() };
  db().users.set(id, clone);
  db().notifications.set(id, seedNotifications());
  return clone;
}
