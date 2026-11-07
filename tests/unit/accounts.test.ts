import { describe, expect, it } from "vitest";
import {
  accountActions,
  accountName,
  filterAccounts,
  firstOpenAccountStep,
  sortAccounts,
  withdrawable,
} from "@/lib/accounts";
import type { Account } from "@/lib/api/schemas";
import { ACCOUNT_TYPES, seedAccounts, seedPositions } from "@/mocks/fixtures/accounts";

const accounts = seedAccounts(seedPositions(Date.parse("2026-11-07T12:00:00Z")));
const byLogin = (login: number) => accounts.find((a) => a.login === login)!;

describe("account helpers", () => {
  it("uses the label, else the one account ID format", () => {
    expect(accountName(byLogin(137481))).toBe("Main");
    expect(accountName(byLogin(137502))).toBe("MT5 · 137502");
  });

  it("withdrawable = min(free margin − credit, balance): no bonus credit, no unrealised profit", () => {
    // Main: free margin 76,078.19 − credit 48.34 = 76,029.85 > balance 75,919.70 → balance.
    expect(withdrawable(byLogin(137481))).toBe(75919.7);
    expect(withdrawable({ freeMargin: 900, credit: 100, balance: 2000 })).toBe(800); // margin in use
    expect(withdrawable({ freeMargin: -50, credit: 0, balance: 0 })).toBe(0);
  });

  it("disables money actions with a reason", () => {
    expect(accountActions(byLogin(137502)).withdraw).toEqual({ enabled: false, reason: "zero" });
    expect(accountActions(byLogin(137589)).deposit).toEqual({ enabled: false, reason: "status" }); // disabled
    expect(accountActions(byLogin(137547)).trade).toEqual({ enabled: false, reason: "status" }); // read-only campaign
    expect(accountActions(byLogin(137547)).withdraw).toEqual({ enabled: true });
  });

  it("sorts by USD equity (cent accounts converted) and filters by tab/search/type", () => {
    const live = filterAccounts(accounts, { tab: "live", query: "", type: "all" });
    expect(live).toHaveLength(11);
    expect(
      sortAccounts(live, "equityDesc")
        .map((a) => a.login)
        .slice(0, 4),
    ).toEqual([137481, 137518, 137533, 137547]);
    expect(
      filterAccounts(accounts, { tab: "live", query: "scalp", type: "all" }).map((a) => a.login),
    ).toEqual([137518]);
    expect(filterAccounts(accounts, { tab: "live", query: "137", type: "pro" }).map((a) => a.login)).toEqual([
      137518, 137589, 137625,
    ]);
    expect(filterAccounts(accounts, { tab: "demo", query: "", type: "all" })).toHaveLength(2);
    expect(filterAccounts(accounts, { tab: "archived", query: "", type: "all" })).toHaveLength(1);
  });

  it("skips type selection when only one account type exists", () => {
    expect(firstOpenAccountStep(ACCOUNT_TYPES)).toBe("type");
    expect(firstOpenAccountStep(ACCOUNT_TYPES.slice(0, 1))).toBe("config");
  });

  it("main account equity = balance + credit + floating P/L", () => {
    const main: Account = byLogin(137481);
    expect(main.equity).toBe(76183.84);
    expect(main.marginLevel).toBeCloseTo((76183.84 / 105.65) * 100, 1);
  });
});
