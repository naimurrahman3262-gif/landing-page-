import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CODE, signIn } from "./helpers";

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 3) }));
}

test.describe("verified persona", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("Home shows correct KPIs, alerts and recent activity", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Rahim" })).toBeVisible();
    await expect(page.getByText("$78,426.34")).toBeVisible(); // total equity (live only, USC converted)
    await expect(page.getByText("$78,162.20")).toBeVisible(); // total balance (credit excluded)
    await expect(page.getByText("+$215.80").first()).toBeVisible(); // open P/L
    await expect(page.getByText("$1,009.00")).toBeVisible(); // wallet
    await expect(page.getByText(/^Synced \d{2}:\d{2}$/).first()).toBeVisible();
    await expect(page.getByText("Withdrawal of $1.00 was rejected")).toBeVisible();
    await expect(page.getByRole("link", { name: /Fix and retry/ }).first()).toHaveAttribute(
      "href",
      /\/funds\/withdraw\?retry=tx_/,
    );
    await expect(page.getByTestId("account-card")).toHaveCount(4);
    await expect(page.getByTestId("transaction-row")).toHaveCount(5);
    // Onboarding is hidden once everything is done.
    await expect(page.getByText("Get set up")).toHaveCount(0);
    expect(await axe(page)).toEqual([]);
  });

  test("a failing widget shows its own error, the rest of Home still works", async ({ page }) => {
    await page.goto("/?mockError=alerts");
    await expect(page.getByText("$78,426.34")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Needs your attention" })).toBeVisible();
  });

  test("Accounts: tabs, search, filter, table view; card click opens details", async ({ page }) => {
    await page.goto("/trading/accounts");
    await expect(page.getByTestId("account-card").first()).toContainText("Main");
    // ≥ 11: other tests may open accounts against the shared mock backend.
    expect(await page.getByTestId("account-card").count()).toBeGreaterThanOrEqual(11);
    await expect(page.getByText("95,000 USC").first()).toBeVisible();
    await expect(page.getByText("≈ $950.00").first()).toBeVisible();

    await page.getByRole("searchbox", { name: "Search by login or label" }).fill("scalp");
    await expect(page.getByTestId("account-card")).toHaveCount(1);
    await expect(page).toHaveURL(/q=scalp/);
    await page.getByRole("searchbox").fill("");

    await page.getByRole("tab", { name: /Demo/ }).click();
    expect(await page.getByTestId("account-card").count()).toBeGreaterThanOrEqual(2);
    await page.getByRole("tab", { name: /Live/ }).click();

    await page.getByRole("radio", { name: "Table view" }).click();
    await page.reload();
    await expect(page.getByRole("radio", { name: "Table view" })).toHaveAttribute("data-state", "on");
    await page.getByRole("radio", { name: "Grid view" }).click();

    await page.getByRole("link", { name: "Open details for Main" }).click();
    await expect(page).toHaveURL(/\/trading\/accounts\/137481$/);
    await expect(page.getByRole("heading", { level: 1, name: "Main" })).toBeVisible();
    await expect(page.getByText("Connect to MT5")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("Withdraw is disabled with a reason on a $0 account", async ({ page }) => {
    await page.goto("/trading/accounts?q=137502");
    const card = page.getByTestId("account-card");
    const withdraw = card.getByRole("button", { name: "Withdraw" });
    await expect(withdraw).toHaveAttribute("aria-disabled", "true");
    await withdraw.focus();
    await expect(page.getByRole("tooltip")).toContainText("Nothing to withdraw: free margin is $0.00.");
    // Deposit is the primary action when equity is 0.
    await expect(card.getByRole("link", { name: "Deposit" })).toHaveClass(/bg-primary/);
  });

  test("Leverage: blocked with open positions; otherwise needs terms + step-up", async ({ page }) => {
    await page.goto("/trading/accounts");
    await page.getByRole("button", { name: "More actions for Main" }).click();
    await page.getByRole("menuitem", { name: "Change leverage" }).click();
    const dialog = page.getByRole("dialog", { name: "Change leverage" });
    await expect(dialog).toContainText("You have 1 open position on this account");
    await expect(dialog.getByRole("link", { name: "View positions" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "More actions for Scalping" }).click();
    await page.getByRole("menuitem", { name: "Change leverage" }).click();
    const submit = dialog.getByRole("button", { name: /Change (leverage|to)/ });
    await expect(submit).toBeDisabled(); // no preselection
    await dialog.getByRole("radio").first().check();
    await expect(submit).toBeDisabled(); // terms not accepted
    await dialog.getByRole("checkbox").check();
    await submit.click();
    const stepUp = page.getByRole("dialog", { name: "Confirm it's you" });
    await expect(stepUp).toBeVisible();
    await page.keyboard.type(CODE);
    await expect(page.getByText(/Leverage changed to 1:\d+/)).toBeVisible();
  });

  test("Change MT5 password needs the rule checklist and step-up", async ({ page }) => {
    await page.goto("/trading/accounts/137518");
    await page.getByRole("button", { name: "Change" }).nth(1).click();
    const dialog = page.getByRole("dialog", { name: "Change MT5 password" });
    await expect(dialog.getByRole("radio", { name: "Investor (read-only)" })).toHaveAttribute(
      "data-state",
      "on",
    );
    await dialog.getByLabel("New password", { exact: true }).fill("weak");
    await dialog.getByRole("button", { name: "Change password" }).click();
    await expect(dialog.getByText("Your password doesn't meet all the rules below.")).toBeVisible();
    await dialog.getByLabel("New password", { exact: true }).fill("Better#Pass9");
    await dialog.getByLabel("Confirm new password").fill("Better#Pass9");
    await dialog.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("dialog", { name: "Confirm it's you" })).toBeVisible();
    await page.keyboard.type(CODE);
    await expect(page.getByText("Investor (read-only) password changed")).toBeVisible();
  });

  test("Rename label (empty reverts to the account ID)", async ({ page }) => {
    await page.goto("/trading/accounts?q=137603");
    await page.getByRole("button", { name: "More actions for MT5 · 137603" }).click();
    await page.getByRole("menuitem", { name: "Rename label" }).click();
    await page.getByRole("dialog").getByRole("textbox", { name: "Label" }).fill("Swing");
    await page.getByRole("button", { name: "Save label" }).click();
    await expect(page.getByRole("link", { name: "Open details for Swing" })).toBeVisible();
    await page.getByRole("button", { name: "More actions for Swing" }).click();
    await page.getByRole("menuitem", { name: "Rename label" }).click();
    await page.getByRole("dialog").getByRole("textbox", { name: "Label" }).fill("");
    await page.getByRole("button", { name: "Save label" }).click();
    await expect(page.getByRole("link", { name: "Open details for MT5 · 137603" })).toBeVisible();
  });

  test("Open account: steps in the URL, Back works, credentials shown once", async ({ page }) => {
    await page.goto("/trading/accounts/new");
    await expect(page.getByText("No commission").first()).toBeVisible();
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByText("Choose an account type.")).toBeVisible();
    await page.getByRole("button", { name: /^Standard/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page).toHaveURL(/step=config/);
    await page.goBack();
    await expect(page).not.toHaveURL(/step=config/);
    await page.goForward();
    await page.getByRole("combobox", { name: /Leverage/ }).click();
    await page.getByRole("option", { name: "1:500" }).click();
    await page.getByLabel("Label (optional)").fill("E2E");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page).toHaveURL(/step=review/);
    await expect(page.getByText("$50.00")).toBeVisible(); // min deposit, same source as Deposit
    await page.getByRole("button", { name: "Open account" }).click();
    await expect(page.getByRole("heading", { name: "Your account is ready" })).toBeVisible();
    await expect(page.getByText("••••••••••")).toHaveCount(2);
    await expect(page.getByRole("button", { name: /Copy master password/ })).toBeVisible();
  });

  test("Positions: KPIs, charts and the open XAUUSD trade; tabs and ranges", async ({ page }) => {
    await page.goto("/trading/positions");
    await expect(page.getByRole("combobox", { name: "Account" })).toContainText(
      "Main · Standard · $75,919.70",
    );
    await expect(page.getByText("$76,183.84").first()).toBeVisible();
    await expect(page.getByText("72,109.65%")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Realized P/L (cumulative)" })).toBeVisible();
    await expect(page.getByText("XAUUSD").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("+$215.80").filter({ visible: true }).first()).toBeVisible();

    await page.getByRole("radio", { name: "7D" }).click();
    await expect(page).toHaveURL(/range=7d/);
    await page.getByRole("tab", { name: "Pending" }).click();
    await expect(page.getByText("Buy limit").filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Closed" }).click();
    await expect(page).toHaveURL(/tab=closed/);
    expect(await axe(page)).toEqual([]);
  });

  test("dev invariants hold (no console errors) across trading pages", async ({ page }) => {
    test.slow(); // first visit compiles each route in dev
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const pages: [string, string][] = [
      ["/", "Recent activity"],
      ["/trading/accounts", "Trading accounts"],
      ["/trading/positions?tab=closed&range=90d", "Realized P/L (cumulative)"],
      ["/trading/accounts/137481", "Connect to MT5"],
    ];
    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await page.waitForTimeout(1500); // let queries settle and invariant checks run
    }
    // Locally the dev server can compile a route mid-navigation and log a one-off
    // hydration warning (never seen against the production build, which CI uses).
    const devOnly = (e: string) => !process.env.CI && e.startsWith("A tree hydrated but some attributes");
    expect(errors.filter((e) => !e.includes("Download the React DevTools") && !devOnly(e))).toEqual([]);
  });
});

test("first-time user: no accounts, onboarding checklist, empty positions", async ({ page }) => {
  // A fresh sign-up, so shared personas stay untouched.
  await page.goto("/login");
  const csrf = (await page.context().cookies()).find((c) => c.name === "wpx_csrf")!.value;
  const headers = { "x-csrf-token": csrf, origin: new URL(page.url()).origin };
  await page.request.post("/api/auth/register", {
    headers,
    data: {
      firstName: "Fresh",
      lastName: "User",
      email: `fresh+${Date.now()}@example.com`,
      password: "Winpro#2026",
      country: "IN",
      acceptTerms: true,
    },
  });
  await page.request.post("/api/auth/verify-email", { headers, data: { code: CODE } });
  await page.goto("/");
  await expect(page.getByText("You don't have a trading account yet")).toBeVisible();
  await expect(page.getByText("Get set up")).toBeVisible();
  await expect(page.getByText("Verify your identity", { exact: true })).toBeVisible();
  await page.goto("/trading/positions");
  await expect(page.getByText("You don't have a trading account yet")).toBeVisible();
});
