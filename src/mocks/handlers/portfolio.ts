import { http, HttpResponse } from "msw";
import type { Alert, Transaction } from "@/lib/api/schemas";
import { toUsd } from "../fixtures/accounts";
import { round2 } from "../fixtures/random";
import { portfolio } from "../store";
import { BACKEND_URL, assertInvariant, forcedError, mockLatency } from "../utils";
import { sessionUser } from "./auth";

const json = (body: unknown, status = 200) => HttpResponse.json(body as object, { status });
const unauth = () =>
  json({ code: "UNAUTHENTICATED", message: "Your session has ended. Sign in again." }, 401);

async function guard(request: Request, domain: string) {
  await mockLatency();
  const forced = forcedError(request, domain);
  if (forced) return forced;
  const s = sessionUser(request);
  return s ? s.user : unauth();
}

export const portfolioHandlers = [
  /** Totals in USD across live, non-archived accounts. Credit is not balance. */
  http.get(`${BACKEND_URL}/portfolio/summary`, async ({ request }) => {
    const user = await guard(request, "summary");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    const live = p.accounts.filter((a) => a.kind === "live" && !a.archived);
    const openPnl = round2(p.positions.reduce((s, x) => s + x.profit + x.swap, 0));
    const summary = {
      totalEquity: round2(live.reduce((s, a) => s + toUsd(a.equity, a.currency), 0)),
      totalBalance: round2(live.reduce((s, a) => s + toUsd(a.balance, a.currency), 0)),
      openPnl,
      walletBalance: p.wallet,
      syncedAt: p.syncedAt,
    };
    assertInvariant(
      summary.openPnl ===
        round2(live.reduce((s, a) => s + toUsd(a.equity - a.balance - a.credit, a.currency), 0)),
      "portfolio: open P/L ≠ Σ(equity − balance − credit)",
    );
    return json(summary);
  }),

  http.get(`${BACKEND_URL}/alerts`, async ({ request }) => {
    const user = await guard(request, "alerts");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    const alerts: Alert[] = [];
    if (user.kycStatus === "unverified" || user.kycStatus === "pending") {
      alerts.push({
        id: "al_kyc",
        kind: "kycPending",
        severity: "info",
        title: user.kycStatus === "pending" ? "Verification in review" : "Verify your identity",
        body:
          user.kycStatus === "pending"
            ? "We're checking your documents. This usually takes under 24 hours."
            : "Upload an ID and proof of address to unlock withdrawals.",
        action:
          user.kycStatus === "pending"
            ? null
            : { label: "Start verification", href: "/account/verification" },
      });
    }
    const rejected = p.transactions.find((t) => t.type === "withdrawal" && t.status === "rejected");
    if (rejected && Date.now() - Date.parse(rejected.updatedAt) < 3 * 86_400_000) {
      alerts.push({
        id: `al_${rejected.id}`,
        kind: "withdrawalRejected",
        severity: "danger",
        title: `Withdrawal of $${rejected.amount.toFixed(2)} was rejected`,
        body: rejected.reason ?? "Contact support for details.",
        action: { label: "Fix and retry", href: `/funds/withdraw?retry=${rejected.id}` },
      });
    }
    if (user.id === "u_1001") {
      alerts.push({
        id: "al_poa",
        kind: "documentExpiring",
        severity: "warning",
        title: "Proof of address expires on 30 Nov 2026",
        body: "Upload a new document before then to keep withdrawals open.",
        action: { label: "Upload document", href: "/account/verification" },
      });
    }
    return json({ items: alerts });
  }),

  http.get(`${BACKEND_URL}/onboarding`, async ({ request }) => {
    const user = await guard(request, "onboarding");
    if (user instanceof Response) return user;
    const p = portfolio(user.id);
    return json({
      steps: [
        { id: "verifyEmail", done: user.emailVerified },
        { id: "completeProfile", done: p.profileComplete },
        { id: "verifyIdentity", done: user.kycStatus === "verified" },
        {
          id: "firstDeposit",
          done: p.transactions.some((t) => t.type === "deposit" && t.status === "approved"),
        },
        { id: "downloadPlatform", done: p.platformDownloaded },
      ],
    });
  }),

  /** Phase 4 needs `limit`; Phase 5 adds the full filter set. */
  http.get(`${BACKEND_URL}/transactions`, async ({ request }) => {
    const user = await guard(request, "transactions");
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const pageSize = Math.min(
      Number(url.searchParams.get("pageSize") ?? url.searchParams.get("limit") ?? 25),
      100,
    );
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const all: Transaction[] = portfolio(user.id).transactions;
    return json({
      items: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
      page,
      pageSize,
    });
  }),
];
