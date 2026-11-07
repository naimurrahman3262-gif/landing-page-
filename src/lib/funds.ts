import type { Account, Destination, Method } from "@/lib/api/schemas";
import { accountName, sortAccounts, toUsd, withdrawable } from "@/lib/accounts";

export type PickerMode = "deposit" | "withdraw" | "transferFrom" | "transferTo";

export interface FundOption {
  value: Destination;
  name: string;
  /** Account type key ("standard"…) or "wallet". */
  kind: string;
  /** USD figure shown on the row: available (out) or balance (in). */
  amountUsd: number;
  /** Native currency/amount for cent accounts ("95,000 USC"). */
  currency: string;
  native: number;
  disabledReason: "zero" | "status" | null;
  status: Account["status"] | null;
}

/**
 * Build picker rows (brief §6.5): Wallet first, then live accounts by equity.
 * Outgoing modes show what can actually leave (free margin excl. credit,
 * capped at balance) and disable $0 sources with a reason.
 */
export function fundOptions(
  mode: PickerMode,
  wallet: number,
  accounts: Account[],
  exclude?: Destination | null,
): FundOption[] {
  const outgoing = mode === "withdraw" || mode === "transferFrom";
  const live = sortAccounts(
    accounts.filter((a) => a.kind === "live" && !a.archived),
    "equityDesc",
  );
  const rows: FundOption[] = [
    {
      value: "wallet",
      name: "wallet",
      kind: "wallet",
      amountUsd: wallet,
      currency: "USD",
      native: wallet,
      disabledReason: outgoing && wallet <= 0 ? "zero" : null,
      status: null,
    },
    ...live.map((a): FundOption => {
      const native = outgoing ? withdrawable(a) : a.balance;
      const blocked = a.status === "disabled" || (!outgoing && a.status === "readOnly");
      return {
        value: String(a.login),
        name: accountName(a),
        kind: a.type,
        amountUsd: toUsd(native, a.currency),
        currency: a.currency,
        native,
        disabledReason: blocked ? "status" : outgoing && native <= 0 ? "zero" : null,
        status: a.status,
      };
    }),
  ];
  return rows.filter((r) => r.value !== exclude);
}

/** Client-side estimate (the review step uses the server quote). */
export function estimate(method: Pick<Method, "feeFixed" | "feePct" | "rate">, amount: number) {
  const fee = Math.round((method.feeFixed + (amount * method.feePct) / 100) * 100) / 100;
  return {
    fee,
    net: Math.round((amount - fee) * 100) / 100,
    local: Math.round(amount * method.rate * 100) / 100,
  };
}

/** Parse a typed amount: digits with up to 2 decimals. Returns null if invalid/empty. */
export function parseAmount(raw: string): number | null {
  const clean = raw.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const n = Number(clean);
  return n > 0 ? n : null;
}

export type AmountProblem =
  | { kind: "invalid" }
  | { kind: "belowMin"; min: number }
  | { kind: "aboveMax"; max: number }
  | { kind: "aboveAvailable"; available: number };

export function checkAmount(
  raw: string,
  limits: { min?: number; max?: number; available?: number },
): AmountProblem | null {
  if (!raw.trim()) return null;
  const n = parseAmount(raw);
  if (n === null) return { kind: "invalid" };
  if (limits.min !== undefined && n < limits.min) return { kind: "belowMin", min: limits.min };
  if (limits.available !== undefined && n > limits.available)
    return { kind: "aboveAvailable", available: limits.available };
  if (limits.max !== undefined && n > limits.max) return { kind: "aboveMax", max: limits.max };
  return null;
}

/** Monogram for a method without a logo (never an empty box, G16). */
export function monogram(name: string): string {
  const words = name.replace(/[()·]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0]![0]! + words[1]![0]! : name.slice(0, 2)).toUpperCase();
}
