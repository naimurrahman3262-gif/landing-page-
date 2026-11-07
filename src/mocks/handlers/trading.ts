import { http, HttpResponse } from "msw";
import {
  ChangeLeverageInput,
  ChangeMt5PasswordInput,
  OpenAccountInput,
  RenameAccountInput,
  type Account,
  type Deal,
} from "@/lib/api/schemas";
import { ACCOUNT_TYPES, SERVER_DEMO, SERVER_LIVE, withMargin } from "../fixtures/accounts";
import { dealNet } from "../fixtures/deals";
import { round2 } from "../fixtures/random";
import { DEMO_CODE } from "../fixtures/users";
import { db, newId, portfolio } from "../store";
import { BACKEND_URL, assertInvariant, forcedError, mockLatency } from "../utils";
import { maskEmail, sessionUser } from "./auth";

const json = (body: unknown, status = 200) => HttpResponse.json(body as object, { status });
const fail = (status: number, code: string, message: string) => json({ code, message }, status);
const unauth = () => fail(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");

type Guard = { user: NonNullable<ReturnType<typeof sessionUser>>["user"] };

async function guard(request: Request, domain: string): Promise<Guard | Response> {
  await mockLatency();
  const forced = forcedError(request, domain);
  if (forced) return forced;
  const s = sessionUser(request);
  return s ? { user: s.user } : unauth();
}

function findAccount(userId: string, login: number): Account | undefined {
  return portfolio(userId).accounts.find((a) => a.login === login);
}

/** Step-up token from the `x-step-up` header: valid, unexpired, this user, single use. */
function consumeStepUp(request: Request, userId: string): boolean {
  const token = request.headers.get("x-step-up");
  const entry = token ? db().stepUp.get(token) : undefined;
  if (!entry || entry.userId !== userId || entry.expiresAt < Date.now()) return false;
  db().stepUp.delete(token!);
  return true;
}

function replaceAccount(userId: string, next: Account) {
  const p = portfolio(userId);
  p.accounts = p.accounts.map((a) => (a.login === next.login ? next : a));
}

/** Range → [fromMs, toMs]. Accepts 7d/30d/90d or from/to (YYYY-MM-DD, inclusive, UTC days). */
function parseRange(url: URL, now = Date.now()): [number, number] {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from && to) return [Date.parse(`${from}T00:00:00Z`), Date.parse(`${to}T23:59:59.999Z`)];
  const days = { "7d": 7, "30d": 30, "90d": 90 }[url.searchParams.get("range") ?? "30d"] ?? 30;
  const start = new Date(now - (days - 1) * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  return [start.getTime(), now];
}

const A = `${BACKEND_URL}/accounts`;

export const tradingHandlers = [
  http.get(`${BACKEND_URL}/account-types`, async ({ request }) => {
    const g = await guard(request, "accountTypes");
    if (g instanceof Response) return g;
    return json({ items: ACCOUNT_TYPES });
  }),

  http.get(A, async ({ request }) => {
    const g = await guard(request, "accounts");
    if (g instanceof Response) return g;
    const p = portfolio(g.user.id);
    return json({ items: p.accounts, syncedAt: p.syncedAt });
  }),

  http.post(A, async ({ request }) => {
    const g = await guard(request, "openAccount");
    if (g instanceof Response) return g;
    const parsed = OpenAccountInput.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(422, "VALIDATION", "Some fields need attention.");
    const input = parsed.data;
    const type = ACCOUNT_TYPES.find((t) => t.id === input.type);
    if (
      !type ||
      !type.leverageOptions.includes(input.leverage) ||
      !type.currencies.includes(input.currency)
    ) {
      return fail(422, "VALIDATION", "That combination isn't available for this account type.");
    }
    const p = portfolio(g.user.id);
    const base = input.kind === "demo" ? 2_001_900 : 137_700;
    const login = base + p.accounts.length + Math.floor(Math.random() * 90);
    const account: Account = withMargin(
      {
        login,
        label: input.label?.trim() || null,
        kind: input.kind,
        type: input.type,
        status: "active",
        archived: false,
        currency: input.currency,
        balance: input.kind === "demo" ? (input.demoBalance ?? type.demoBalances[0]!) : 0,
        credit: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        marginLevel: null,
        leverage: input.leverage,
        server: input.kind === "demo" ? SERVER_DEMO : SERVER_LIVE,
        openPositions: 0,
        createdAt: new Date().toISOString(),
        campaign: null,
      },
      [],
    );
    p.accounts.push(account);
    const pw = () => `${newId("p").slice(2, 8)}Aa#${Math.floor(Math.random() * 90 + 10)}`;
    return json(
      {
        account,
        credentials: { login, server: account.server, masterPassword: pw(), investorPassword: pw() },
      },
      201,
    );
  }),

  http.get(`${A}/:login`, async ({ request, params }) => {
    const g = await guard(request, "account");
    if (g instanceof Response) return g;
    const account = findAccount(g.user.id, Number(params.login));
    if (!account) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    return json({ account, syncedAt: portfolio(g.user.id).syncedAt });
  }),

  http.patch(`${A}/:login`, async ({ request, params }) => {
    const g = await guard(request, "rename");
    if (g instanceof Response) return g;
    const account = findAccount(g.user.id, Number(params.login));
    if (!account) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    const parsed = RenameAccountInput.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(422, "VALIDATION", "Labels can be up to 40 characters.");
    const next = { ...account, label: parsed.data.label || null };
    replaceAccount(g.user.id, next);
    return json({ account: next });
  }),

  http.get(`${A}/:login/leverage`, async ({ request, params }) => {
    const g = await guard(request, "leverage");
    if (g instanceof Response) return g;
    const account = findAccount(g.user.id, Number(params.login));
    if (!account) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    const type = ACCOUNT_TYPES.find((t) => t.id === account.type)!;
    return json({
      current: account.leverage,
      options: type.leverageOptions.filter((l) => l !== account.leverage),
      openPositions: account.openPositions,
    });
  }),

  http.post(`${A}/:login/leverage`, async ({ request, params }) => {
    const g = await guard(request, "leverage");
    if (g instanceof Response) return g;
    const account = findAccount(g.user.id, Number(params.login));
    if (!account) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    if (!consumeStepUp(request, g.user.id))
      return fail(403, "STEP_UP_REQUIRED", "Confirm it's you to continue.");
    if (account.status === "disabled" || account.status === "readOnly") {
      return fail(409, "ACCOUNT_LOCKED", "Leverage can't be changed on this account.");
    }
    if (account.openPositions > 0) {
      return fail(409, "OPEN_POSITIONS", "Close all open positions before changing leverage.");
    }
    const parsed = ChangeLeverageInput.safeParse(await request.json().catch(() => ({})));
    const type = ACCOUNT_TYPES.find((t) => t.id === account.type)!;
    if (!parsed.success || !type.leverageOptions.includes(parsed.data.leverage)) {
      return fail(422, "VALIDATION", "Choose one of the available leverage options.");
    }
    const next = withMargin({ ...account, leverage: parsed.data.leverage }, portfolio(g.user.id).positions);
    replaceAccount(g.user.id, next);
    return json({ account: next });
  }),

  http.post(`${A}/:login/password`, async ({ request, params }) => {
    const g = await guard(request, "mt5Password");
    if (g instanceof Response) return g;
    const account = findAccount(g.user.id, Number(params.login));
    if (!account) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    if (!consumeStepUp(request, g.user.id))
      return fail(403, "STEP_UP_REQUIRED", "Confirm it's you to continue.");
    const parsed = ChangeMt5PasswordInput.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(422, "VALIDATION", "The password doesn't meet the rules.");
    return json({ ok: true, type: parsed.data.type });
  }),

  http.post(`${A}/:login/archive`, async ({ request, params }) => {
    const g = await guard(request, "archive");
    if (g instanceof Response) return g;
    const account = findAccount(g.user.id, Number(params.login));
    if (!account) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    if (account.equity !== 0 || account.openPositions > 0) {
      return fail(409, "NOT_EMPTY", "Only accounts with zero equity and no open positions can be archived.");
    }
    const next = { ...account, archived: true };
    replaceAccount(g.user.id, next);
    return json({ account: next });
  }),

  /* ------------------------- positions & history ------------------------ */

  http.get(`${A}/:login/positions`, async ({ request, params }) => {
    const g = await guard(request, "positions");
    if (g instanceof Response) return g;
    const login = Number(params.login);
    if (!findAccount(g.user.id, login)) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    return json({ items: portfolio(g.user.id).positions.filter((p) => p.login === login) });
  }),

  http.get(`${A}/:login/orders`, async ({ request, params }) => {
    const g = await guard(request, "positions");
    if (g instanceof Response) return g;
    const login = Number(params.login);
    if (!findAccount(g.user.id, login)) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    return json({ items: portfolio(g.user.id).orders.filter((o) => o.login === login) });
  }),

  http.get(`${A}/:login/deals`, async ({ request, params }) => {
    const g = await guard(request, "positions");
    if (g instanceof Response) return g;
    const login = Number(params.login);
    if (!findAccount(g.user.id, login)) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    const [from, to] = parseRange(new URL(request.url));
    const items = (portfolio(g.user.id).deals.get(login) ?? []).filter((d) => {
      const t = Date.parse(d.closeTime);
      return t >= from && t <= to;
    });
    return json({ items });
  }),

  /**
   * KPIs + chart series from the same records the terminal uses. Equity per day
   * is rebuilt backwards from today's balance: balance(d) = balance(now) − net of
   * deals closed after d. Realized P/L is cumulative within the range and is
   * never derived from equity (old bug: the Net P/L chart plotted equity).
   */
  http.get(`${A}/:login/summary`, async ({ request, params }) => {
    const g = await guard(request, "summary");
    if (g instanceof Response) return g;
    const login = Number(params.login);
    const p = portfolio(g.user.id);
    const account = p.accounts.find((a) => a.login === login);
    if (!account) return fail(404, "NOT_FOUND", "We couldn't find that account.");
    const now = Date.now();
    const [from, to] = parseRange(new URL(request.url), now);
    const deals: Deal[] = p.deals.get(login) ?? [];
    const inRange = deals.filter((d) => {
      const t = Date.parse(d.closeTime);
      return t >= from && t <= to;
    });
    const openPnl = round2(
      p.positions.filter((x) => x.login === login).reduce((s, x) => s + x.profit + x.swap, 0),
    );

    const series = [];
    let cumulative = 0;
    for (let day = from; day <= to; day += 86_400_000) {
      const dayEnd = Math.min(day + 86_400_000 - 1, to);
      const closedToday = inRange.filter((d) => {
        const t = Date.parse(d.closeTime);
        return t >= day && t <= dayEnd;
      });
      cumulative = round2(cumulative + closedToday.reduce((s, d) => s + dealNet(d), 0));
      const laterNet = deals
        .filter((d) => Date.parse(d.closeTime) > dayEnd)
        .reduce((s, d) => s + dealNet(d), 0);
      const isToday = dayEnd >= now - 1;
      series.push({
        date: new Date(day).toISOString().slice(0, 10),
        equity: round2(account.balance - laterNet + account.credit + (isToday ? openPnl : 0)),
        realizedCumulative: cumulative,
        volume: round2(closedToday.reduce((s, d) => s + d.volume, 0)),
      });
    }
    const realizedPnl = round2(inRange.reduce((s, d) => s + dealNet(d), 0));
    assertInvariant(
      series.length === 0 || series.at(-1)!.realizedCumulative === realizedPnl,
      `summary ${login}: realized P/L ${realizedPnl} ≠ last cumulative point`,
    );

    return json({
      login,
      currency: account.currency,
      equity: account.equity,
      balance: account.balance,
      credit: account.credit,
      margin: account.margin,
      freeMargin: account.freeMargin,
      marginLevel: account.marginLevel,
      realizedPnl,
      closedTrades: inRange.length,
      openPnl,
      syncedAt: p.syncedAt,
      series,
    });
  }),

  /* ------------------------------ step-up ------------------------------- */

  http.post(`${BACKEND_URL}/step-up/start`, async ({ request }) => {
    const g = await guard(request, "stepUp");
    if (g instanceof Response) return g;
    const body = (await request.json().catch(() => ({}))) as { method?: "totp" | "email" };
    const method = body.method ?? (g.user.twoFactorEnabled ? "totp" : "email");
    return json({ method, sentTo: method === "email" ? maskEmail(g.user.email) : null });
  }),

  http.post(`${BACKEND_URL}/step-up/verify`, async ({ request }) => {
    const g = await guard(request, "stepUp");
    if (g instanceof Response) return g;
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    if (body.code !== DEMO_CODE) return fail(400, "CODE_INVALID", "That code is incorrect or expired.");
    const token = newId("su");
    db().stepUp.set(token, { userId: g.user.id, expiresAt: Date.now() + 5 * 60_000 });
    return json({ stepUpToken: token, expiresInSeconds: 300 });
  }),
];
