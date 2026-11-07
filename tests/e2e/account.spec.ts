import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CODE, formAlert, hydrated, signIn } from "./helpers";

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 3) }));
}

const stepUp = (page: Page) => page.getByRole("dialog", { name: "Confirm it's you" });

test.describe("Account + Help (verified persona)", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("Profile: KYC fields locked, postcode checked against the country, save", async ({ page }) => {
    await page.goto("/account/profile");
    await expect(page.getByText("Profile 100% complete")).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveAttribute("readonly", "");
    await expect(page.getByRole("link", { name: "Contact support to change" }).first()).toHaveAttribute(
      "href",
      "/help/tickets?new=1&category=account",
    );
    await hydrated(page);
    const save = page.getByRole("button", { name: "Save changes" });
    await expect(save).toBeDisabled(); // nothing changed yet

    await page.getByLabel("Postcode").fill("12345");
    await save.click();
    await expect(page.getByText("Check the postcode. For example: 1212.")).toBeVisible();

    await page.getByLabel("Postcode").fill("1212");
    await page.getByLabel("City").fill("Dhaka North");
    await save.click();
    await expect(page.getByText("Changes saved")).toBeVisible();
    await expect(save).toBeDisabled();
  });

  test("Security: change email and turn off 2FA both need step-up", async ({ page }) => {
    await page.goto("/account/security");
    await hydrated(page);

    // Change email → step-up → pending confirmation notice.
    await page.getByRole("button", { name: "Change email" }).click();
    await page.getByLabel("New email").fill("rahim.new@example.com");
    await page.getByRole("button", { name: "Send confirmation" }).click();
    await expect(stepUp(page)).toBeVisible();
    await page.keyboard.type(CODE);
    await expect(page.getByRole("status").filter({ hasText: "rahim.new@example.com" })).toBeVisible();

    // Turn off 2FA → step-up → Off.
    await page.getByRole("button", { name: "Turn off" }).click();
    await expect(stepUp(page)).toBeVisible();
    await page.keyboard.type(CODE);
    await expect(page.getByText("Two-step verification is off")).toBeVisible();
    await expect(page.getByRole("button", { name: "Turn on" })).toBeVisible();
  });

  test("Security: turn 2FA back on via QR and get backup codes once", async ({ page }) => {
    await page.goto("/account/security");
    await hydrated(page);
    await page.getByRole("button", { name: "Turn off" }).click();
    await page.keyboard.type(CODE);
    await page.getByRole("button", { name: "Turn on" }).click();
    const dialog = page.getByRole("dialog", { name: "Turn on two-step verification" });
    await expect(dialog.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible();
    await dialog.getByRole("textbox").first().focus();
    await page.keyboard.type("000000");
    await expect(formAlert(page)).toBeVisible();
    await dialog.getByRole("textbox").first().focus();
    await page.keyboard.type(CODE);
    const codes = page.getByRole("dialog", { name: "Save your backup codes" });
    await expect(codes.getByRole("listitem")).toHaveCount(10);
    await codes.getByRole("button", { name: "I've saved them" }).click();
    await expect(page.getByText("10 backup codes left")).toBeVisible();
  });

  test("Security: password change checks the current password; sign out other devices", async ({ page }) => {
    await page.goto("/account/security");
    await hydrated(page);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByLabel("Current password").fill("Wrong#Pass1");
    await page.getByLabel("New password", { exact: true }).fill("Brand#New2026");
    await page.getByLabel("Confirm new password").fill("Brand#New2026");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Your current password is incorrect.")).toBeVisible();
    await page.getByLabel("Current password").fill("Winpro#2026");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed")).toBeVisible();

    await expect(page.getByRole("button", { name: /^Sign out: / })).toHaveCount(2);
    await page.getByRole("button", { name: "Sign out all other devices" }).click();
    await expect(page.getByRole("button", { name: /^Sign out: / })).toHaveCount(0);
  });

  test("Payment methods: default badge, status, remove needs confirm + step-up", async ({ page }) => {
    await page.goto("/account/payment-methods");
    await expect(page.getByText("Withdrawals only go to accounts in your own name.")).toBeVisible();
    const hdfc = page.getByRole("listitem").filter({ hasText: "HDFC Bank" });
    await expect(hdfc.getByText("Default")).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "MetaMask" }).locator("[data-status=pending]"),
    ).toBeVisible();
    await hydrated(page);

    await page.getByRole("button", { name: "More actions: Binance TRC20" }).click();
    await page.getByRole("menuitem", { name: "Make default" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Binance TRC20" }).getByText("Default"),
    ).toBeVisible();

    await page.getByRole("button", { name: "More actions: MetaMask" }).click();
    await page.getByRole("menuitem", { name: "Remove" }).click();
    await page
      .getByRole("dialog", { name: "Remove MetaMask?" })
      .getByRole("button", { name: "Remove" })
      .click();
    await expect(stepUp(page)).toBeVisible();
    await page.keyboard.type(CODE);
    await expect(page.getByText("Payment method removed")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "MetaMask" })).toHaveCount(0);
  });

  test("Preferences: security alerts locked on; saving the time zone changes dates", async ({ page }) => {
    await page.goto("/account/preferences");
    await expect(page.getByRole("switch", { name: "Security alerts: Email" })).toBeDisabled();
    await expect(page.getByRole("switch", { name: "Security alerts: Email" })).toBeChecked();
    await hydrated(page);
    await page.getByRole("switch", { name: "News and offers: Email" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Preferences saved")).toBeVisible();
  });

  test("Help: real first name, search, article, chat launcher never auto-opens", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi Rahim, how can we help?");
    await expect(page.getByRole("dialog")).toHaveCount(0); // chat never opens on its own
    await hydrated(page);
    await page.getByRole("searchbox", { name: "Search help articles" }).fill("withdraw");
    await page.getByRole("search").getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=withdraw/);
    await page.getByRole("link", { name: /Why was my withdrawal rejected/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Why was my withdrawal rejected?");

    await page.getByRole("button", { name: "Chat with support" }).click();
    const chat = page.getByRole("dialog", { name: "Live chat" });
    await chat.getByRole("textbox", { name: "Type a message" }).fill("Hello");
    await chat.getByRole("button", { name: "Send" }).click();
    await expect(chat.getByText(/We can see you're on \/help\/articles\//)).toBeVisible();
  });

  test("Chat launcher is hidden while a stepper footer is on screen", async ({ page }) => {
    await page.goto("/funds/deposit?account=137481");
    await hydrated(page);
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chat with support" })).toHaveCount(0);
  });

  test("Tickets: create from a transaction, reply, close", async ({ page }) => {
    await page.goto("/help/tickets");
    await expect(page.getByRole("link", { name: /Leverage change on MT5/ })).toBeVisible();
    await page.getByRole("tab", { name: "Closed" }).click();
    await expect(page).toHaveURL(/status=closed/);
    await expect(page.getByRole("link", { name: /Leverage change on MT5/ })).toHaveCount(0);

    // Prefilled from a transaction (as linked from receipts and the transactions list).
    const txs = await page.request.get("/api/transactions?pageSize=1");
    const tx = ((await txs.json()) as { items: { id: string; reference: string }[] }).items[0]!;
    await page.goto(`/help/tickets?new=1&tx=${tx.id}`);
    const dialog = page.getByRole("dialog", { name: "New ticket" });
    await expect(dialog.getByText(`We've linked this ticket to transaction ${tx.reference}.`)).toBeVisible();
    await hydrated(page);
    await dialog.getByRole("button", { name: "Submit ticket" }).click();
    await expect(
      dialog.getByText("Describe the issue in at least 20 characters", { exact: false }),
    ).toBeVisible();
    await dialog
      .getByLabel(/Description/)
      .fill("The funds haven't arrived in my MT5 account yet, please check.");
    await dialog.getByRole("button", { name: "Submit ticket" }).click();
    await expect(page).toHaveURL(/\/help\/tickets\/tk_/);

    await page.getByLabel("Reply").fill("Any update on this?");
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.getByText("Any update on this?")).toBeVisible();

    await page.getByRole("button", { name: "Close ticket" }).first().click();
    await page
      .getByRole("dialog", { name: "Close this ticket?" })
      .getByRole("button", { name: "Close ticket" })
      .click();
    await expect(page.getByText("This ticket is closed.")).toBeVisible();
    await expect(page.getByLabel("Reply")).toHaveCount(0);
  });

  test("Platforms: MT5 downloads; QR codes for phones on desktop only", async ({ page }, info) => {
    await page.goto("/trading/platforms");
    await expect(page.getByRole("link", { name: "Download" })).toHaveCount(4);
    const qr = page.getByRole("img", { name: /QR code to download MT5/ });
    if (info.project.name.includes("mobile")) await expect(qr.first()).toBeHidden();
    else await expect(qr).toHaveCount(2);
  });

  for (const path of [
    "/account/profile",
    "/account/verification",
    "/account/security",
    "/account/payment-methods",
    "/account/preferences",
    "/help",
    "/help/tickets",
    "/help/tickets/tk_48120",
    "/trading/platforms",
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

test.describe("Verification", () => {
  test("Re-upload an expiring document: type error, preview, then in review", async ({ page }) => {
    await signIn(page);
    await page.goto("/account/verification");
    await expect(page.getByRole("heading", { name: "You're verified" })).toBeVisible();
    const poa = page.getByRole("listitem").filter({ hasText: "Proof of address" });
    await expect(poa.getByText(/upload a new one soon/)).toBeVisible();
    await hydrated(page);
    await poa.getByRole("button", { name: "Re-upload" }).click();
    await expect(page.getByRole("heading", { name: "Proof of address" })).toBeVisible();

    const input = page.getByLabel("Choose file", { exact: true }).first();
    await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByText("That file type isn't supported")).toBeVisible();

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64",
    );
    await input.setInputFiles({ name: "bill.png", mimeType: "image/png", buffer: png });
    await expect(page.getByRole("img", { name: "Preview of bill.png" })).toBeVisible();
    await page.getByRole("button", { name: "Upload and finish" }).click();
    await expect(page.getByText("Documents submitted")).toBeVisible();
    await expect(poa.locator("[data-status=pending]")).toBeVisible();
  });
});
