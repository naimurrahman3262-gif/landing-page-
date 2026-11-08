import type {
  Account,
  Deal,
  Handoff,
  KycDocument,
  Notification,
  PayoutMethod,
  PendingOrder,
  Position,
  Preferences,
  SecurityOverview,
  Ticket,
  Transaction,
} from "@/lib/api/schemas";
import { seedTickets } from "./fixtures/help";
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
  accountData: Map<string, AccountData>;
}

/** Profile extras, KYC, security, preferences and tickets for one user. */
export interface AccountData {
  phone: string | null;
  dateOfBirth: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  postcode: string | null;
  kyc: KycDocument[];
  security: Omit<SecurityOverview, "twoFactorEnabled">;
  pendingTotpSecret: string | null;
  preferences: Preferences;
  tickets: Ticket[];
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
    accountData: new Map(),
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
export function isVerifiedPersona(userId: string): boolean {
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

/** Lazily seeded account data. Verified persona (and clones) get the full set. */
export function accountData(userId: string): AccountData {
  const store = db().accountData;
  let a = store.get(userId);
  if (a) return a;
  const now = Date.now();
  const ago = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const user = db().users.get(userId);
  const verified = isVerifiedPersona(userId);
  const prefs: Preferences = {
    locale: "en",
    theme: "dark",
    timeZone: user?.timeZone ?? "UTC",
    sound: false,
    notifications: {
      email: { funds: true, security: true, support: true, marketing: false },
      push: { funds: true, security: true, support: true, marketing: false },
    },
  };
  a = verified
    ? {
        phone: "+8801711234567",
        dateOfBirth: "1990-04-12",
        state: "Dhaka",
        city: "Dhaka",
        address: "House 12, Road 7, Dhanmondi",
        postcode: "1209",
        kyc: [
          {
            type: "poiFront",
            status: "verified",
            fileName: "nid-front.jpg",
            uploadedAt: "2025-03-21T10:00:00Z",
            expiresAt: "2031-02-28T00:00:00Z",
            rejectionReason: null,
          },
          {
            type: "poiBack",
            status: "verified",
            fileName: "nid-back.jpg",
            uploadedAt: "2025-03-21T10:01:00Z",
            expiresAt: "2031-02-28T00:00:00Z",
            rejectionReason: null,
          },
          {
            type: "poa",
            status: "verified",
            fileName: "utility-bill.pdf",
            uploadedAt: "2025-03-21T10:03:00Z",
            expiresAt: "2026-11-30T00:00:00Z",
            rejectionReason: null,
          },
          {
            type: "selfie",
            status: "verified",
            fileName: "selfie.jpg",
            uploadedAt: "2025-03-21T10:05:00Z",
            expiresAt: null,
            rejectionReason: null,
          },
        ],
        security: {
          backupCodesRemaining: 8,
          passwordChangedAt: "2026-06-02T08:00:00Z",
          sessions: [
            {
              id: "s_current",
              device: "Chrome on Windows",
              location: "Dhaka, Bangladesh",
              ip: "103.•••.•••.24",
              lastActiveAt: ago(0),
              current: true,
            },
            {
              id: "s_phone",
              device: "WinproFX app on iPhone",
              location: "Dhaka, Bangladesh",
              ip: "103.•••.•••.88",
              lastActiveAt: ago(5),
              current: false,
            },
            {
              id: "s_old",
              device: "Safari on macOS",
              location: "Chattogram, Bangladesh",
              ip: "27.•••.•••.140",
              lastActiveAt: ago(24 * 9),
              current: false,
            },
          ],
          loginHistory: [
            { at: ago(0), device: "Chrome on Windows", location: "Dhaka, Bangladesh", result: "success" },
            {
              at: ago(5),
              device: "WinproFX app on iPhone",
              location: "Dhaka, Bangladesh",
              result: "success",
            },
            {
              at: ago(30),
              device: "Chrome on Windows",
              location: "Dhaka, Bangladesh",
              result: "twoFactorFailed",
            },
            { at: ago(31), device: "Chrome on Windows", location: "Dhaka, Bangladesh", result: "failed" },
            {
              at: ago(24 * 9),
              device: "Safari on macOS",
              location: "Chattogram, Bangladesh",
              result: "success",
            },
          ],
        },
        pendingTotpSecret: null,
        preferences: prefs,
        tickets: seedTickets(now),
      }
    : {
        phone: null,
        dateOfBirth: null,
        state: null,
        city: null,
        address: null,
        postcode: null,
        kyc: (["poiFront", "poiBack", "poa", "selfie"] as const).map((type) => ({
          type,
          status: "missing" as const,
          fileName: null,
          uploadedAt: null,
          expiresAt: null,
          rejectionReason: null,
        })),
        security: {
          backupCodesRemaining: 0,
          passwordChangedAt: null,
          sessions: [
            {
              id: "s_current",
              device: "This browser",
              location: "—",
              ip: "•••",
              lastActiveAt: ago(0),
              current: true,
            },
          ],
          loginHistory: [{ at: ago(0), device: "This browser", location: "—", result: "success" }],
        },
        pendingTotpSecret: null,
        preferences: prefs,
        tickets: [],
      };
  store.set(userId, a);
  return a;
}
