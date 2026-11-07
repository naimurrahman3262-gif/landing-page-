import type { Page } from "@playwright/test";

export const VERIFIED = "verified@winprofx.test";
export const NEW_USER = "new@winprofx.test";
export const PASSWORD = "Winpro#2026";
export const CODE = "123456";

/** Signs in through the BFF (fast path for tests that aren't about login). */
/** A private copy of the verified persona (own mock data), unless an email is given. */
export const isolatedVerified = () =>
  `verified+${Date.now()}${Math.floor(Math.random() * 1e6)}@winprofx.test`;

export async function signIn(page: Page, email = isolatedVerified()) {
  await page.goto("/login");
  const csrf = (await page.context().cookies()).find((c) => c.name === "wpx_csrf")!.value;
  const headers = { "x-csrf-token": csrf, origin: new URL(page.url()).origin };
  const login = await page.request.post("/api/auth/login", { headers, data: { email, password: PASSWORD } });
  const { step } = (await login.json()) as { step: string };
  if (step === "2fa") {
    await page.request.post("/api/auth/2fa", { headers, data: { method: "totp", code: CODE } });
  }
}

/** The form's own alert (Next's route announcer also has role="alert"). */
export function formAlert(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)').filter({ hasText: /\S/ });
}

/** Press Tab until `target` has focus (keyboard-only paths, brief §11). */
export async function tabTo(page: Page, target: import("@playwright/test").Locator, max = 60) {
  // Data-driven controls may still be loading: wait until the target exists first.
  await target.waitFor({ state: "visible", timeout: 15_000 });
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("tabTo: target never received focus");
}

/** Wait until React has hydrated (Providers sets <html data-hydrated>). */
export async function hydrated(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: "attached", timeout: 30_000 });
}
