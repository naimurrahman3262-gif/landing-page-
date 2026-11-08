# Audit traceability

Maps every audit issue ID to the component/route that fixes it. Filled in phase by phase and completed in Phase 8.

| ID          | Issue (short)                      | Fixed in                                                                                                        | Status           |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------- |
| G1          | Footer placeholder address / legal | `src/config/legal.ts` (null-safe config), `Footer` (Phase 3)                                                    | Config done      |
| G2          | Per-route `<title>`                | Root `generateMetadata` template `%s — WinproFX` (`src/app/layout.tsx`)                                         | Done             |
| G4          | Brand name hand-typed              | `src/config/brand.ts` (`BRAND`, `pageTitle`)                                                                    | Done             |
| G5–G8       | Mixed money/ID/date formats        | `src/lib/format.ts` + `tests/unit/format.test.ts`, `MoneyText`, `StatusBadge`                                   | Done             |
| G9          | Dialog a11y                        | `ui/dialog.tsx`, `ui/sheet.tsx` (Radix); e2e: Escape + focus return                                             | Done             |
| G10         | Labels/contrast                    | Token contrast unit test; axe e2e on the style guide in both themes                                             | Foundations done |
| G13         | Inconsistent headers               | `common/page-header.tsx`                                                                                        | Component done   |
| G16         | Empty icon containers              | `EmptyState` requires a lucide icon                                                                             | Component done   |
| G11         | Live-chat launcher                 | `help/chat-launcher.tsx`, `stores/ui.ts`, `StickyActionBar` (Phase 6); e2e: never auto-opens, hidden in stepper | Done             |
| G3, G17–G20 | —                                  | Phases 3–8                                                                                                      | Pending          |
| 0.1–11.12   | Flow-level issues                  | Need the full audit table (ask per flow)                                                                        | Pending          |

## Flow 10: Help (Phase 6)

| Brief §6.9 item                                                                | Fixed in                                                                                      | Test                                                   |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Greeting with the real first name (old "John Trader")                          | `help/help-view.tsx` (`useUser`)                                                              | e2e `account.spec.ts` "Help: real first name…"         |
| Search with the button inside the input                                        | `help/help-view.tsx` (`?q=` in the URL)                                                       | same                                                   |
| Popular articles, categories, quick actions, `tel:`/`mailto:` cards            | `help/help-view.tsx`, `help/article-view.tsx`; contact cards read `LEGAL` (hidden while null) | a11y + overflow e2e                                    |
| Tickets: status tabs only, search, real data or empty state (old demo tickets) | `help/tickets-view.tsx`                                                                       | e2e "Tickets: create from a transaction, reply, close" |
| Ticket thread, reply, attachments, close                                       | `help/ticket-detail-view.tsx`                                                                 | same                                                   |
| New ticket dialog, required marks, prefilled from a transaction                | `help/new-ticket-dialog.tsx`                                                                  | same                                                   |
| Live chat with page context                                                    | `help/chat-launcher.tsx`                                                                      | e2e "Help: … chat launcher never auto-opens"           |

## Flow 11: Account (Phase 6)

| Brief §6.10 item                                                                        | Fixed in                                                                                                                 | Test                                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| KYC-locked fields with lock + "Contact support to change"; "Save changes"; completion % | `account/profile-view.tsx`; BFF rejects locked fields                                                                    | e2e "Profile: KYC fields locked…"                            |
| Country → state → postcode validation                                                   | `config/regions.ts`, `profile-view.tsx`                                                                                  | same                                                         |
| One status card + document list with expiry and re-upload; upload wizard                | `account/verification-view.tsx`                                                                                          | e2e "Re-upload an expiring document…"                        |
| 2FA on via QR + backup codes; off needs OTP                                             | `account/security-view.tsx`                                                                                              | e2e "turn off 2FA…", "turn 2FA back on…"                     |
| Password change with rule checklist; sessions; login history                            | `account/security-view.tsx`                                                                                              | e2e "password change… sign out other devices"                |
| One payment-method list, default badge, one status vocabulary, ownership rule           | `account/payment-methods-view.tsx`, `funds/payout-method-sheet.tsx`                                                      | e2e "Payment methods…"                                       |
| Preferences incl. sound (old "Audio feedback")                                          | `account/preferences-view.tsx`                                                                                           | e2e "Preferences…"                                           |
| Platforms moved from Settings; no marketing claims                                      | `trading/platforms-view.tsx`                                                                                             | e2e "Platforms…"                                             |
| Step-up on every sensitive action (appendix: MT5 password change without step-up)       | `common/step-up-auth-dialog.tsx` on MT5 password, leverage, withdrawal, add payout, remove payout, 2FA off, email change | e2e in `trading.spec.ts`, `funds.spec.ts`, `account.spec.ts` |

## Flow 9: Insights (Phase 7)

| Brief §6.6 item                                                                        | Fixed in                                             | Test                                          |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Only enabled modules appear                                                            | `config/features.ts`, `lib/nav.ts`, `ComingSoon`     | e2e "Feature flags…"                          |
| News: feed first, filters in a top bar, settings in a sheet, dark TradingView timeline | `insights/news-view.tsx`                             | e2e "News…"                                   |
| Sentiment only with source + timestamp                                                 | `SentimentCard` in `news-view.tsx`                   | e2e "News…"                                   |
| Signals: two panes / sheet, icon + text + colour, legend, search, groups, favourites   | `insights/signals-view.tsx`                          | e2e "Signals…"                                |
| Analysis: Autochartist in EmbedFrame with an error state                               | `insights/analysis-view.tsx`, `embeds/*`             | e2e "Analysis…", "Embed timeout…"             |
| Native calculators with validated inputs                                               | `insights/calculator-view.tsx`, `lib/calculators.ts` | unit `calculators.test.ts`, e2e "Calculator…" |

## Flow 7: Invest (Phase 7)

| Brief §6.7 item                                                            | Fixed in                                         | Test                              |
| -------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| Plain intro, risk line, no profit promises                                 | `invest/invest-view.tsx`                         | e2e "Invest…"                     |
| Full-height embed via SSO handoff; Refresh · Full screen · Open in new tab | `embeds/sso-embed.tsx`, `embeds/embed-frame.tsx` | e2e "Analysis…", "Embed timeout…" |

## Flow 8: Rewards (Phase 7)

| Brief §6.8 item                                                                       | Fixed in                                         | Test                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------ |
| Hero: link, Copy, Share (WhatsApp, Telegram, X, email), QR; How it works with amounts | `rewards/referrals-view.tsx`, `lib/referrals.ts` | unit `referrals.test.ts`, e2e "Referrals…" |
| Monotonic funnel, validated in the mock, flagged in dev                               | `funnelViolations`, `mocks/handlers/insights.ts` | unit `referrals.test.ts`                   |
| Earnings as money; one status model with a next-step column                           | `referrals-view.tsx`                             | e2e "Referrals…"                           |
| Campaign ended state ("Ended 24 Oct 2026")                                            | `CampaignCard`                                   | e2e "Referrals…"                           |
| Campaign accounts badged in Trading → Accounts                                        | `trading/account-card.tsx` (Phase 4)             | Phase 4 e2e                                |
