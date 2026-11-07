import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CODE, formAlert, hydrated, signIn, tabTo } from "./helpers";

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 3) }));
}

test.describe("Funds (verified persona)", () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test("Deposit: keyboard only, steps in the URL, server review, handoff", async ({ page }) => {
    test.slow();
    await page.goto("/funds/deposit?account=137481");
    await expect(page.getByRole("button", { name: /Main/ })).toBeVisible(); // preselected from ?account=
    await expect(page).toHaveTitle("Deposit — WinproFX");
    await hydrated(page);

    await tabTo(page, page.getByRole("button", { name: "Continue" }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/step=how/);
    await expect(page.getByText("Instant – 30 min").first()).toBeVisible(); // ETA as real text

    await tabTo(page, page.getByRole("radio", { name: /USDT \(TRC20\)/ }));
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: /USDT \(TRC20\)/ })).toHaveAttribute("aria-checked", "true");
    await tabTo(page, page.getByRole("button", { name: "Continue" }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/step=amount/);

    await tabTo(page, page.getByLabel("Amount", { exact: true }));
    await page.keyboard.type("20");
    await expect(
      page.getByText("Below the $50.00 minimum for USDT (TRC20). Enter $50.00 or more."),
    ).toBeVisible();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("250");
    await expect(page.getByText("You'll receive")).toBeVisible();
    const cta = page.getByRole("button", { name: "Continue — $250.00 via USDT (TRC20)" });
    await expect(cta).toBeEnabled();
    await tabTo(page, cta);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/funds\/deposit\/status\/tx_/);
    await expect(page.getByText("Deposit address")).toBeVisible();
    await expect(page.getByRole("img", { name: "QR code for the deposit address" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Only send USDT on TRON (TRC20)");
    await expect(page.getByText("Completed").first()).toBeVisible({ timeout: 40_000 }); // self-updating
    expect(await axe(page)).toEqual([]);
  });

  test("Deposit: methods filtered by country, Show all, deposit-only note", async ({ page }) => {
    await page.goto("/funds/deposit?step=how");
    await expect(page.getByText("Showing methods for Bangladesh.")).toBeVisible();
    await expect(page.getByRole("radio", { name: /BDT Pay/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /UPI · PayGate/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Show all methods" }).click();
    await expect(page.getByRole("radio", { name: /UPI · PayGate/ })).toBeVisible();
    await expect(page.getByText("Min $50.00 · Max $10,000.00 · ≈ ₹4,200")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("Deposit error path: backend failure shows what happened, nothing moves", async ({ page }) => {
    await page.goto("/funds/deposit?step=amount&method=usdt-trc20&amount=100&mockError=deposit");
    await page.getByRole("button", { name: "Continue — $100.00 via USDT (TRC20)" }).click();
    await expect(formAlert(page)).toContainText("Try again");
    await expect(page).toHaveURL(/step=amount/);
  });

  test("Withdraw: Fix and retry prefill → keyboard review → step-up → status", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Fix and retry/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/funds\/withdraw.*step=amount/);
    await expect(
      page.getByText("Below the $10.00 minimum for USDT (TRC20). Enter $10.00 or more."),
    ).toBeVisible();
    await expect(page.getByText(/Left after withdrawal/)).toBeVisible();

    const amount = page.getByLabel("Amount", { exact: true });
    await amount.focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("15");
    const cont = page.getByRole("button", { name: "Continue" });
    await expect(cont).toBeEnabled();
    await tabTo(page, cont);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/step=review/);
    await expect(page.getByText("You'll receive")).toBeVisible();
    await tabTo(page, page.getByRole("button", { name: "Withdraw $15.00" }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Confirm it's you" })).toBeVisible();
    await page.keyboard.type(CODE);
    await expect(page).toHaveURL(/\/funds\/withdraw\/status\/tx_/);
    await expect(page.getByText("The amount is held from your balance while we process it.")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("Withdraw: $0 sources disabled with reason; unverified payout not usable; deposit-only explained", async ({
    page,
  }) => {
    await page.goto("/funds/withdraw");
    await expect(page.getByText(/excluding credit and open profit/)).toBeVisible();
    await page.getByRole("button", { name: /Wallet/ }).click();
    const zero = page.getByRole("radio", { name: /MT5 · 137502/ });
    await expect(zero).toHaveAttribute("aria-disabled", "true");
    await expect(zero).toContainText("Nothing available to move.");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("radio", { name: /MetaMask/ })).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("$10.00–$20,000.00 · Fee $1.00 · 1–24 hours")).toBeVisible(); // limits shown
    await page.getByText("Deposit-only methods").click();
    await expect(page.getByText(/UPI can only be used to deposit/).first()).toBeVisible();
  });

  test("Add payout method: ownership rule enforced, step-up, then pending", async ({ page }) => {
    await page.goto("/funds/withdraw?step=to");
    await page.getByRole("button", { name: "Add payout method" }).first().click();
    const sheet = page.getByRole("dialog", { name: "Add payout method" });
    await expect(sheet).toContainText("must match your verified name: Rahim Chowdhury");
    await sheet.getByLabel(/Account holder name/).fill("Someone Else");
    await sheet.getByLabel(/Bank name/).fill("SBI");
    await sheet.getByLabel(/Account number/).fill("123456789012");
    await sheet.getByLabel(/IFSC/).fill("SBIN0001234");
    await sheet.getByRole("button", { name: "Add payout method" }).click();
    await expect(sheet.getByText("The account name must match your verified name exactly.")).toBeVisible();
    await sheet.getByLabel(/Account holder name/).fill("Rahim Chowdhury");
    await sheet.getByRole("button", { name: "Add payout method" }).click();
    await expect(page.getByRole("dialog", { name: "Confirm it's you" })).toBeVisible();
    await page.keyboard.type(CODE);
    await expect(page.getByText("Payout method added. We'll verify it shortly.")).toBeVisible();
    await expect(page.getByRole("radio", { name: /SBI/ }).first()).toContainText("Pending");
  });

  test("Transfer: keyboard path, live new balances, irreversible confirm", async ({ page }) => {
    await page.goto("/funds/transfer");
    await hydrated(page);
    await tabTo(page, page.getByRole("button", { name: /Choose account/ }));
    await page.keyboard.press("Enter");
    await tabTo(page, page.getByRole("radio", { name: /Scalping/ }));
    await page.keyboard.press("Enter");
    await tabTo(page, page.getByLabel("Amount", { exact: true }));
    await page.keyboard.type("25");
    await expect(page.getByText(/New balance/)).toHaveCount(2);
    await tabTo(page, page.getByRole("button", { name: "Review transfer" }));
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Confirm transfer" });
    await expect(dialog).toContainText("Transfers are instant and can't be reversed.");
    await dialog.getByRole("button", { name: "Confirm transfer" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("$25.00 moved to Scalping")).toBeVisible();
    await expect(page.getByText("Sending to another client is coming soon.")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("Transfer error path: too much is refused before anything moves", async ({ page }) => {
    await page.goto("/funds/transfer?to=137481&amount=99999999");
    await expect(page.getByText(/You can move up to/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Review transfer" })).toBeDisabled();
  });

  test("Transactions: filters in URL, approved-only summary, details sheet, receipt rule", async ({
    page,
  }, info) => {
    await page.goto("/funds/transactions?range=all");
    await expect(page.getByText("Approved deposits · All time")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Pagination" })).toContainText("…");

    await page.getByRole("button", { name: "Rejected", exact: true }).click();
    await expect(page).toHaveURL(/status=rejected/);
    await expect(page.getByText("Fix and retry").filter({ visible: true }).first()).toBeVisible();

    await page.getByRole("radio", { name: "Today" }).click();
    await expect(page).toHaveURL(/range=today/);
    await expect(page.getByText(/Approved deposits · Today/)).toBeVisible();

    await page.goto("/funds/transactions?range=all&status=rejected");
    if (info.project.name === "mobile-375") {
      // Mobile: stacked cards, each with its own "Open details" button.
      await page
        .getByRole("button", { name: /^Open details: / })
        .first()
        .click();
    } else {
      await page
        .getByRole("button", { name: /Actions for / })
        .first()
        .click();
      await page.getByRole("menuitem", { name: "Open details" }).click();
    }
    const sheet = page.getByRole("dialog", { name: "Transaction details" });
    await expect(sheet.getByText("Timeline")).toBeVisible();
    await expect(sheet.getByText("Receipts are available for completed transactions.")).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Contact support" })).toHaveAttribute(
      "href",
      /\/help\/tickets\?new=1&tx=tx_/,
    );
    await page.keyboard.press("Escape");
    expect(await axe(page)).toEqual([]);
  });
});

test("Withdraw is gated until identity is verified", async ({ page }) => {
  await page.goto("/login");
  const csrf = (await page.context().cookies()).find((c) => c.name === "wpx_csrf")!.value;
  const headers = { "x-csrf-token": csrf, origin: new URL(page.url()).origin };
  await page.request.post("/api/auth/register", {
    headers,
    data: {
      firstName: "Gate",
      lastName: "Test",
      email: `gate+${Date.now()}@example.com`,
      password: "Winpro#2026",
      country: "IN",
      acceptTerms: true,
    },
  });
  await page.request.post("/api/auth/verify-email", { headers, data: { code: CODE } });
  await page.goto("/funds/withdraw");
  await expect(page.getByText("Verify your identity to withdraw")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start verification" })).toHaveAttribute(
    "href",
    "/account/verification",
  );
});
