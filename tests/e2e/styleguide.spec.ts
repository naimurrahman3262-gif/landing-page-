import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["dark", "light"] as const) {
  test(`style guide has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await page.goto("/dev/components");
    await expect(page).toHaveTitle("Components — WinproFX");
    if (theme === "light") await page.getByRole("radio", { name: "Light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const blocking = results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5) }));
    expect(blocking).toEqual([]);
  });
}

test("dialog: focus trapped, Escape closes, focus returns to the trigger (G9)", async ({ page }) => {
  await page.goto("/dev/components");
  const trigger = page.getByRole("button", { name: "Dialog (scrolling body)" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Change leverage" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("no horizontal scroll on the style guide", async ({ page }) => {
  await page.goto("/dev/components");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
