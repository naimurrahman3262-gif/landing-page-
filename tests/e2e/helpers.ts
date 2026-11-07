import type { Page } from "@playwright/test";

export const VERIFIED = "verified@winprofx.test";
export const NEW_USER = "new@winprofx.test";
export const PASSWORD = "Winpro#2026";
export const CODE = "123456";

/** Signs in through the BFF (fast path for tests that aren't about login). */
export async function signIn(page: Page, email = VERIFIED) {
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
