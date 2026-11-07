import { describe, expect, it } from "vitest";
import { BACKEND_URL } from "@/mocks/utils";

async function signIn(email = "verified@winprofx.test") {
  const login = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Winpro#2026" }),
  });
  const { token, mfaRequired } = (await login.json()) as { token: string; mfaRequired: boolean };
  if (mfaRequired) {
    await fetch(`${BACKEND_URL}/auth/2fa`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ method: "totp", code: "123456" }),
    });
  }
  return (path: string) =>
    fetch(`${BACKEND_URL}${path}`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
}

describe("mock backend fixtures (brief §8)", () => {
  it("has 11 live accounts with the main account's exact figures", async () => {
    const get = await signIn();
    const { items } = await get("/accounts");
    const live = items.filter((a: { kind: string; archived: boolean }) => a.kind === "live" && !a.archived);
    expect(live).toHaveLength(11);
    const main = items.find((a: { login: number }) => a.login === 137481);
    expect(main).toMatchObject({ balance: 75919.7, credit: 48.34, equity: 76183.84, openPositions: 1 });
    expect(items.some((a: { currency: string }) => a.currency === "USC")).toBe(true);
    expect(items.find((a: { campaign: unknown }) => a.campaign)).toMatchObject({
      campaign: { endedAt: "2026-10-24T17:59:59Z" },
    });
  });
});

describe("mock backend invariants", () => {
  it("portfolio totals: live accounts only, cents converted, credit excluded from balance", async () => {
    const get = await signIn();
    expect(await get("/portfolio/summary")).toMatchObject({
      totalEquity: 78426.34,
      totalBalance: 78162.2,
      openPnl: 215.8,
      walletBalance: 1009,
    });
  });

  it("trading summary realized P/L equals the sum of closed deals in the period", async () => {
    const get = await signIn();
    for (const range of ["7d", "30d", "90d"]) {
      const summary = await get(`/accounts/137481/summary?range=${range}`);
      const { items } = await get(`/accounts/137481/deals?range=${range}`);
      const net = items.reduce(
        (s: number, d: { profit: number; swap: number; commission: number }) =>
          s + d.profit + d.swap + d.commission,
        0,
      );
      expect(summary.realizedPnl).toBeCloseTo(net, 2);
      expect(summary.closedTrades).toBe(items.length);
      expect(summary.series.at(-1).realizedCumulative).toBeCloseTo(summary.realizedPnl, 2);
      // Today's equity point is the live equity (incl. the open XAUUSD trade).
      expect(summary.series.at(-1).equity).toBe(76183.84);
    }
  });

  it("285 transactions, with rejected ones carrying reasons and repeated $1 withdrawals", async () => {
    const get = await signIn();
    const page = await get("/transactions?pageSize=100");
    expect(page.total).toBe(285);
    const rejected = page.items.filter((t: { status: string }) => t.status === "rejected");
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((t: { reason: string | null }) => !!t.reason)).toBe(true);
    expect(
      page.items.filter((t: { type: string; amount: number }) => t.type === "withdrawal" && t.amount === 1)
        .length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("leverage and MT5 password changes need a step-up token, and leverage is blocked by open positions", async () => {
    const get = await signIn();
    void get;
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
    const post = (path: string, body: unknown, extra: Record<string, string> = {}) =>
      fetch(`${BACKEND_URL}${path}`, {
        method: "POST",
        headers: { ...auth, ...extra },
        body: JSON.stringify(body),
      });
    const stepUp = async () =>
      (await (await post("/step-up/verify", { code: "123456" })).json()).stepUpToken as string;

    expect((await post("/accounts/137518/leverage", { leverage: 100, acceptTerms: true })).status).toBe(403);
    const blocked = await post(
      "/accounts/137481/leverage",
      { leverage: 100, acceptTerms: true },
      { "x-step-up": await stepUp() },
    );
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).code).toBe("OPEN_POSITIONS");
    const token = await stepUp();
    expect(
      (await post("/accounts/137518/leverage", { leverage: 100, acceptTerms: true }, { "x-step-up": token }))
        .status,
    ).toBe(200);
    // Tokens are single use.
    expect(
      (
        await post(
          "/accounts/137518/password",
          { type: "master", password: "Winpro#2027" },
          { "x-step-up": token },
        )
      ).status,
    ).toBe(403);
  });

  it("new persona starts empty (first-time state)", async () => {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@winprofx.test", password: "Winpro#2026" }),
    }).then((r) => r.json());
    const get = (path: string) =>
      fetch(`${BACKEND_URL}${path}`, { headers: { authorization: `Bearer ${res.token}` } }).then((r) =>
        r.json(),
      );
    expect((await get("/accounts")).items).toEqual([]);
    expect((await get("/onboarding")).steps.some((s: { done: boolean }) => !s.done)).toBe(true);
  });
});
