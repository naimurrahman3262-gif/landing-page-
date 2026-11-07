import { describe, expect, it } from "vitest";
import { pageList } from "@/components/funds/transactions-view";
import { checkAmount, fundOptions, monogram, parseAmount } from "@/lib/funds";
import { seedAccounts, seedPositions } from "@/mocks/fixtures/accounts";
import { METHODS } from "@/mocks/fixtures/methods";
import { BACKEND_URL } from "@/mocks/utils";

const accounts = seedAccounts(seedPositions(Date.now()));

describe("fundOptions (pickers)", () => {
  it("lists the wallet first, then live accounts by equity; no demo or archived", () => {
    const rows = fundOptions("deposit", 1009, accounts);
    expect(rows[0]).toMatchObject({ value: "wallet", amountUsd: 1009 });
    expect(rows[1]!.value).toBe("137481");
    expect(rows.some((r) => r.value === "2001845" || r.value === "136990")).toBe(false);
  });

  it("outgoing modes show withdrawable and disable $0 sources with a reason", () => {
    const rows = fundOptions("withdraw", 0, accounts);
    expect(rows.find((r) => r.value === "wallet")!.disabledReason).toBe("zero");
    expect(rows.find((r) => r.value === "137481")!.amountUsd).toBe(75919.7);
    expect(rows.find((r) => r.value === "137502")!.disabledReason).toBe("zero");
    expect(rows.find((r) => r.value === "137533")).toMatchObject({
      amountUsd: 950,
      native: 95000,
      currency: "USC",
    });
  });

  it("read-only accounts can't receive; transfer destinations exclude the source", () => {
    expect(fundOptions("deposit", 0, accounts).find((r) => r.value === "137547")!.disabledReason).toBe(
      "status",
    );
    expect(fundOptions("transferTo", 0, accounts, "137481").some((r) => r.value === "137481")).toBe(false);
  });
});

describe("amounts", () => {
  it("parses money input", () => {
    expect(parseAmount("250")).toBe(250);
    expect(parseAmount("1,000.50")).toBe(1000.5);
    expect(parseAmount("12.345")).toBeNull();
    expect(parseAmount("0")).toBeNull();
  });

  it("explains which limit is broken", () => {
    expect(checkAmount("20", { min: 50, max: 50000 })).toEqual({ kind: "belowMin", min: 50 });
    expect(checkAmount("60000", { min: 50, max: 50000 })).toEqual({ kind: "aboveMax", max: 50000 });
    expect(checkAmount("900", { min: 10, max: 20000, available: 839 })).toEqual({
      kind: "aboveAvailable",
      available: 839,
    });
    expect(checkAmount("abc", {})).toEqual({ kind: "invalid" });
    expect(checkAmount("", { min: 50 })).toBeNull();
  });

  it("method names never render an empty logo box", () => {
    expect(monogram("USDT (TRC20)")).toBe("UT");
    expect(monogram("VND Pay")).toBe("VP");
  });

  it("method minimums match the brief, incl. local currency ('Min $50.00 · ₹4,200')", () => {
    const inr = METHODS.find((m) => m.id === "bank-inr")!;
    expect(inr.min * inr.rate).toBe(4200);
    expect(METHODS.filter((m) => m.kind === "upi")).toHaveLength(2);
  });
});

describe("pagination", () => {
  it("renders 1 2 3 … N and windows around the current page", () => {
    expect(pageList(1, 12)).toEqual([1, 2, 3, "gap", 12]);
    expect(pageList(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(pageList(12, 12)).toEqual([1, "gap", 10, 11, 12]);
    expect(pageList(1, 1)).toEqual([1]);
  });
});

describe("mock funds backend", () => {
  async function session() {
    const login = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "verified@winprofx.test", password: "Winpro#2026" }),
    }).then((r) => r.json());
    const auth = { "content-type": "application/json", authorization: `Bearer ${login.token}` };
    await fetch(`${BACKEND_URL}/auth/2fa`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ method: "totp", code: "123456" }),
    });
    const get = (p: string) => fetch(`${BACKEND_URL}${p}`, { headers: auth }).then((r) => r.json());
    const post = (p: string, body: unknown, extra: Record<string, string> = {}) =>
      fetch(`${BACKEND_URL}${p}`, {
        method: "POST",
        headers: { ...auth, ...extra },
        body: JSON.stringify(body),
      });
    const stepUp = async () =>
      (await (await post("/step-up/verify", { code: "123456" })).json()).stepUpToken as string;
    return { get, post, stepUp };
  }

  it("summary = Σ approved rows for the same filters", async () => {
    const { get } = await session();
    for (const q of [
      "",
      "type=deposit",
      "status=rejected",
      "account=wallet",
      "from=2026-10-01T00:00:00Z&to=2026-11-30T00:00:00Z",
    ]) {
      const summary = await get(`/transactions/summary?${q}`);
      const rows: { type: string; status: string; amount: number }[] = [];
      for (let page = 1; ; page++) {
        const res = await get(`/transactions?${q}&page=${page}&pageSize=100`);
        rows.push(...res.items);
        if (rows.length >= res.total) break;
      }
      const sum = (type: string) =>
        Math.round(
          rows.filter((t) => t.type === type && t.status === "approved").reduce((s, t) => s + t.amount, 0) *
            100,
        ) / 100;
      expect(summary.approvedDeposits).toBe(sum("deposit"));
      expect(summary.approvedWithdrawals).toBe(sum("withdrawal"));
    }
  });

  it("deposits enforce method limits with an actionable message", async () => {
    const { post } = await session();
    const res = await post("/deposits", { methodId: "usdt-trc20", destination: "wallet", amount: 20 });
    expect(res.status).toBe(422);
    expect((await res.json()).message).toBe(
      "Below the $50.00 minimum for USDT (TRC20). Enter $50.00 or more.",
    );
  });

  it("withdrawals need step-up, a verified payout method and enough withdrawable funds", async () => {
    const { post, stepUp, get } = await session();
    expect(
      (await post("/withdrawals", { source: "wallet", payoutMethodId: "pm_trc_1", amount: 50 })).status,
    ).toBe(403);
    expect(
      (
        await post(
          "/withdrawals",
          { source: "wallet", payoutMethodId: "pm_bep_1", amount: 50 },
          { "x-step-up": await stepUp() },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await post(
          "/withdrawals",
          { source: "137502", payoutMethodId: "pm_trc_1", amount: 50 },
          { "x-step-up": await stepUp() },
        )
      ).status,
    ).toBe(422);
    const before = (await get("/wallet")).balance;
    const ok = await post(
      "/withdrawals",
      { source: "wallet", payoutMethodId: "pm_trc_1", amount: 50 },
      { "x-step-up": await stepUp() },
    );
    expect(ok.status).toBe(201);
    expect((await get("/wallet")).balance).toBe(Math.round((before - 50) * 100) / 100);
    // The same amount again within minutes is flagged.
    expect((await get("/withdrawals/duplicate?source=wallet&amount=50")).duplicate).not.toBeNull();
  });

  it("transfers move money instantly and refuse same-account or over-limit moves", async () => {
    const { post, get } = await session();
    expect((await post("/transfers", { from: "wallet", to: "wallet", amount: 1 })).status).toBe(422);
    const w0 = (await get("/wallet")).balance;
    const main0 = (await get("/accounts/137481")).account.balance;
    expect((await post("/transfers", { from: "wallet", to: "137481", amount: 10 })).status).toBe(201);
    expect((await get("/wallet")).balance).toBe(Math.round((w0 - 10) * 100) / 100);
    expect((await get("/accounts/137481")).account.balance).toBe(Math.round((main0 + 10) * 100) / 100);
    expect((await post("/transfers", { from: "wallet", to: "137481", amount: 1_000_000 })).status).toBe(422);
  });
});
