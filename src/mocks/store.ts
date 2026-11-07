import type { Notification } from "@/lib/api/schemas";
import { seedNotifications, seedUsers, type MockUser } from "./fixtures/users";

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
