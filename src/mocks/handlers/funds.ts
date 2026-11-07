import { http, HttpResponse } from "msw";
import {
  AddPayoutInput,
  DepositInput,
  TransferInput,
  WithdrawInput,
  type Account,
  type AccountRef,
  type Method,
  type Transaction,
  type TransactionDetail,
} from "@/lib/api/schemas";
import { withdrawable } from "@/lib/accounts";
import { withMargin } from "../fixtures/accounts";
import { METHODS, WITHDRAW_TERMS } from "../fixtures/methods";
import { round2 } from "../fixtures/random";
import { db, newId, portfolio, type FundsDetail, type Portfolio } from "../store";
import { BACKEND_URL, assertInvariant, forcedError, mockLatency } from "../utils";
import { sessionUser } from "./auth";

const json = (body: unknown, status = 200) => HttpResponse.json(body as object, { status });
const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  json({ code, message, ...(fields ? { fields } : {}) }, status);
const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function guard(request: Request, domain: string) {
  await mockLatency();
  const forced = forcedError(request, domain);
  if (forced) return forced;
  const s = sessionUser(request);
  return s ? s.user : fail(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
}

function consumeStepUp(request: Request, userId: string): boolean {
  const token = request.headers.get("x-step-up");
  const entry = token ? db().stepUp.get(token) : undefined;
  if (!entry || entry.userId !== userId || entry.expiresAt < Date.now()) return false;
  db().stepUp.delete(token!);
  return true;
}

/* ------------------------------ balances ------------------------------- */

type Source = { kind: "wallet" } | { kind: "mt5"; account: Account };

function resolve(p: Portfolio, dest: string): Source | null {
  if (dest === "wallet") return { kind: "wallet" };
  const account = p.accounts.find((a) => a.login === Number(dest) && !a.archived);
  return account ? { kind: "mt5", account } : null;
}

const refOf = (s: Source): AccountRef =>
  s.kind === "wallet" ? { kind: "wallet" } : { kind: "mt5", login: s.account.login };

/** USD available to move out: wallet balance, or MT5 free margin excluding credit, capped at balance. */
function available(p: Portfolio, s: Source): number {
  return s.kind === "wallet"
    ? p.wallet
    : s.account.currency === "USC"
      ? withdrawable(s.account) / 100
      : withdrawable(s.account);
}

/** Add (or subtract) USD to a wallet/account, keeping MT5 margin maths consistent. */
function credit(p: Portfolio, s: Source, amountUsd: number) {
  if (s.kind === "wallet") {
    p.wallet = round2(p.wallet + amountUsd);
    return;
  }
  const units = s.account.currency === "USC" ? amountUsd * 100 : amountUsd;
  const next = withMargin({ ...s.account, balance: round2(s.account.balance + units) }, p.positions);
  p.accounts = p.accounts.map((a) => (a.login === next.login ? next : a));
}

function blockedReason(s: Source, direction: "in" | "out"): string | null {
  if (s.kind === "wallet") return null;
  const a = s.account;
  if (a.kind === "demo") return "Demo accounts use virtual funds and can't send or receive real money.";
  if (a.status === "disabled") return "This account is disabled. Contact support.";
  if (a.status === "readOnly" && direction === "in")
    return "This account is read-only. Deposits aren't accepted.";
  return null;
}

/* -------------------------------- quotes -------------------------------- */

function quote(
  method: Pick<Method, "feeFixed" | "feePct" | "rate" | "localCurrency" | "eta">,
  amount: number,
) {
  const fee = round2(method.feeFixed + (amount * method.feePct) / 100);
  return {
    amount,
    fee,
    net: round2(amount - fee),
    rate: method.rate,
    localAmount: round2(amount * method.rate),
    localCurrency: method.localCurrency,
    eta: method.eta,
  };
}

/** What happened + what to do (§10). */
function limitError(name: string, min: number, max: number, amount: number): string | null {
  if (amount < min) return `Below the ${usd(min)} minimum for ${name}. Enter ${usd(min)} or more.`;
  if (amount > max)
    return `Above the ${usd(max)} maximum for ${name}. Enter ${usd(max)} or less, or split it.`;
  return null;
}

function withdrawMethod(m: Method): Method {
  const terms = WITHDRAW_TERMS[m.id];
  return terms ? { ...m, ...terms } : m;
}

/* ------------------------------ transactions ----------------------------- */

const ref = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(2, 7).replace("-", "")}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

function timeline(t: Transaction, detail?: FundsDetail): TransactionDetail["timeline"] {
  const steps: TransactionDetail["timeline"] = [{ status: "created", at: t.createdAt, note: null }];
  if (detail?.settle) {
    if (t.status !== "pending")
      steps.push({
        status: "processing",
        at: new Date(Math.min(detail.settle.processingAt, Date.now())).toISOString(),
        note: null,
      });
    if (t.status === "approved" || t.status === "failed")
      steps.push({ status: t.status, at: t.updatedAt, note: t.reason });
    return steps;
  }
  if (t.status === "pending") return [...steps, { status: "pending", at: t.createdAt, note: null }];
  if (t.status !== "cancelled" && t.type !== "transfer")
    steps.push({
      status: "processing",
      at: new Date(Date.parse(t.createdAt) + 4 * 60_000).toISOString(),
      note: null,
    });
  if (t.status !== "processing") steps.push({ status: t.status, at: t.updatedAt, note: t.reason });
  return steps;
}

/** Mock settlement: in-flight deposits move on with time and credit the destination once. */
function settle(p: Portfolio, t: Transaction) {
  const d = p.details.get(t.id);
  if (!d?.settle || t.status === "approved" || t.status === "failed") return;
  const now = Date.now();
  if (now >= d.settle.doneAt) {
    t.status = d.settle.outcome;
    t.updatedAt = new Date(d.settle.doneAt).toISOString();
    if (t.status === "approved") {
      const dest = t.account.kind === "wallet" ? resolve(p, "wallet") : resolve(p, String(t.account.login));
      if (dest) credit(p, dest, round2(t.amount - t.fee));
    } else t.reason = "Payment wasn't received within 30 minutes.";
  } else if (now >= d.settle.processingAt) {
    t.status = "processing";
    t.updatedAt = new Date(d.settle.processingAt).toISOString();
  }
}

function detailOf(p: Portfolio, t: Transaction): TransactionDetail {
  const d = p.details.get(t.id);
  const method = METHODS.find((m) => m.name === t.method);
  const rate = d?.rate ?? (method && method.rate !== 1 ? method.rate : null);
  return {
    ...t,
    timeline: timeline(t, d),
    handoff: d?.handoff ?? null,
    destinationMasked:
      d?.destinationMasked ??
      (t.type === "withdrawal" ? (t.method?.startsWith("USDT") ? "TQ7m…9xQa" : "•••• 5467") : null),
    rate,
    localAmount: d?.localAmount ?? (rate ? round2(t.amount * rate) : null),
    localCurrency: d?.localCurrency ?? (rate ? method!.localCurrency : null),
  };
}

function matches(t: Transaction, url: URL): boolean {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const types = url.searchParams.get("type")?.split(",").filter(Boolean);
  const statuses = url.searchParams.get("status")?.split(",").filter(Boolean);
  const account = url.searchParams.get("account");
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const at = Date.parse(t.createdAt);
  if (from && at < Date.parse(from)) return false;
  if (to && at > Date.parse(to)) return false;
  if (types?.length && !types.includes(t.type)) return false;
  if (statuses?.length && !statuses.includes(t.status)) return false;
  if (account) {
    const touches = (r: AccountRef | null) =>
      !!r && (account === "wallet" ? r.kind === "wallet" : r.kind === "mt5" && r.login === Number(account));
    if (!touches(t.account) && !touches(t.counterparty)) return false;
  }
  if (q && !t.reference.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
  return true;
}

const F = BACKEND_URL;

export const fundsHandlers = [
  http.get(`${F}/wallet`, async ({ request }) => {
    const user = await guard(request, "wallet");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    return json({ balance: p.wallet, currency: "USD", syncedAt: p.syncedAt });
  }),

  /** Methods for the user's country unless ?all=1. Withdraw purpose returns withdrawal terms. */
  http.get(`${F}/methods`, async ({ request }) => {
    const user = await guard(request, "methods");
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const purpose = url.searchParams.get("purpose") ?? "deposit";
    const country = request.headers.get("x-client-country") ?? user.country;
    const all = url.searchParams.get("all") === "1";
    let items = METHODS.filter((m) => all || !m.countries || m.countries.includes(country));
    if (purpose === "withdraw") items = items.map(withdrawMethod);
    return json({ items, country });
  }),

  http.post(`${F}/quotes`, async ({ request }) => {
    const user = await guard(request, "quote");
    if (user instanceof Response) return user;
    const body = (await request.json().catch(() => ({}))) as {
      methodId?: string;
      amount?: number;
      purpose?: string;
    };
    const base = METHODS.find((m) => m.id === body.methodId);
    if (!base || typeof body.amount !== "number")
      return fail(422, "VALIDATION", "Choose a method and an amount.");
    const method = body.purpose === "withdraw" ? withdrawMethod(base) : base;
    const err = limitError(method.name, method.min, method.max, body.amount);
    if (err) return fail(422, "AMOUNT_OUT_OF_RANGE", err, { amount: err });
    return json(quote(method, body.amount));
  }),

  http.post(`${F}/deposits`, async ({ request }) => {
    const user = await guard(request, "deposit");
    if (user instanceof Response) return user;
    const parsed = DepositInput.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(422, "VALIDATION", "Some fields need attention.");
    const { methodId, destination, amount } = parsed.data;
    const p = portfolio(user.id);
    const method = METHODS.find((m) => m.id === methodId);
    const dest = resolve(p, destination);
    if (!method || !dest) return fail(422, "VALIDATION", "Choose where to deposit and how.");
    const blocked = blockedReason(dest, "in");
    if (blocked) return fail(409, "DESTINATION_BLOCKED", blocked);
    const err = limitError(method.name, method.min, method.max, amount);
    if (err) return fail(422, "AMOUNT_OUT_OF_RANGE", err, { amount: err });

    const q = quote(method, amount);
    const now = Date.now();
    const t: Transaction = {
      id: newId("tx"),
      reference: ref("DEP"),
      type: "deposit",
      status: "pending",
      amount,
      fee: q.fee,
      currency: "USD",
      method: method.name,
      account: refOf(dest),
      counterparty: null,
      reason: null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
    const handoff: FundsDetail["handoff"] =
      method.kind === "crypto"
        ? {
            kind: "crypto",
            asset: "USDT",
            network: method.id === "usdt-trc20" ? "TRON (TRC20)" : "BNB Smart Chain (BEP20)",
            address:
              method.id === "usdt-trc20"
                ? "TXyq4bSnQGw2P8m9JpVh6cL1uR7eKd3FaZ"
                : "0x8b1F6a2c9E4d7B3a5C0e1f2D3c4B5a6978E9d0Ab",
            expiresAt: new Date(now + 30 * 60_000).toISOString(),
          }
        : method.kind === "bank"
          ? {
              kind: "bank",
              beneficiary: "WinproFX Client Funds",
              bankName: "ICICI Bank",
              accountNumber: "000405112233",
              ifsc: "ICIC0000004",
              reference: t.reference,
            }
          : { kind: "redirect", provider: method.name, url: `/funds/deposit/status/${t.id}?returned=1` };
    p.transactions.unshift(t);
    p.details.set(t.id, {
      handoff,
      destinationMasked: null,
      rate: method.rate !== 1 ? method.rate : null,
      localAmount: method.rate !== 1 ? q.localAmount : null,
      localCurrency: method.rate !== 1 ? method.localCurrency : null,
      // Amounts ending in .13 fail, so the failed state can be demoed.
      settle: {
        processingAt: now + 8_000,
        doneAt: now + 20_000,
        outcome: Math.round(amount * 100) % 100 === 13 ? "failed" : "approved",
      },
    });
    return json({ transaction: t, handoff, timeline: timeline(t, p.details.get(t.id)) }, 201);
  }),

  http.get(`${F}/transactions/summary`, async ({ request }) => {
    const user = await guard(request, "transactions");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    const url = new URL(request.url);
    const rows = p.transactions.filter((t) => matches(t, url) && t.status === "approved");
    const dep = rows.filter((t) => t.type === "deposit");
    const wd = rows.filter((t) => t.type === "withdrawal");
    const approvedDeposits = round2(dep.reduce((s, t) => s + t.amount, 0));
    const approvedWithdrawals = round2(wd.reduce((s, t) => s + t.amount, 0));
    return json({
      approvedDeposits,
      approvedWithdrawals,
      approvedDepositCount: dep.length,
      approvedWithdrawalCount: wd.length,
      net: round2(approvedDeposits - approvedWithdrawals),
    });
  }),

  http.get(`${F}/transactions`, async ({ request }) => {
    const user = await guard(request, "transactions");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    p.transactions.forEach((t) => settle(p, t));
    const url = new URL(request.url);
    const pageSize = Math.min(
      Math.max(Number(url.searchParams.get("pageSize") ?? url.searchParams.get("limit") ?? 25), 1),
      100,
    );
    const filtered = p.transactions.filter((t) => matches(t, url));
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(Math.max(1, Number(url.searchParams.get("page") ?? 1)), pages);
    return json({
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    });
  }),

  http.get(`${F}/transactions/:id`, async ({ request, params }) => {
    const user = await guard(request, "transaction");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    const t = p.transactions.find((x) => x.id === params.id);
    if (!t) return fail(404, "NOT_FOUND", "We couldn't find that transaction.");
    settle(p, t);
    return json(detailOf(p, t));
  }),

  /* ------------------------------ withdrawals ----------------------------- */

  http.get(`${F}/payout-methods`, async ({ request }) => {
    const user = await guard(request, "payoutMethods");
    if (user instanceof Response) return user;
    return json({ items: portfolio(user.id).payouts });
  }),

  http.post(`${F}/payout-methods`, async ({ request }) => {
    const user = await guard(request, "payoutMethods");
    if (user instanceof Response) return user;
    if (!consumeStepUp(request, user.id))
      return fail(403, "STEP_UP_REQUIRED", "Confirm it's you to continue.");
    const parsed = AddPayoutInput.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(422, "VALIDATION", "Some fields need attention.");
    const input = parsed.data;
    const p = portfolio(user.id);
    const verifiedName = `${user.firstName} ${user.lastName}`.toLowerCase();
    if (input.type === "bank" && input.holderName.trim().toLowerCase() !== verifiedName) {
      return fail(422, "NAME_MISMATCH", "The account name must match your verified name exactly.", {
        holderName: "holderNameMismatch",
      });
    }
    const pm = {
      id: newId("pm"),
      type: input.type,
      methodId: input.methodId,
      label: input.type === "bank" ? input.bankName : input.label,
      masked:
        input.type === "bank"
          ? `•••• ${input.accountNumber.slice(-4)}`
          : `${input.address.slice(0, 4)}…${input.address.slice(-4)}`,
      holderName: input.type === "bank" ? input.holderName : null,
      status: "pending" as const,
      isDefault: p.payouts.length === 0,
      rejectionReason: null,
    };
    p.payouts.push(pm);
    return json({ payoutMethod: pm }, 201);
  }),

  /** "You requested the same amount 2 minutes ago" (brief §6.5). */
  http.get(`${F}/withdrawals/duplicate`, async ({ request }) => {
    const user = await guard(request, "withdraw");
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const amount = Number(url.searchParams.get("amount"));
    const source = url.searchParams.get("source") ?? "wallet";
    const p = portfolio(user.id);
    const s = resolve(p, source);
    const recent = p.transactions.find(
      (t) =>
        t.type === "withdrawal" &&
        t.amount === amount &&
        !!s &&
        JSON.stringify(t.account) === JSON.stringify(refOf(s)) &&
        Date.now() - Date.parse(t.createdAt) < 15 * 60_000,
    );
    return json({
      duplicate: recent ? { id: recent.id, createdAt: recent.createdAt, status: recent.status } : null,
    });
  }),

  http.post(`${F}/withdrawals`, async ({ request }) => {
    const user = await guard(request, "withdraw");
    if (user instanceof Response) return user;
    if (user.kycStatus !== "verified")
      return fail(403, "KYC_REQUIRED", "Verify your identity before withdrawing.");
    if (!consumeStepUp(request, user.id))
      return fail(403, "STEP_UP_REQUIRED", "Confirm it's you to continue.");
    const parsed = WithdrawInput.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(422, "VALIDATION", "Some fields need attention.");
    const { source, payoutMethodId, amount } = parsed.data;
    const p = portfolio(user.id);
    const s = resolve(p, source);
    const pm = p.payouts.find((x) => x.id === payoutMethodId);
    if (!s || !pm) return fail(422, "VALIDATION", "Choose where to withdraw from and to.");
    const blocked = blockedReason(s, "out");
    if (blocked) return fail(409, "SOURCE_BLOCKED", blocked);
    if (pm.status !== "verified") {
      return fail(
        409,
        "PAYOUT_NOT_VERIFIED",
        "This payout method is still being verified. Choose a verified one, or wait for verification.",
      );
    }
    const method = withdrawMethod(METHODS.find((m) => m.id === pm.methodId)!);
    const err = limitError(method.name, method.min, method.max, amount);
    if (err) return fail(422, "AMOUNT_OUT_OF_RANGE", err, { amount: err });
    const avail = available(p, s);
    if (amount > avail) {
      return fail(
        422,
        "INSUFFICIENT_FUNDS",
        `You can withdraw up to ${usd(avail)} from here. Enter ${usd(avail)} or less.`,
        {
          amount: `You can withdraw up to ${usd(avail)} from here.`,
        },
      );
    }
    const q = quote(method, amount);
    const now = Date.now();
    const t: Transaction = {
      id: newId("tx"),
      reference: ref("WDR"),
      type: "withdrawal",
      status: "pending",
      amount,
      fee: q.fee,
      currency: "USD",
      method: method.name,
      account: refOf(s),
      counterparty: null,
      reason: null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
    credit(p, s, -amount); // funds are held immediately
    p.transactions.unshift(t);
    p.details.set(t.id, {
      handoff: null,
      destinationMasked: `${pm.label} ${pm.masked}`,
      rate: null,
      localAmount: null,
      localCurrency: null,
    });
    return json({ transaction: t, handoff: null, timeline: timeline(t) }, 201);
  }),

  /* ------------------------------- transfers ------------------------------ */

  http.post(`${F}/transfers`, async ({ request }) => {
    const user = await guard(request, "transfer");
    if (user instanceof Response) return user;
    const parsed = TransferInput.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(422, "VALIDATION", "Choose two different accounts and an amount.");
    const { from, to, amount } = parsed.data;
    const p = portfolio(user.id);
    const s = resolve(p, from);
    const d = resolve(p, to);
    if (!s || !d) return fail(422, "VALIDATION", "Choose two different accounts.");
    const blocked = blockedReason(s, "out") ?? blockedReason(d, "in");
    if (blocked) return fail(409, "TRANSFER_BLOCKED", blocked);
    const avail = available(p, s);
    if (amount > avail) {
      return fail(
        422,
        "INSUFFICIENT_FUNDS",
        `You can transfer up to ${usd(avail)} from this account. Enter ${usd(avail)} or less.`,
        {
          amount: `You can transfer up to ${usd(avail)} from this account.`,
        },
      );
    }
    credit(p, s, -amount);
    credit(p, resolve(p, to)!, amount);
    const now = new Date().toISOString();
    const t: Transaction = {
      id: newId("tx"),
      reference: ref("TRF"),
      type: "transfer",
      status: "approved",
      amount,
      fee: 0,
      currency: "USD",
      method: null,
      account: refOf(s),
      counterparty: refOf(d),
      reason: null,
      createdAt: now,
      updatedAt: now,
    };
    p.transactions.unshift(t);
    assertInvariant(p.wallet >= 0, "transfer left a negative wallet balance");
    return json({ transaction: t, handoff: null, timeline: timeline(t) }, 201);
  }),
];
