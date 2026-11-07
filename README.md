# WinproFX client portal

Next.js 15 (App Router) rebuild of `my.winprofx.com`. The build brief is the source of truth for behaviour; `docs/` tracks the design inventory, decisions and audit traceability.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional — .env.development already enables mocks
pnpm dev                     # http://localhost:3000
```

With `NEXT_PUBLIC_API_MOCKING=enabled`, BFF route handlers (`src/app/api/*`) call `BACKEND_URL`, which MSW intercepts (`src/mocks`). Append `?mockError=<domain>` to force an error from a mocked domain.

## Scripts

| Script                         | What it does                      |
| ------------------------------ | --------------------------------- |
| `pnpm dev`                     | Dev server (Turbopack)            |
| `pnpm build` / `pnpm start`    | Production build / serve          |
| `pnpm lint`                    | ESLint (next + jsx-a11y strict)   |
| `pnpm typecheck`               | `tsc --noEmit`                    |
| `pnpm format` / `format:check` | Prettier                          |
| `pnpm test`                    | Vitest unit tests                 |
| `pnpm test:e2e`                | Playwright (375 + 1440) incl. axe |
| `pnpm check`                   | lint + typecheck + unit tests     |

## Layout

```
src/app/            routes — (auth), (portal), api/ (BFF), dev/
src/components/     ui, shell, funds, trading, common
src/config/         brand, features, legal, nav
src/lib/            format, api client, auth, utils
src/mocks/          MSW handlers + fixtures (mock data lives only here)
src/styles/         tokens.css, globals.css
messages/en.json    all UI copy (next-intl)
docs/               design-inventory, decisions, audit-traceability
tests/              unit (Vitest), e2e (Playwright)
```
