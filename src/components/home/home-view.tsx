"use client";

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpFromLine,
  CircleAlert,
  CircleCheck,
  Circle,
  Info,
  Plus,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { TransactionRow } from "@/components/funds/transaction-row";
import { AccountCard } from "@/components/trading/account-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sortAccounts } from "@/lib/accounts";
import { useAccounts } from "@/lib/api/queries/accounts";
import {
  useAlerts,
  useOnboarding,
  usePortfolioSummary,
  useRecentTransactions,
} from "@/lib/api/queries/portfolio";
import type { Alert } from "@/lib/api/schemas";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";

/**
 * Home (brief §6.2). Every widget loads and fails on its own: one broken
 * endpoint shows an inline error, never a full-page failure.
 */
export function HomeView() {
  const t = useTranslations("home");
  const user = useUser();

  return (
    <>
      <PageHeader
        title={t("greeting", { name: user.firstName })}
        subtitle={t("subtitle")}
        actions={
          <>
            <Link href="/funds/withdraw" className={buttonVariants({ variant: "outline" })}>
              <ArrowUpFromLine aria-hidden /> {t("withdraw")}
            </Link>
            <Link href="/funds/transfer" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeftRight aria-hidden /> {t("transfer")}
            </Link>
            <Link href="/funds/deposit" className={buttonVariants()}>
              <ArrowDownToLine aria-hidden /> {t("deposit")}
            </Link>
          </>
        }
      />
      <div className="grid gap-8">
        <SummaryStrip />
        <Onboarding />
        <AlertsRail />
        <div className="grid gap-8 xl:grid-cols-5">
          <AccountsPreview className="xl:col-span-3" />
          <RecentActivity className="xl:col-span-2" />
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  sub,
  action,
  children,
  className,
  id,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id={id} className="font-display text-lg font-bold">
            {title}
          </h2>
          {sub && <p className="text-sm text-text-3">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------------------------- summary strip ---------------------------- */

function SummaryStrip() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const q = usePortfolioSummary();
  const state = q.isPending ? "loading" : q.isError ? "error" : "ready";
  const retry = (
    <button
      type="button"
      className="font-medium text-primary-text underline-offset-4 hover:underline"
      onClick={() => q.refetch()}
    >
      {tc("retry")}
    </button>
  );
  const tile = (label: string, amount: number | undefined, direction = false) => (
    <StatTile
      label={label}
      state={state}
      errorAction={retry}
      syncedAt={q.data?.syncedAt}
      value={
        amount !== undefined && (
          <MoneyText amount={amount} size="lg" tone={direction ? "direction" : "plain"} />
        )
      }
    />
  );
  return (
    <section aria-label={t("totalEquity")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tile(t("totalEquity"), q.data?.totalEquity)}
        {tile(t("totalBalance"), q.data?.totalBalance)}
        {tile(t("openPnl"), q.data?.openPnl, true)}
        {tile(t("walletBalance"), q.data?.walletBalance)}
      </div>
      <p className="mt-2 text-xs text-text-3">{t("summaryNote")}</p>
    </section>
  );
}

/* ----------------------------- alerts rail ----------------------------- */

const ALERT_STYLE: Record<Alert["severity"], { icon: typeof Info; cls: string }> = {
  danger: { icon: CircleAlert, cls: "border-danger-soft bg-danger-soft text-danger-text" },
  warning: { icon: TriangleAlert, cls: "border-warning-soft bg-warning-soft text-warning-text" },
  info: { icon: Info, cls: "border-info-soft bg-info-soft text-info-text" },
};

function AlertsRail() {
  const t = useTranslations("home");
  const q = useAlerts();
  if (q.isPending) return <Skeleton className="h-20" />;
  if (q.isError)
    return <ErrorState compact title={t("alerts")} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  if (q.data.length === 0) return null;
  return (
    <Section id="home-alerts" title={t("alerts")}>
      <ul className="grid gap-3 lg:grid-cols-2">
        {q.data.map((a) => {
          const { icon: Icon, cls } = ALERT_STYLE[a.severity];
          return (
            <li key={a.id} className={cn("flex gap-3 rounded-lg border p-4", cls)}>
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
              <div className="grid min-w-0 flex-1 gap-1">
                <p className="font-display font-bold text-text-1">{a.title}</p>
                <p className="text-sm text-text-2">{a.body}</p>
                {a.action && (
                  <Link
                    href={a.action.href as never}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 w-fit")}
                  >
                    {a.action.label} <ArrowRight aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* --------------------------- accounts preview --------------------------- */

function AccountsPreview({ className }: { className?: string }) {
  const t = useTranslations("home");
  const q = useAccounts();
  const live = q.data
    ? sortAccounts(
        q.data.items.filter((a) => a.kind === "live" && !a.archived),
        "equityDesc",
      )
    : [];

  return (
    <Section
      id="home-accounts"
      title={t("accounts")}
      sub={live.length > 0 ? t("accountsSub") : undefined}
      className={className}
      action={
        live.length > 0 && (
          <Link href="/trading/accounts" className={buttonVariants({ variant: "link", size: "sm" })}>
            {t("viewAllAccounts")} <ArrowRight aria-hidden />
          </Link>
        )
      }
    >
      {q.isPending && (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy>
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      )}
      {q.isError && (
        <ErrorState compact title={t("accountsError")} onRetry={() => q.refetch()} retrying={q.isFetching} />
      )}
      {q.data && live.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={t("noAccountsTitle")}
          description={t("noAccountsBody")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/trading/accounts/new" className={buttonVariants()}>
                <Plus aria-hidden /> {t("openAccount")}
              </Link>
              <Link href="/trading/accounts/new?kind=demo" className={buttonVariants({ variant: "outline" })}>
                {t("openDemo")}
              </Link>
            </div>
          }
        />
      )}
      {live.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {live.slice(0, 4).map((a) => (
            <li key={a.login} className="flex">
              <AccountCard account={a} compact />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ---------------------------- recent activity --------------------------- */

function RecentActivity({ className }: { className?: string }) {
  const t = useTranslations("home");
  const q = useRecentTransactions(5);
  const accounts = useAccounts().data?.items;
  return (
    <Section
      id="home-recent"
      title={t("recent")}
      className={className}
      action={
        <Link href="/funds/transactions" className={buttonVariants({ variant: "link", size: "sm" })}>
          {t("viewAllTransactions")} <ArrowRight aria-hidden />
        </Link>
      }
    >
      <Card padding="none" className="px-4">
        {q.isPending && (
          <div className="grid gap-4 py-4" aria-busy>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}
        {q.isError && (
          <ErrorState
            compact
            className="my-4"
            title={t("recentError")}
            onRetry={() => q.refetch()}
            retrying={q.isFetching}
          />
        )}
        {q.data && q.data.length === 0 && (
          <EmptyState
            icon={Receipt}
            className="my-4 border-none"
            title={t("recentEmptyTitle")}
            description={t("recentEmptyBody")}
          />
        )}
        {q.data && q.data.length > 0 && (
          <ul className="divide-y divide-border">
            {q.data.map((tx) => (
              <li key={tx.id}>
                <TransactionRow tx={tx} accounts={accounts} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
}

/* -------------------------- onboarding checklist ------------------------- */

const STEP_HREF: Record<string, string> = {
  verifyEmail: "/verify-email",
  completeProfile: "/account/profile",
  verifyIdentity: "/account/verification",
  firstDeposit: "/funds/deposit",
  downloadPlatform: "/trading/platforms",
};

function Onboarding() {
  const t = useTranslations("home");
  const q = useOnboarding();
  // Hidden when done, while loading, and on error (it's a helper, not data).
  if (!q.data || q.data.every((s) => s.done)) return null;
  const done = q.data.filter((s) => s.done).length;
  const next = q.data.find((s) => !s.done);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("onboarding")}</CardTitle>
        <span className="text-sm text-text-2 tabular">
          {t("onboardingProgress", { done, total: q.data.length })}
        </span>
      </CardHeader>
      <div
        className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-label={t("onboarding")}
        aria-valuemin={0}
        aria-valuemax={q.data.length}
        aria-valuenow={done}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(done / q.data.length) * 100}%` }}
        />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {q.data.map((step) => (
          <li key={step.id}>
            <Link
              href={STEP_HREF[step.id] as never}
              aria-disabled={step.done || undefined}
              className={cn(
                "flex h-full items-center gap-2 rounded-md border px-3 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring",
                step.done
                  ? "pointer-events-none border-border text-text-3 line-through"
                  : step.id === next?.id
                    ? "border-primary-border bg-primary-soft font-medium text-text-1"
                    : "border-border text-text-1 hover:border-border-strong",
              )}
            >
              {step.done ? (
                <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
              ) : (
                <Circle aria-hidden className="size-4 shrink-0 text-text-3" />
              )}
              {t(`steps.${step.id}`)}
              <span className="sr-only">({step.done ? t("stepsDone") : t("stepsTodo")})</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
