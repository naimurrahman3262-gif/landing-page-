import { describe, expect, it } from "vitest";
import { BRAND, pageTitle } from "@/config/brand";
import { NAV } from "@/config/nav";
import { LEGAL } from "@/config/legal";
import { BACKEND_URL } from "@/mocks/utils";

describe("brand", () => {
  it("formats page titles as '{Page} — WinproFX'", () => {
    expect(BRAND).toBe("WinproFX");
    expect(pageTitle("Deposit")).toBe("Deposit — WinproFX");
  });
});

describe("navigation", () => {
  it("has exactly the 8 groups from the brief", () => {
    expect(NAV.map((g) => g.key)).toEqual([
      "home",
      "funds",
      "trading",
      "insights",
      "invest",
      "rewards",
      "help",
      "account",
    ]);
  });

  it("has unique hrefs", () => {
    const hrefs = NAV.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("legal config", () => {
  it("contains no placeholder text", () => {
    for (const value of Object.values(LEGAL)) {
      if (value !== null) expect(value).not.toMatch(/\[|add .* here|lorem/i);
    }
  });
});

describe("mock backend", () => {
  it("serves the health endpoint", async () => {
    const res = await fetch(`${BACKEND_URL}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", source: "mock" });
  });

  it("honours the mockError switch", async () => {
    const res = await fetch(`${BACKEND_URL}/health`, { headers: { "x-mock-error": "health" } });
    expect(res.status).toBe(503);
  });
});
