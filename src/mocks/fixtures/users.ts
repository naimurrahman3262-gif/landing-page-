import type { Notification, User } from "@/lib/api/schemas";

/**
 * Mock personas (brief §8: KYC-approved user + an unverified user).
 * Sign in with either email and DEMO_PASSWORD. Every one-time code is DEMO_CODE.
 */
export const DEMO_PASSWORD = "Winpro#2026";
export const DEMO_CODE = "123456";

export const PERSONAS = {
  verified: "verified@winprofx.test",
  new: "new@winprofx.test",
} as const;

export interface MockUser extends User {
  password: string;
}

export function seedUsers(): MockUser[] {
  return [
    {
      id: "u_1001",
      firstName: "Rahim",
      lastName: "Chowdhury",
      email: PERSONAS.verified,
      password: DEMO_PASSWORD,
      emailVerified: true,
      country: "BD",
      kycStatus: "verified",
      twoFactorEnabled: true,
      partnerCode: "WPX-48213",
      timeZone: "Asia/Dhaka",
      locale: "en",
      createdAt: "2025-03-14T09:12:00Z",
    },
    {
      id: "u_1002",
      firstName: "Ananya",
      lastName: "Iyer",
      email: PERSONAS.new,
      password: DEMO_PASSWORD,
      emailVerified: false,
      country: "IN",
      kycStatus: "unverified",
      twoFactorEnabled: false,
      partnerCode: null,
      timeZone: "Asia/Kolkata",
      locale: "en",
      createdAt: "2026-11-06T15:40:00Z",
    },
  ];
}

/** Notifications for the verified persona, relative to "now" so they always look fresh. */
export function seedNotifications(now = Date.now()): Notification[] {
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  return [
    {
      id: "n_1",
      kind: "withdrawal",
      title: "Withdrawal rejected",
      body: "$1.00 to USDT (TRC20) was rejected: the amount is below the $10.00 minimum.",
      href: "/funds/transactions",
      createdAt: ago(12),
      read: false,
    },
    {
      id: "n_2",
      kind: "deposit",
      title: "Deposit completed",
      body: "$250.00 via USDT (TRC20) was added to your wallet.",
      href: "/funds/transactions",
      createdAt: ago(95),
      read: false,
    },
    {
      id: "n_3",
      kind: "ticket",
      title: "Support replied to your ticket",
      body: "Ticket #48120: Leverage change on MT5 · 137481",
      href: "/help/tickets",
      createdAt: ago(60 * 26),
      read: true,
    },
    {
      id: "n_4",
      kind: "kyc",
      title: "Proof of address expires soon",
      body: "Upload a new document before 30 Nov 2026 to keep withdrawals open.",
      href: "/account/verification",
      createdAt: ago(60 * 24 * 3),
      read: true,
    },
  ];
}
