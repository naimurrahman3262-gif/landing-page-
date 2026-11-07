# Audit traceability

Maps every audit issue ID to the component/route that fixes it. Filled in phase by phase and completed in Phase 8.

| ID               | Issue (short)                      | Fixed in                                                                      | Status           |
| ---------------- | ---------------------------------- | ----------------------------------------------------------------------------- | ---------------- |
| G1               | Footer placeholder address / legal | `src/config/legal.ts` (null-safe config), `Footer` (Phase 3)                  | Config done      |
| G2               | Per-route `<title>`                | Root `generateMetadata` template `%s — WinproFX` (`src/app/layout.tsx`)       | Done             |
| G4               | Brand name hand-typed              | `src/config/brand.ts` (`BRAND`, `pageTitle`)                                  | Done             |
| G5–G8            | Mixed money/ID/date formats        | `src/lib/format.ts` + `tests/unit/format.test.ts`, `MoneyText`, `StatusBadge` | Done             |
| G9               | Dialog a11y                        | `ui/dialog.tsx`, `ui/sheet.tsx` (Radix); e2e: Escape + focus return           | Done             |
| G10              | Labels/contrast                    | Token contrast unit test; axe e2e on the style guide in both themes           | Foundations done |
| G13              | Inconsistent headers               | `common/page-header.tsx`                                                      | Component done   |
| G16              | Empty icon containers              | `EmptyState` requires a lucide icon                                           | Component done   |
| G3, G11, G17–G20 | —                                  | Phases 3–8                                                                    | Pending          |
| 0.1–11.12        | Flow-level issues                  | Need the full audit table (ask per flow)                                      | Pending          |
