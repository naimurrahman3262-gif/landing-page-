import type { AccountRef, Transaction } from "@/lib/api/schemas";
import { rng, round2 } from "./random";

/** Method names: identical wording for Deposit, Withdraw and history (brief §6.5). */
export const METHOD_NAMES = {
  usdtTrc20: "USDT (TRC20)",
  usdtBep20: "USDT (BEP20)",
  bankInr: "Bank transfer (INR)",
  upiPaygate: "UPI · PayGate",
  upiQuickpay: "UPI · QuickPay",
  vndPay: "VND Pay",
  bdtPay: "BDT Pay",
} as const;

const DEPOSIT_METHODS = Object.values(METHOD_NAMES);
const WITHDRAW_METHODS = [METHOD_NAMES.usdtTrc20, METHOD_NAMES.usdtBep20, METHOD_NAMES.bankInr];

export const REJECTION_REASONS = {
  belowMin: "Below the $10.00 minimum for USDT (TRC20) withdrawals.",
  nameMismatch: "The account name doesn't match your verified name.",
  notReceived: "Payment wasn't received within 30 minutes.",
  bankRejected: "The bank rejected the transfer: invalid IFSC code.",
  poaExpired: "Your proof of address has expired. Upload a new document and try again.",
};

const LOGINS = [137481, 137502, 137518, 137533, 137603, 137625];
const WALLET: AccountRef = { kind: "wallet" };

/**
 * 285 transactions over ~400 days with every status, rejections with reasons
 * and repeated $1 withdrawals (brief §8). The newest two match the seeded
 * notifications (a rejected $1 withdrawal and a $250 deposit).
 */
export function seedTransactions(now: number): Transaction[] {
  const r = rng(285);
  const list: Transaction[] = [];
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  let n = 0;

  function push(
    t: Omit<Transaction, "id" | "reference" | "updatedAt" | "currency"> & { updatedAt?: string },
  ) {
    n += 1;
    const prefix = t.type === "deposit" ? "DEP" : t.type === "withdrawal" ? "WDR" : "TRF";
    const d = new Date(t.createdAt);
    const ref = `${prefix}-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(40000 + n * 37).padStart(5, "0")}`;
    list.push({
      currency: "USD",
      updatedAt: t.createdAt,
      ...t,
      id: `tx_${String(n).padStart(4, "0")}`,
      reference: ref,
    });
  }

  // Newest first-class items (match notifications + alerts).
  push({
    type: "withdrawal",
    status: "rejected",
    amount: 1,
    fee: 0,
    method: METHOD_NAMES.usdtTrc20,
    account: WALLET,
    counterparty: null,
    reason: REJECTION_REASONS.belowMin,
    createdAt: ago(14),
    updatedAt: ago(12),
  });
  push({
    type: "deposit",
    status: "approved",
    amount: 250,
    fee: 0,
    method: METHOD_NAMES.usdtTrc20,
    account: WALLET,
    counterparty: null,
    reason: null,
    createdAt: ago(110),
    updatedAt: ago(95),
  });
  push({
    type: "deposit",
    status: "processing",
    amount: 500,
    fee: 0,
    method: METHOD_NAMES.upiPaygate,
    account: WALLET,
    counterparty: null,
    reason: null,
    createdAt: ago(40),
  });
  push({
    type: "withdrawal",
    status: "pending",
    amount: 120,
    fee: 1,
    method: METHOD_NAMES.usdtTrc20,
    account: WALLET,
    counterparty: null,
    reason: null,
    createdAt: ago(60 * 5),
  });

  // Repeated $1 withdrawals (old bug: no reason shown, users kept retrying).
  for (const [i, minutes] of [60 * 26, 60 * 27, 60 * 48, 60 * 49, 60 * 72].entries()) {
    push({
      type: "withdrawal",
      status: i === 4 ? "cancelled" : "rejected",
      amount: 1,
      fee: 0,
      method: METHOD_NAMES.usdtTrc20,
      account: WALLET,
      counterparty: null,
      reason: i === 4 ? null : REJECTION_REASONS.belowMin,
      createdAt: ago(minutes),
    });
  }

  // Bulk history: 276 more, spread over ~400 days.
  while (list.length < 285) {
    const minutesAgo = r.int(60 * 80, 60 * 24 * 400);
    const roll = r.next();
    const type = roll < 0.45 ? "deposit" : roll < 0.75 ? "withdrawal" : "transfer";
    const s = r.next();
    const status = s < 0.8 ? "approved" : s < 0.89 ? "rejected" : s < 0.94 ? "cancelled" : "failed";
    const login = r.pick(LOGINS);
    if (type === "deposit") {
      const method = r.pick(DEPOSIT_METHODS);
      const reason =
        status === "rejected"
          ? r.pick([REJECTION_REASONS.notReceived, REJECTION_REASONS.nameMismatch])
          : status === "failed"
            ? REJECTION_REASONS.notReceived
            : null;
      push({
        type,
        status,
        amount: r.pick([50, 100, 100, 250, 250, 500, 1000, 2500]),
        fee: 0,
        method,
        account: r.chance(0.7) ? WALLET : { kind: "mt5", login },
        counterparty: null,
        reason,
        createdAt: ago(minutesAgo),
      });
    } else if (type === "withdrawal") {
      const method = r.pick(WITHDRAW_METHODS);
      const reason =
        status === "rejected"
          ? method === METHOD_NAMES.bankInr
            ? REJECTION_REASONS.bankRejected
            : r.pick([REJECTION_REASONS.nameMismatch, REJECTION_REASONS.poaExpired])
          : status === "failed"
            ? REJECTION_REASONS.bankRejected
            : null;
      push({
        type,
        status,
        amount: r.pick([20, 50, 100, 150, 300, 800]),
        fee: round2(method === METHOD_NAMES.bankInr ? 0 : 1),
        method,
        account: WALLET,
        counterparty: null,
        reason,
        createdAt: ago(minutesAgo),
      });
    } else {
      // Transfers are instant: approved or (rarely) failed. 137481 only before its 90-day trading window.
      const toMt5 = r.chance(0.6);
      const transferLogin = login === 137481 && minutesAgo < 60 * 24 * 95 ? 137518 : login;
      const mt5: AccountRef = { kind: "mt5", login: transferLogin };
      const ok = status === "approved" || status === "rejected";
      push({
        type,
        status: ok ? "approved" : "failed",
        amount: r.pick([25, 50, 100, 200, 500]),
        fee: 0,
        method: null,
        account: toMt5 ? WALLET : mt5,
        counterparty: toMt5 ? mt5 : WALLET,
        reason: ok ? null : "The source account didn't have enough free margin at the time.",
        createdAt: ago(minutesAgo),
      });
    }
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
