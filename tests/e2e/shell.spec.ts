import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { NAV } from "../../src/config/nav";
import { FEATURES } from "../../src/config/features";
import messages from "../../messages/en.json";
import { signIn } from "./helpers";

const nav = messages.nav as Record<string, string>;
const visible = NAV.flatMap((g) =>
  g.items.filter((i) => !i.feature || FEATURES[i.feature]).map((i) => ({ ...i, group: g })),
);

test.describe("app shell", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("active nav item and page title are correct on every route (G2, G3)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "sidebar is persistent on desktop");
    test.slow();
    const cases = [
      ...visible.map((i) => ({ path: i.href, key: i.key, title: i.href === "/" ? nav.home : nav[i.key] })),
      { path: "/trading/accounts/137481", key: "accounts", title: nav.details },
      { path: "/funds/deposit/status/dep_1", key: "deposit", title: nav.depositStatus },
      { path: "/help/tickets/48120", key: "tickets", title: nav.ticket },
      { path: "/help/articles/how-to-deposit", key: "helpCentre", title: nav.article },
    ];
    const sidebar = page.getByRole("complementary").getByRole("navigation", { name: "Main navigation" });
    for (const c of cases) {
      await page.goto(c.path);
      await expect(page).toHaveTitle(`${c.title} — WinproFX`);
      const current = sidebar.locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toContainText(c.key === "overview" ? nav.home : nav[c.key]!);
    }
  });

  test("disabled module: hidden from nav, coming-soon page inside the shell", async ({ page }) => {
    await page.goto("/rewards/trading");
    await expect(page).toHaveTitle("Trading rewards — WinproFX");
    await expect(page.getByRole("heading", { level: 1, name: "Trading rewards" })).toBeVisible();
    await expect(page.getByText("Coming soon")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Home" })).toBeVisible();
    await expect(page.locator('a[href="/rewards/trading"]')).toHaveCount(0);
  });

  test("notifications, theme toggle and ⌘K search", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Notifications, 2 unread/ }).click();
    await expect(page.getByText("Withdrawal rejected")).toBeVisible();
    await page.keyboard.press("Escape");

    const theme = page.getByRole("button", { name: /Switch to (light|dark) theme/ });
    await theme.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();

    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.type("transac");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/funds\/transactions$/);
  });

  test("mobile drawer opens, highlights the route, closes on navigation", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-375", "drawer is mobile only");
    await page.goto("/funds/transactions");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.locator('[aria-current="page"]')).toContainText("Transactions");
    await drawer.getByRole("link", { name: "Deposit" }).click();
    await expect(page).toHaveURL(/\/funds\/deposit$/);
    await expect(drawer).toBeHidden();
  });

  test("sign out ends the session", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByText("WPX-48213")).toBeVisible();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/funds/deposit");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("axe: portal shell has no serious/critical violations", async ({ page }) => {
    await page.goto("/trading/accounts");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const blocking = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")) }))).toEqual([]);
  });
});
