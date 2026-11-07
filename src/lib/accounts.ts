import type { Account, AccountRef, AccountType } from "@/lib/api/schemas";
import { CENT_CURRENCY, formatAccountId } from "@/lib/format";

/** Label if set, otherwise the one account ID format ("MT5 · 137481"). */
export function accountName(a: Pick<Account, "label" | "login">): string {
  return a.label?.trim() || formatAccountId(a.login);
}

export function refName(ref: AccountRef, walletLabel: string, accounts?: Account[]): string {
  if (ref.kind === "wallet") return walletLabel;
  const found = accounts?.find((a) => a.login === ref.login);
  return found ? accountName(found) : formatAccountId(ref.login);
}

/** USD value of an account amount (cent accounts are in cents). */
export function toUsd(amount: number, currency: string): number {
  return currency === CENT_CURRENCY ? amount / 100 : amount;
}

export const isFunded = (a: Account) => a.equity > 0;

/** What can be withdrawn: free margin, never balance (brief §6.5). */
export const withdrawable = (a: Account) => Math.max(0, a.freeMargin);

export type ActionState = { enabled: true } | { enabled: false; reason: "status" | "zero" };

/** One place that decides which money actions an account allows, and why not. */
export function accountActions(a: Account): {
  trade: ActionState;
  deposit: ActionState;
  withdraw: ActionState;
} {
  const blocked = a.status === "disabled" || a.archived;
  return {
    trade: blocked || a.status === "readOnly" ? { enabled: false, reason: "status" } : { enabled: true },
    deposit: blocked || a.status === "readOnly" ? { enabled: false, reason: "status" } : { enabled: true },
    withdraw: blocked
      ? { enabled: false, reason: "status" }
      : withdrawable(a) <= 0
        ? { enabled: false, reason: "zero" }
        : { enabled: true },
  };
}

export type AccountSort = "equityDesc" | "equityAsc" | "newest" | "login";

export function sortAccounts(list: Account[], sort: AccountSort): Account[] {
  const usd = (a: Account) => toUsd(a.equity, a.currency);
  const copy = [...list];
  switch (sort) {
    case "equityAsc":
      return copy.sort((a, b) => usd(a) - usd(b) || a.login - b.login);
    case "newest":
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "login":
      return copy.sort((a, b) => a.login - b.login);
    default:
      return copy.sort((a, b) => usd(b) - usd(a) || a.login - b.login);
  }
}

export function filterAccounts(
  list: Account[],
  { tab, query, type }: { tab: "live" | "demo" | "archived"; query: string; type: string },
): Account[] {
  const q = query.trim().toLowerCase();
  return list.filter((a) => {
    if (tab === "archived" ? !a.archived : a.archived || a.kind !== tab) return false;
    if (type !== "all" && a.type !== type) return false;
    if (!q) return true;
    return String(a.login).includes(q) || (a.label ?? "").toLowerCase().includes(q);
  });
}

/** Open-account flow: skip the type step when only one type exists (brief §6.3). */
export function firstOpenAccountStep(types: AccountType[]): "type" | "config" {
  return types.length === 1 ? "config" : "type";
}
