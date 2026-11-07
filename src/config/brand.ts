/** G4: the brand name is never hand-typed. Import this constant. */
export const BRAND = "WinproFX" as const;

/** G2: every route title follows "{Page} — WinproFX". */
export function pageTitle(page: string): string {
  return `${page} — ${BRAND}`;
}
