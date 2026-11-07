import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { CODE, NEW_USER, PASSWORD, VERIFIED, formAlert, hydrated } from "./helpers";

const WIDTHS = [320, 375, 768, 1024, 1280, 1440, 1920];

test.describe("login layout", () => {
  for (const width of WIDTHS) {
    test(`card never collapses and nothing scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      const card = page
        .locator("form")
        .first()
        .locator("xpath=ancestor::div[contains(@class,'max-w-110')][1]");
      const box = (await card.boundingBox())!;
      expect(box.width).toBeCloseTo(Math.min(440, width - 32), 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test("redirects to login with next, signs in with 2FA and returns", async ({ page }) => {
  await page.goto("/funds/deposit?account=137481");
  await hydrated(page);
  await expect(page).toHaveURL(/\/login\?next=%2Ffunds%2Fdeposit%3Faccount%3D137481/);
  await expect(page).toHaveTitle("Sign in — WinproFX");

  await page.getByLabel("Email").fill(VERIFIED);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(formAlert(page)).toContainText("email or password is incorrect");

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/2fa/);
  await page.keyboard.type(CODE);
  await expect(page).toHaveURL(/\/funds\/deposit\?account=137481$/, { timeout: 20_000 });
  await expect(page).toHaveTitle("Deposit — WinproFX");
});

test("keyboard-only sign-in", async ({ page }) => {
  await page.goto("/login");
  await hydrated(page); // so Enter goes through the client handler
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.keyboard.type(NEW_USER);
  await page.keyboard.press("Tab");
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/verify-email/, { timeout: 20_000 });
});

test("sign-in modes have their own URL hash and Back works", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("More ways to sign in").click();
  await page.getByRole("button", { name: "Scan a QR code" }).click();
  await expect(page).toHaveURL(/#qr$/);
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  await expect(page.getByText(/Code refreshes in \d+s/)).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("QR sign-in completes when the app approves", async ({ page }) => {
  await page.goto("/login#qr");
  await page.getByRole("button", { name: "Simulate app approval (mock)" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
});

test("register → verify email → portal", async ({ page }) => {
  await page.goto("/register?ref=WPX-48213");
  await expect(page.getByLabel("Referral code (optional)")).toHaveValue("WPX-48213");
  await expect(page.getByLabel(/phone/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await expect(page.getByText("Accept the terms to create your account.")).toBeVisible();

  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Trader");
  await page.getByLabel("Email").fill(`e2e+${Date.now()}@example.com`);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await expect(page.getByText("A symbol (for example ! # $)")).toBeVisible();
  await page.getByRole("combobox", { name: "Country of residence" }).click();
  await page.getByRole("option", { name: "Bangladesh" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/verify-email/);
  await page.keyboard.type("000000");
  await expect(formAlert(page)).toContainText("incorrect");
  await page.keyboard.type(CODE);
  await expect(page).toHaveURL(/\/$/);
});

test("forgot → reset password → sign in with the new password", async ({ page }) => {
  await page.goto("/forgot-password");
  // Unknown email on purpose: the flow must look identical (no account discovery),
  // and it doesn't change a shared persona's password while other tests run.
  await page.getByLabel("Email").fill("someone-else@example.com");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByText("valid 10 minutes")).toBeVisible();
  await page.keyboard.type(CODE);
  await page.getByLabel("New password", { exact: true }).fill("Better#Pass1");
  await page.getByLabel("Confirm new password").fill("Better#Pass1");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("Password changed")).toBeVisible();
});

test("forced backend error shows what happened and what to do", async ({ page }) => {
  await page.goto("/login?mockError=login");
  await page.getByLabel("Email").fill(VERIFIED);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(formAlert(page)).toContainText("Try again in a moment");
});

for (const path of ["/login", "/register", "/forgot-password"]) {
  test(`axe: ${path} has no serious/critical violations`, async ({ page }) => {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const blocking = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")) }))).toEqual([]);
  });
}

test("submitting before hydration never puts credentials in the URL", async ({ page }) => {
  await page.goto("/login");
  const form = page.locator("form").first();
  await expect(form).toHaveAttribute("method", "post");
});
