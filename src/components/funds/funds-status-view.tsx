"use client";

import {
  CircleCheck,
  CircleDashed,
  CircleX,
  ExternalLink,
  LifeBuoy,
  LoaderCircle,
  SearchX,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { refName } from "@/lib/accounts";
import { ApiError } from "@/lib/api/client";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useTransaction } from "@/lib/api/queries/funds";
import type { Handoff, TransactionDetail } from "@/lib/api/schemas";
import { formatMoney, formatNumber } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";

const FINAL = new Set(["approved", "rejected", "failed", "cancelled"]);

/**
 * Self-updating status page for deposits and withdrawals (brief §6.5):
 * Pending → Processing → Completed / Failed, with timeline, reference,
 * payment hand-off while waiting, and a support link.
 */
export function FundsStatusView({ id, kind }: { id: string; kind: "deposit" | "withdrawal" }) {
  const t = useTranslations("funds.status");
  const tf = useTranslations("funds");
  const tt = useTranslations("transactions");
  const fmt = useFormatDate();
  const q = useTransaction(id, true);
  const accounts = useAccounts().data?.items;
  const title = kind === "deposit" ? t("titleDeposit") : t("titleWithdrawal");
  const back = kind === "deposit" ? "/funds/deposit" : "/funds/withdraw";

  if (q.isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={title} backHref={back} />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (q.isError) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={title} backHref={back} />
        {notFound ? (
          <EmptyState icon={SearchX} title={t("notFound")} />
        ) : (
          <ErrorState title={t("notFound")} onRetry={() => q.refetch()} retrying={q.isFetching} />
        )}
      </div>
    );
  }

  const tx = q.data;
  const done = FINAL.has(tx.status);
  const where = refName(tx.account, tf("wallet"), accounts);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <PageHeader title={title} backHref={back} />

      <Card className="grid justify-items-center gap-3 text-center">
        <StatusIcon status={tx.status} />
        <MoneyText
          amount={kind === "deposit" ? tx.amount : -tx.amount}
          tone="direction"
          sign="always"
          size="xl"
          voided={["rejected", "failed", "cancelled"].includes(tx.status)}
        />
        <p className="text-sm text-text-2">
          {tt(`types.${tx.type}`)} · {tx.method} · {where}
        </p>
        <StatusBadge status={tx.status} />
        {tx.status === "approved" && (
          <p className="text-sm text-success-text">{kind === "deposit" ? t("done") : t("doneWithdrawal")}</p>
        )}
        {kind === "withdrawal" && !done && <p className="text-sm text-text-2">{t("held")}</p>}
        {tx.reason && <p className="text-sm text-danger-text">{tx.reason}</p>}
        {!done && (
          <p className="flex items-center gap-1.5 text-xs text-text-3" aria-live="polite">
            <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />{" "}
            {t("live")}
          </p>
        )}
      </Card>

      {tx.handoff && tx.status === "pending" && <HandoffPanel handoff={tx.handoff} tx={tx} />}

      <Card>
        <CardTitle className="mb-4">{t("reference")}</CardTitle>
        <div className="mb-6 flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
          <span className="font-display font-medium tabular">{tx.reference}</span>
          <CopyButton value={tx.reference} label={t("copyReference")} />
        </div>
        <ol className="grid gap-4" aria-label={tf("tx.timeline")}>
          {tx.timeline.map((step, i) => (
            <li key={`${step.status}-${i}`} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-content-center rounded-full",
                  step.status === "approved"
                    ? "bg-success-soft text-success-text"
                    : ["rejected", "failed"].includes(step.status)
                      ? "bg-danger-soft text-danger-text"
                      : "bg-surface-3 text-text-2",
                )}
              >
                <StepIcon status={step.status} />
              </span>
              <div className="grid">
                <span className="text-sm font-medium">{t(step.status)}</span>
                <time dateTime={step.at} className="text-xs text-text-3">
                  {fmt(step.at, "datetime")}
                </time>
                {step.note && <span className="text-xs text-text-2">{step.note}</span>}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/funds/transactions" className={buttonVariants({ variant: "outline", block: true })}>
          {t("backToFunds")}
        </Link>
        {kind === "deposit" && done && (
          <Link href="/funds/deposit" className={buttonVariants({ block: true })}>
            {t("newDeposit")}
          </Link>
        )}
      </div>
      <Link
        href={`/help/tickets?new=1&tx=${tx.id}` as never}
        className="flex items-center justify-center gap-2 text-sm text-text-2 underline-offset-4 hover:underline"
      >
        <LifeBuoy aria-hidden className="size-4" /> {t("support")}.{" "}
        {t("supportBody", { reference: tx.reference })}
      </Link>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const cls = "size-12";
  if (status === "approved") return <CircleCheck aria-hidden className={cn(cls, "text-success")} />;
  if (["rejected", "failed", "cancelled"].includes(status))
    return <CircleX aria-hidden className={cn(cls, "text-danger")} />;
  return (
    <LoaderCircle
      aria-hidden
      className={cn(cls, "animate-spin text-primary-text motion-reduce:animate-none")}
    />
  );
}

function StepIcon({ status }: { status: string }) {
  if (status === "approved") return <CircleCheck aria-hidden className="size-4" />;
  if (["rejected", "failed", "cancelled"].includes(status)) return <CircleX aria-hidden className="size-4" />;
  return <CircleDashed aria-hidden className="size-4" />;
}

function HandoffPanel({ handoff, tx }: { handoff: Handoff; tx: TransactionDetail }) {
  const t = useTranslations("funds.handoff");
  const tc = useTranslations("common");
  const amount = formatMoney(tx.amount);

  if (handoff.kind === "crypto") {
    return (
      <Card className="grid gap-4">
        <CardTitle>{t("cryptoTitle", { asset: handoff.asset, network: handoff.network })}</CardTitle>
        <p className="text-sm text-text-2">
          {t("cryptoBody", { amount: `${formatNumber(tx.amount, 2)} ${handoff.asset}` })}
        </p>
        <div className="grid justify-items-center gap-3">
          <div className="rounded-lg bg-qr-bg p-3">
            <QRCodeSVG
              value={handoff.address}
              size={176}
              role="img"
              aria-label={t("qrAlt")}
              bgColor="transparent"
              fgColor="currentColor"
              className="text-qr-ink"
            />
          </div>
        </div>
        <dl className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <dt className="text-text-3">{t("address")}</dt>
            <dd className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
              <span className="font-mono text-sm break-all">{handoff.address}</span>
              <CopyButton
                value={handoff.address}
                label={tc("copyValue", { label: t("address").toLowerCase() })}
              />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-3">{t("network")}</dt>
            <dd className="font-medium">{handoff.network}</dd>
          </div>
        </dl>
        <div className="flex gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-text" role="note">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("warning", { asset: handoff.asset, network: handoff.network })}
        </div>
      </Card>
    );
  }

  if (handoff.kind === "bank") {
    const rows: [string, string, boolean][] = [
      [t("beneficiary"), handoff.beneficiary, true],
      [t("bank"), handoff.bankName, false],
      [t("accountNumber"), handoff.accountNumber, true],
      [t("ifsc"), handoff.ifsc, true],
      [t("reference"), handoff.reference, true],
    ];
    return (
      <Card className="grid gap-4">
        <CardTitle>{t("bankTitle")}</CardTitle>
        <p className="text-sm text-text-2">
          {t("bankBody", {
            amount:
              tx.localAmount && tx.localCurrency
                ? formatMoney(tx.localAmount, tx.localCurrency, { decimals: 0 })
                : amount,
          })}
        </p>
        <dl className="grid gap-2 text-sm">
          {rows.map(([k, v, copy]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2"
            >
              <dt className="text-text-3">{k}</dt>
              <dd className="flex items-center gap-1 font-medium tabular">
                {v}
                {copy && <CopyButton value={v} label={tc("copyValue", { label: k.toLowerCase() })} />}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4">
      <CardTitle>{t("redirectTitle", { provider: handoff.provider })}</CardTitle>
      <p className="text-sm text-text-2">{t("redirectBody", { provider: handoff.provider })}</p>
      <a href={handoff.url} className={buttonVariants({ block: true })}>
        <ExternalLink aria-hidden /> {t("redirectCta", { provider: handoff.provider })}
      </a>
    </Card>
  );
}
