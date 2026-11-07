import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("scaffold page renders with the mock API reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Project setup — WinproFX");
  await expect(page.getByTestId("api-health")).toHaveAttribute("data-status", "success", { timeout: 10_000 });
});

test("no serious or critical axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("api-health")).toHaveAttribute("data-status", "success", { timeout: 10_000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking).toEqual([]);
});
