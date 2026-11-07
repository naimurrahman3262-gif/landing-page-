# Design inventory

_Phase 1 · inspected 7 Nov 2026 · source: Figma file `j0OCCw9EOSmuNzH8VIKcNe` ("WinproFx"), via the Figma MCP. `/design-refs/` in the repo is empty._

## 1. Summary

**The Figma file is an inspiration moodboard. It has no WinproFX screens.** It holds 175 screenshots of other products (Pinterest, Cosmos and Mobbin captures of Coinbase, Binance, Kraken, Gemini, OKX, OpenSea, Uniswap and others), grouped by theme. It has no frames for WinproFX pages, no components and no Figma variables or styles.

What that means for the build:

- I **can't "implement the visuals faithfully"** (brief §0, job 1), because no WinproFX visuals exist yet. The moodboard gives a direction, not a spec.
- I **can't extract tokens** from it (brief §2.2). `get_variable_defs` returns `{}`. Sampling the screenshots only gives the average look of other brands.
- Under brief §2.3, **every screen in §6 is currently a gap**. Each one would be "designed by Claude — needs review" unless you add real refs.

This is the main open question (Q1 below).

## 2. What the file contains

Page 1 has two top-level frames:

| Frame                                     | Node  | Size        | Contents                                                     |
| ----------------------------------------- | ----- | ----------- | ------------------------------------------------------------ |
| WinproFx — Dark Fintech Moodboard         | `3:2` | 2440 × 8736 | 116 refs ("Pinterest ref n" / "Cosmos ref n"), in 5 sections |
| WinproFx — Mobbin Trading · Crypto · Web3 | `4:2` | 2440 × 3761 | 59 Mobbin screens of shipped products, in 3 sections         |

| Section                             | Count | Typical content                                                                      |
| ----------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| Trading dashboards                  | 48    | Dark dashboards: KPI tiles, area/line charts, donut gauges, watchlists, sidebars     |
| Crypto web apps                     | 29    | Portfolio overviews, asset tables, swap/buy widgets, candlestick charts              |
| Fintech                             | 14    | Balance cards, spending charts, card management, transaction lists                   |
| SaaS dashboards                     | 14    | Analytics layouts, bar charts, dense tables, settings                                |
| Prop firm & trading platforms       | 11    | Marketing heroes, challenge dashboards, a mobile app                                 |
| Mobbin · Trading terminals          | 29    | Order books, order tickets, chart terminals (Coinbase, Binance, Kraken, Gemini, OKX) |
| Mobbin · Crypto portfolio & markets | 16    | Portfolio home, asset detail, markets lists (some light theme)                       |
| Mobbin · Web3, DeFi & swap          | 14    | Swap/convert flows, wallet connect, NFT views                                        |

Each ref is a flat image (`rounded-rectangle` with an image fill). None has layers I can inspect for spacing, type or exact colours.

> These are screenshots of other companies' products. Brief §2 and the build rules say to match the refs exactly. For third-party refs I'll treat them as **direction only**: I'll follow the patterns (KPI strip, sidebar, dense tables) but won't copy any product's layout, brand marks or illustrations.

## 3. Token findings (direction only, not extracted values)

I quantised the colours of both frames. These figures are approximate averages across many brands, so they can't serve as a source of truth.

| Observation         | Value(s)                                                             | vs. brief §3 placeholders                                                 |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Dominant background | near-neutral black `#0A0A0C` (~40% of pixels)                        | Brief uses **navy** `#0B1020` → ⚠ differs                                 |
| Card surfaces       | `#131417`, `#16181C`, `#191B20`, `#19181B` (neutral, low saturation) | Brief uses navy `#121931` / `#1A2240` → ⚠ differs                         |
| Borders/dividers    | ~`#28262B`, `#2E2F33`, `#363A41`                                     | Brief `#2A3458` (blue-tinted) → ⚠ differs                                 |
| Muted text          | ~`#788387`, `#797D83`                                                | Close to brief `--text-3` in lightness, but neutral not blue              |
| Accent colours      | lime/neon green, electric blue, violet. **Cyan rarely appears**      | Primary is fixed at `#00D9FF` (brief). Not a conflict, just no ref for it |
| Radius              | Cards look ~12–20px; pills on chips and buttons                      | Matches the brief's `--radius-md/lg/xl` range                             |
| Type                | Mostly geometric grotesques; large bold numerals for balances        | Satoshi + Inter are fixed by the brief, so this is consistent             |
| Charts              | Smooth area charts with gradient fills, thin gridlines, few ticks    | Matches brief §6.4 (line/area, max 6 ticks)                               |

**Conflict to resolve (brief §0: "ask me"):** the moodboard leans **neutral black/graphite**, while the brief's placeholder palette is **navy**. Phase 2 needs one of these:

- (a) neutral graphite surfaces + cyan primary,
- (b) the navy set from the brief,
- (c) real WinproFX token refs.

Until then, `src/styles/tokens.css` uses the brief's placeholders, marked `PLACEHOLDER`.

## 4. Components identifiable in the moodboard (pattern level)

App sidebar with grouped nav · top bar with search, bell and avatar · KPI/stat tiles with delta · balance hero card · area/line chart cards with range tabs (1D/7D/1M…) · donut/gauge (margin level) · asset/watchlist rows with icon + sparkline · dense data tables with status pills · segmented controls / tabs · buy/sell order ticket · swap/convert card with ⇅ button · stepper-less forms (most refs are dashboards, not flows) · notification toasts · mobile bottom tab bar (prop-firm mobile ref).

**Not present anywhere in the refs:** auth screens, deposit/withdraw/transfer steppers, method cards, review summaries, account cards with MT5 data, KYC upload, tickets/help, referral funnel, empty/error/loading states, light theme, and mobile versions of portal pages.

## 5. Gap list: every screen in brief §6

Key: **Gap** = no ref; it will be composed from shared components and flagged "designed by Claude — needs review". **Pattern** = the moodboard has a similar pattern from another product (direction only).

| Area     | Route / dialog                                                                                                              | Ref status                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Auth     | `/login` (+ `#email-code`, `#qr`, `#telegram`), `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/2fa` | Gap                                                  |
| Home     | `/` portfolio overview, alerts rail, onboarding checklist                                                                   | Pattern (portfolio dashboards)                       |
| Trading  | `/trading/accounts` (grid + table), `/trading/accounts/[login]`, `/trading/accounts/new`                                    | Gap (account cards: no pattern)                      |
| Trading  | Rename label, Change leverage, Change MT5 password dialogs                                                                  | Gap                                                  |
| Trading  | `/trading/positions` KPIs, charts, tables                                                                                   | Pattern (KPI row, area charts, tables)               |
| Trading  | `/trading/platforms`                                                                                                        | Gap                                                  |
| Funds    | `/funds/deposit` (3 steps), `/funds/deposit/status/[id]`                                                                    | Gap (swap card is a loose pattern for amount entry)  |
| Funds    | `/funds/withdraw` (4 steps), status page, add payout method sheet                                                           | Gap                                                  |
| Funds    | `/funds/transfer` + review dialog                                                                                           | Pattern (swap/convert ⇅)                             |
| Funds    | `/funds/transactions` + details sheet                                                                                       | Pattern (dense tables, status pills)                 |
| Insights | `/insights/news`, `/insights/signals`, `/insights/analysis`, `/insights/calculator`                                         | Gap (watchlist rows are a loose pattern for signals) |
| Invest   | `/invest/social`, `/invest/pamm`                                                                                            | Gap                                                  |
| Rewards  | `/rewards/referrals`, `/rewards/trading` (coming soon)                                                                      | Gap                                                  |
| Help     | `/help`, `/help/tickets`, `/help/tickets/[id]`, `/help/articles/[slug]`, New ticket dialog                                  | Gap                                                  |
| Account  | `/account/profile`, `/verification`, `/security`, `/payment-methods`, `/preferences`                                        | Gap                                                  |
| Global   | Notifications centre, ⌘K search, profile menu, footer, chat launcher, coming-soon page                                      | Pattern (top bar only)                               |
| Global   | Step-up auth dialog, confirm dialog, empty/error/loading states                                                             | Gap                                                  |
| Theme    | Light theme (required, brief §3)                                                                                            | Gap (only a few light Mobbin shots)                  |
| Mobile   | All portal pages at 320–768px                                                                                               | Gap (`mobile/` refs not supplied)                    |

**Totals:** 0 of ~33 pages and 0 of ~18 dialogs have a WinproFX ref. About 8 have a usable pattern-level reference.

## 6. What I need to close the gaps

See "Open questions" in the Phase 1 summary (also in `docs/decisions.md`). The most useful thing would be one of:

1. Figma frames of real WinproFX screens, even 3–4 key ones (login, home, account card, deposit step 2), plus a token/style page; **or**
2. Your go-ahead for me to set the visual language myself from this moodboard, starting with Phase 2 tokens and the `/dev/components` style guide for you to sign off before any screens are built.
