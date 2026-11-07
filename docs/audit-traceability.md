# Audit traceability

Maps every audit issue ID to the component/route that fixes it. Filled in phase by phase and completed in Phase 8.

| ID         | Issue (short)                      | Fixed in                                                                | Status      |
| ---------- | ---------------------------------- | ----------------------------------------------------------------------- | ----------- |
| G1         | Footer placeholder address / legal | `src/config/legal.ts` (null-safe config), `Footer` (Phase 3)            | Config done |
| G2         | Per-route `<title>`                | Root `generateMetadata` template `%s — WinproFX` (`src/app/layout.tsx`) | Done        |
| G4         | Brand name hand-typed              | `src/config/brand.ts` (`BRAND`, `pageTitle`)                            | Done        |
| G3, G5–G20 | —                                  | Phases 2–8                                                              | Pending     |
| 0.1–11.12  | Flow-level issues                  | Need the full audit table (ask per flow)                                | Pending     |
