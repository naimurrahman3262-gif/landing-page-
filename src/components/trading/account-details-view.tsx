"use client";

import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CandlestickChart,
  Download,
  KeyRound,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { CopyButton } from "@/components/common/copy-button";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { accountActions, accountName, withdrawable } from "@/lib/accounts";
import { ApiError } from "@/lib/api/client";
import { useAccount } from "@/lib/api/queries/accounts";
import { useOpenPositions } from "@/lib/api/queries/trading";
import { formatAccountId, formatLeverage, formatMoney, formatPercent, PLACEHOLDER } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";
import { AccountBadges } from "./account-card";
import { Mt5PasswordDialog } from "./account-dialogs";
import { AccountMenu } from "./account-menu";
import { usePositionColumns } from "./position-columns";

export function AccountDetailsView({ login }: { login: number }) {
  const t = useTranslations("accountDetails");
  const ta = useTranslations("accounts");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const fmt = useFormatDate();
  const q = useAccount(login);
  const positions = useOpenPositions(q.data ? login : undefined);
  const columns = usePositionColumns(q.data?.account.currency ?? "USD");
  const [pwType, setPwType] = useState<"master" | "investor" | null>(null);

  if (q.isPending) {
    return (
      <>
        <PageHeader title={formatAccountId(login)} backHref="/trading/accounts" />
        <div className="grid gap-4" aria-busy>
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }
  if (q.isError) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return (
      <>
        <PageHeader title={formatAccountId(login)} backHref="/trading/accounts" />
        {notFound ? (
          <EmptyState
            icon={SearchX}
            title={t("notFound")}
            description={t("notFoundBody")}
            action={
              <Link href="/trading/accounts" className={buttonVariants({ variant: "outline" })}>
                {t("back")}
              </Link>
            }
          />
        ) : (
          <ErrorState title={ta("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />
        )}
      </>
    );
  }

  const { account, syncedAt } = q.data;
  const cur = account.currency;
  const actions = accountActions(account);
  const statusLabel = ts(account.status).toLowerCase();
  const tile = (label: string, value: ReactNode) => (
    <StatTile label={label} value={value} syncedAt={syncedAt} />
  );

  const details: [string, ReactNode, string?][] = [
    [
      ta("login"),
      <span key="l" className="tabular">
        {account.login}
      </span>,
      String(account.login),
    ],
    [ta("server"), account.server, account.server],
    [ta("type"), `${ta(`types.${account.type}`)}${account.kind === "demo" ? ` (${ta("tabs.demo")})` : ""}`],
    [ta("leverage"), formatLeverage(account.leverage)],
    [ta("currency"), account.currency],
    [ta("created"), fmt(account.createdAt, "date")],
  ];

  return (
    <>
      <PageHeader
        title={accountName(account)}
        subtitle={account.label ? formatAccountId(account.login) : undefined}
        backHref="/trading/accounts"
        actions={
          !account.archived && (
            <>
              {actions.withdraw.enabled ? (
                <Link
                  href={`/funds/withdraw?account=${login}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <ArrowUpFromLine aria-hidden /> {ta("withdraw")}
                </Link>
              ) : (
                <Tooltip
                  content={
                    actions.withdraw.reason === "zero"
                      ? ta("withdrawDisabledZero", { amount: formatMoney(withdrawable(account), cur) })
                      : ta("withdrawDisabledStatus", { status: statusLabel })
                  }
                >
                  <Button variant="outline" softDisabled>
                    <ArrowUpFromLine aria-hidden /> {ta("withdraw")}
                  </Button>
                </Tooltip>
              )}
              {actions.deposit.enabled ? (
                <Link href={`/funds/deposit?account=${login}`} className={buttonVariants()}>
                  <ArrowDownToLine aria-hidden /> {ta("deposit")}
                </Link>
              ) : (
                <Tooltip content={ta("depositDisabled", { status: statusLabel })}>
                  <Button softDisabled>
                    <ArrowDownToLine aria-hidden /> {ta("deposit")}
                  </Button>
                </Tooltip>
              )}
              <AccountMenu account={account} size="icon" />
            </>
          )
        }
      />

      <div className="mb-6">
        <AccountBadges account={account} />
      </div>

      <section aria-label={t("overview")} className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tile(ta("equity"), <MoneyText amount={account.equity} currency={cur} size="lg" />)}
        {tile(ta("balance"), <MoneyText amount={account.balance} currency={cur} size="lg" />)}
        {tile(ta("credit"), <MoneyText amount={account.credit} currency={cur} size="lg" />)}
        {tile(ta("freeMargin"), <MoneyText amount={account.freeMargin} currency={cur} size="lg" />)}
        {tile(
          ta("marginLevel"),
          <span className="font-display text-2xl font-bold tabular">
            {account.marginLevel === null ? PLACEHOLDER : formatPercent(account.marginLevel)}
          </span>,
        )}
      </section>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
          </CardHeader>
          <dl className="grid gap-3 text-sm">
            {details.map(([label, value, copy]) => (
              <div key={label} className="flex min-h-9 items-center justify-between gap-3">
                <dt className="text-text-3">{label}</dt>
                <dd className="flex items-center gap-1 font-display font-medium">
                  {value}
                  {copy && (
                    <CopyButton value={copy} label={tc("copyValue", { label: label.toLowerCase() })} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("credentials")}</CardTitle>
          </CardHeader>
          <div className="grid gap-4">
            {(["master", "investor"] as const).map((type) => (
              <div key={type} className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium">
                    {type === "master" ? t("masterPassword") : t("investorPassword")}
                  </p>
                  <p className="text-sm text-text-3">
                    {type === "master" ? t("masterPasswordBody") : t("investorPasswordBody")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={account.archived || account.status === "disabled"}
                  onClick={() => setPwType(type)}
                >
                  <KeyRound aria-hidden /> {t("change")}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("guide")}</CardTitle>
          </CardHeader>
          <ol className="mb-4 grid gap-3 text-sm text-text-2">
            {(["1", "2", "3"] as const).map((n) => (
              <li key={n} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-content-center rounded-full bg-surface-3 font-display text-xs font-bold text-text-1">
                  {n}
                </span>
                <span>{t(`guideSteps.${n}`, { login: account.login, server: account.server })}</span>
              </li>
            ))}
          </ol>
          <Link href="/trading/platforms" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download aria-hidden /> {t("downloadPlatform")}
          </Link>
        </Card>
      </div>

      <section aria-labelledby="latest-positions">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="latest-positions" className="font-display text-lg font-bold">
            {t("latestPositions")}
          </h2>
          <Link
            href={`/trading/positions?account=${login}`}
            className={cn(buttonVariants({ variant: "link", size: "sm" }))}
          >
            {t("allPositions")} <ArrowRight aria-hidden />
          </Link>
        </div>
        {positions.isPending ? (
          <Skeleton className="h-32" />
        ) : positions.isError ? (
          <ErrorState compact title={ta("error")} onRetry={() => positions.refetch()} />
        ) : (
          <DataTable
            data={positions.data.slice(0, 5)}
            columns={columns}
            caption={t("latestPositions")}
            getRowId={(p) => String(p.ticket)}
            empty={
              <EmptyState
                icon={CandlestickChart}
                title={t("noPositions", { account: accountName(account) })}
              />
            }
          />
        )}
      </section>

      {pwType && (
        <Mt5PasswordDialog
          account={account}
          open
          initialType={pwType}
          onOpenChange={(o) => !o && setPwType(null)}
        />
      )}
    </>
  );
}
