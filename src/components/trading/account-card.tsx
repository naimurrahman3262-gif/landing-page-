"use client";

import { ArrowDownToLine, ArrowUpFromLine, CandlestickChart, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Badge } from "@/components/common/badge";
import { MoneyText } from "@/components/common/money-text";
import { StatusBadge } from "@/components/common/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { LINKS } from "@/config/links";
import { accountActions, accountName, isFunded, withdrawable } from "@/lib/accounts";
import type { Account } from "@/lib/api/schemas";
import { formatAccountId, formatLeverage, formatMoney } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./account-menu";

export function AccountBadges({ account }: { account: Account }) {
  const t = useTranslations("accounts");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge>{t(`types.${account.type}`)}</Badge>
      {account.campaign && (
        <Badge variant="outline">
          <Trophy aria-hidden /> {t("campaign")}
        </Badge>
      )}
      {/* The real account status. Never "Live" meaning "selected" (old bug). */}
      <StatusBadge status={account.status} />
    </div>
  );
}

/**
 * Account card (brief §6.3). The title is a link stretched over the card, so a
 * click anywhere opens the details page. Buttons sit above it.
 */
export function AccountCard({ account, compact = false }: { account: Account; compact?: boolean }) {
  const t = useTranslations("accounts");
  const name = accountName(account);
  const actions = accountActions(account);
  const funded = isFunded(account);
  const ts = useTranslations("status");
  const fmtDate = useFormatDate();
  const statusLabel = ts(account.status).toLowerCase();

  const stats: [string, ReactNode][] = [
    [t("balance"), formatMoney(account.balance, account.currency)],
    [t("credit"), formatMoney(account.credit, account.currency)],
    [t("freeMargin"), formatMoney(account.freeMargin, account.currency)],
    [t("leverage"), formatLeverage(account.leverage)],
  ];
  if (!compact) stats.push([t("currency"), account.currency], [t("server"), account.server]);

  const disabledReason = (kind: "trade" | "deposit" | "withdraw") => {
    const s = actions[kind];
    if (s.enabled) return null;
    if (s.reason === "zero")
      return t("withdrawDisabledZero", { amount: formatMoney(withdrawable(account), account.currency) });
    const status = statusLabel;
    return kind === "trade"
      ? t("tradeDisabled", { status })
      : kind === "deposit"
        ? t("depositDisabled", { status })
        : t("withdrawDisabledStatus", { status });
  };

  // Primary action: Trade when funded, Deposit when equity is zero.
  const tradeHref = LINKS.webTerminal ?? "/trading/platforms";
  const depositHref = `/funds/deposit?account=${account.login}`;
  const withdrawHref = `/funds/withdraw?account=${account.login}`;

  const actionButton = (
    kind: "trade" | "deposit" | "withdraw",
    href: string,
    icon: ReactNode,
    label: string,
    primary: boolean,
  ) => {
    const reason = disabledReason(kind);
    const variant = primary ? "primary" : "outline";
    if (reason) {
      return (
        <Tooltip content={reason}>
          <Button size="sm" variant={variant} softDisabled className="relative z-10">
            {icon} {label}
          </Button>
        </Tooltip>
      );
    }
    return (
      <Link href={href as never} className={cn(buttonVariants({ size: "sm", variant }), "relative z-10")}>
        {icon} {label}
      </Link>
    );
  };

  return (
    <Card
      padding="sm"
      className="relative flex min-w-0 flex-col gap-4 transition-colors hover:border-border-strong"
      data-testid="account-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold">
            <Link
              href={`/trading/accounts/${account.login}`}
              aria-label={t("openDetails", { account: name })}
              className="rounded-sm after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              {name}
            </Link>
          </h3>
          {account.label && (
            <p className="font-display text-xs text-text-3 tabular">{formatAccountId(account.login)}</p>
          )}
        </div>
        <div className="relative z-10 -mt-1 -mr-1">
          <AccountMenu account={account} />
        </div>
      </div>

      <AccountBadges account={account} />

      <div>
        <p className="text-xs text-text-3">{t("equity")}</p>
        <MoneyText amount={account.equity} currency={account.currency} size="lg" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {stats.map(([label, value]) => (
          <div key={label} className="grid min-w-0 gap-0.5">
            <dt className="text-xs text-text-3">{label}</dt>
            <dd className="font-display font-medium break-words tabular">{value}</dd>
          </div>
        ))}
      </dl>

      {account.campaign?.endedAt && (
        <p className="text-xs text-text-3">
          {account.campaign.name} · {t("campaignEnded", { date: fmtDate(account.campaign.endedAt, "date") })}
        </p>
      )}

      {!account.archived && (
        <div className="mt-auto flex flex-wrap gap-2">
          {funded
            ? actionButton("trade", tradeHref, <CandlestickChart aria-hidden />, t("trade"), true)
            : actionButton("deposit", depositHref, <ArrowDownToLine aria-hidden />, t("deposit"), true)}
          {funded &&
            actionButton("deposit", depositHref, <ArrowDownToLine aria-hidden />, t("deposit"), false)}
          {actionButton("withdraw", withdrawHref, <ArrowUpFromLine aria-hidden />, t("withdraw"), false)}
        </div>
      )}
    </Card>
  );
}
