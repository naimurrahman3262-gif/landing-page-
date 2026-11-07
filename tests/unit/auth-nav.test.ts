import { describe, expect, it } from "vitest";
import { PASSWORD_RULES, RegisterInput } from "@/lib/api/schemas";
import { safeNext, signSession, verifySession, type SessionPayload } from "@/lib/auth/session";
import { NAV } from "@/config/nav";
import { resolveActive, visibleNav } from "@/lib/nav";

describe("resolveActive (G3: active nav from the URL)", () => {
  const cases: [string, string | null][] = [
    ["/", "overview"],
    ["/funds/deposit", "deposit"],
    ["/funds/deposit/status/dep_123", "deposit"],
    ["/funds/withdraw", "withdraw"],
    ["/funds/transactions", "transactions"],
    ["/trading/accounts", "accounts"],
    ["/trading/accounts/137481", "accounts"],
    ["/trading/accounts/new", "openAccount"],
    ["/trading/positions", "positions"],
    ["/insights/calculator", "calculator"],
    ["/help", "helpCentre"],
    ["/help/tickets", "tickets"],
    ["/help/tickets/48120", "tickets"],
    ["/help/articles/how-to-deposit", "helpCentre"],
    ["/account/payment-methods", "paymentMethods"],
    ["/funds-extra", null],
    ["/unknown", null],
  ];
  it.each(cases)("%s → %s", (path, key) => {
    expect(resolveActive(path)?.item.key ?? null).toBe(key);
  });

  it("every nav href resolves to itself", () => {
    for (const g of NAV) for (const i of g.items) expect(resolveActive(i.href)?.item.href).toBe(i.href);
  });

  it("hides disabled modules and empty groups", () => {
    const groups = visibleNav({ rewardsTrading: false, rewardsReferrals: false });
    expect(groups.find((g) => g.key === "rewards")).toBeUndefined();
    expect(
      visibleNav({ rewardsTrading: false, rewardsReferrals: true }).find((g) => g.key === "rewards")?.items,
    ).toHaveLength(1);
  });
});

describe("session cookie", () => {
  const payload: SessionPayload = { token: "sess_abc", ev: true, mfa: false, rem: false, exp: 4_102_444_800 };

  it("round-trips a signed payload", async () => {
    expect(await verifySession(await signSession(payload))).toEqual(payload);
  });

  it("rejects tampering", async () => {
    const signed = await signSession(payload);
    const [body, sig] = signed.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, ev: false })).toString("base64url");
    expect(await verifySession(`${forged}.${sig}`)).toBeNull();
    expect(await verifySession(`${body}.${sig}x`)).toBeNull();
    expect(await verifySession("garbage")).toBeNull();
  });

  it("rejects expired sessions", async () => {
    expect(await verifySession(await signSession({ ...payload, exp: 1 }))).toBeNull();
  });
});

describe("safeNext (no open redirects)", () => {
  it.each([
    ["/funds/deposit?step=method", "/funds/deposit?step=method"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/api/auth/logout", "/"],
    ["/login", "/"],
    [null, "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe("password rules and sign-up schema", () => {
  const check = (v: string) => PASSWORD_RULES.filter((r) => r.test(v)).map((r) => r.key);
  it("evaluates each rule", () => {
    expect(check("abc")).toEqual(["lower"]);
    expect(check("Winpro#2026")).toEqual(["length", "lower", "upper", "number", "symbol"]);
  });

  it("asks only for step-1 fields (no phone/state/city) and requires terms", () => {
    const base = {
      firstName: "Ananya",
      lastName: "Iyer",
      email: "a@example.com",
      password: "Winpro#2026",
      country: "IN",
      acceptTerms: true,
    };
    expect(RegisterInput.safeParse(base).success).toBe(true);
    expect(RegisterInput.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(Object.keys(RegisterInput.shape)).not.toContain("phone");
  });
});
