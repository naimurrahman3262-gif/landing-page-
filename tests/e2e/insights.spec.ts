import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { hydrated, signIn } from "./helpers";

async function axe(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    // Third-party frames are the provider's responsibility.
    .exclude("iframe")
    .analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 3) }));
}

test.describe("Insights, Invest, Rewards", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("Calculator: native, validated, position size rounds down", async ({ page }) => {
    await page.goto("/insights/calculator");
    await expect(page.locator("iframe")).toHaveCount(0); // built natively
    await hydrated(page);
    const balance = page.getByLabel("Account balance (USD)");
    await balance.fill("abc");
    await balance.blur();
    await expect(page.getByText("Enter a number.")).toBeVisible();
    await balance.fill("10000");
    await expect(page.locator("output")).toHaveText("0.50 lots");
    await expect(page.getByText("Risks $100.00 if the stop is hit.")).toBeVisible();

    await page.getByRole("tab", { name: "Pip value" }).click();
    await expect(page).toHaveURL(/calc=pip/);
    await expect(page.locator("output:visible")).toHaveText("$10.00 per pip");

    await page.getByRole("tab", { name: "Margin" }).click();
    await expect(page.getByText(/Price as of \d\d:\d\d/)).toBeVisible();
    await expect(page.locator("output:visible")).toHaveText(/^\$[\d,.]+ margin$/);
  });

  test("Signals: legend, filters, favourites; detail pane or sheet", async ({ page }, info) => {
    await page.goto("/insights/signals");
    await expect(page.getByText("Buy: price expected to rise.", { exact: false })).toBeVisible();
    await hydrated(page);
    await page.getByRole("radio", { name: "Exotic" }).click();
    await expect(page).toHaveURL(/group=exotic/);
    await expect(page.getByRole("button", { name: /^USDTRY/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^EURUSD/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Add USDTRY to favourites" }).click();
    await page.getByRole("radio", { name: "All" }).click();
    await page.getByRole("button", { name: "Favourites", exact: true }).click();
    await expect(page.getByRole("button", { name: /^USDTRY/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^USDZAR/ })).toHaveCount(0);

    await page.getByRole("button", { name: /^USDTRY/ }).click();
    if (info.project.name.includes("mobile")) {
      const sheet = page.getByRole("dialog", { name: "USDTRY" });
      await expect(sheet.getByText("Entry")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
    } else {
      await expect(page.getByRole("heading", { name: "USDTRY", level: 2 })).toBeVisible();
    }
  });

  test("News: feed first, market chips drive the TradingView feed, sentiment shows its source", async ({
    page,
  }) => {
    await page.goto("/insights/news");
    const frame = page.locator("iframe");
    await expect(frame).toHaveAttribute("src", /tradingview\.com\/embed-widget\/timeline/);
    await expect(frame).toHaveAttribute("src", /%22market%22%3A%22forex%22/);
    await expect(frame).toHaveAttribute("src", /colorTheme%22%3A%22dark/);
    await hydrated(page);
    await page.getByRole("button", { name: "Crypto", exact: true }).click();
    await expect(page).toHaveURL(/market=crypto/);
    await expect(frame).toHaveAttribute("src", /%22market%22%3A%22crypto%22/);
    await expect(page.getByText(/WinproFX client positions · /)).toBeVisible();

    await page.getByRole("button", { name: "Feed settings" }).click();
    const sheet = page.getByRole("dialog", { name: "Feed settings" });
    await sheet.getByRole("checkbox", { name: "GBPUSD" }).click();
    await sheet.getByRole("button", { name: "Save watchlist" }).click();
    await expect(page.getByRole("button", { name: "GBPUSD", exact: true })).toBeVisible();
  });

  test("Analysis: SSO embed loads; a failed handoff shows the error state", async ({ page }) => {
    await page.goto("/insights/analysis");
    await expect(page.locator('iframe[title="Autochartist"]')).toHaveAttribute(
      "src",
      /^\/mock-embed\/autochartist\?theme=dark&token=/,
    );
    await expect(
      page.frameLocator('iframe[title="Autochartist"]').getByRole("heading", { name: "Autochartist" }),
    ).toBeVisible();
    for (const name of ["Refresh", "Full screen", "Open in new tab"]) {
      await expect(
        page
          .getByRole("region", { name: "Autochartist" })
          .getByRole("button", { name })
          .or(page.getByRole("link", { name })),
      ).toBeVisible();
    }

    await page.goto("/insights/analysis?mockError=embed-autochartist");
    await expect(page.getByRole("alert").filter({ hasText: "Autochartist didn't load" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("Embed timeout turns into an error state with Open in new tab", async ({ page }) => {
    test.slow();
    await page.goto("/invest/social?mockError=embed-timeout");
    await expect(
      page.getByRole("region", { name: "Social trading" }).getByLabel("Loading Social trading"),
    ).toBeVisible();
    const alert = page.getByRole("alert").filter({ hasText: "Social trading didn't load" });
    await expect(alert).toBeVisible({ timeout: 20_000 });
    await expect(alert.getByText("It's taking longer than usual.", { exact: false })).toBeVisible();
    await expect(alert.getByRole("link", { name: "Open in new tab" })).toBeVisible();
  });

  test("Invest: plain intro and risk line, then the provider", async ({ page }) => {
    await page.goto("/invest/pamm");
    await expect(page.getByRole("note")).toHaveText(/You can lose some or all of the money you invest/);
    await expect(
      page.frameLocator('iframe[title="PAMM"]').getByRole("heading", { name: "PAMM" }),
    ).toBeVisible();
  });

  test("Referrals: link, share, funnel, earnings, ended campaign, next step", async ({ page }) => {
    await page.goto("/rewards/referrals");
    await expect(page.getByText("https://my.winprofx.com/register?ref=RC7H2K")).toBeVisible();
    await expect(page.getByRole("img", { name: "QR code for your referral link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Share on Telegram" })).toHaveAttribute(
      "href",
      /^https:\/\/t\.me\/share\/url\?url=/,
    );
    await expect(page.getByRole("link", { name: "Share on Email" })).toHaveAttribute("href", /^mailto:/);
    await expect(page.getByText("You get $50.00 for each friend who qualifies.")).toBeVisible();
    await expect(page.getByText("$200.00", { exact: true })).toBeVisible();
    await expect(page.getByText("Ended 24 Oct 2026")).toBeVisible();
    await expect(page.getByText("Live data")).toHaveCount(0);
    await expect(
      page.getByText("Deposit $200.00 and trade 2 lots").filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test("Feature flags: a disabled module is hidden from the nav and shows Coming soon", async ({ page }) => {
    await page.goto("/rewards/trading");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Trading rewards");
    await expect(page.getByText("Coming soon")).toBeVisible();
    await expect(page.getByRole("link", { name: "Trading rewards" })).toHaveCount(0);
  });

  for (const path of [
    "/insights/news",
    "/insights/signals",
    "/insights/analysis",
    "/insights/calculator",
    "/invest/social",
    "/invest/pamm",
    "/rewards/referrals",
  ]) {
    test(`a11y + no horizontal overflow: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await axe(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
