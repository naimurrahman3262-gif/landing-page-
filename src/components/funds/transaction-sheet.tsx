"use client";

import { CircleCheck, CircleDashed, CircleX, LifeBuoy, Receipt, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/common/copy-button";
import { ErrorState } from "@/components/common/error-state";
import { MoneyText } from "@/components/common/money-text";
import { StatusBadge } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { refName } from "@/lib/accounts";
import { useTransaction } from "@/lib/api/queries/funds";
import type { Account } from "@/lib/api/schemas";
import { formatMoney } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";
import { retryHref } from "./transaction-row";

/**
 * Transaction details (brief §6.5): amount, fee, net, rate, method, masked
 * destination, reference with copy, timeline, reason, receipt (approved only,
 * same rule everywhere) and Contact support prefilled with the transaction ID.
 */
export function TransactionSheet({
  id,
  onOpenChange,
  accounts,
}: {
  id: string | null;
  onOpenChange: (open: boolean) => void;
  accounts?: Account[];
}) {
  const t = useTranslations("funds.tx");
  const tf = useTranslations("funds");
  const tt = useTranslations("transactions");
  const ts = useTranslations("funds.status");
  const fmt = useFormatDate();
  const q = useTransaction(id ?? undefined, !!id);
  const tx = q.data;

  const rows: [string, ReactNode][] = tx
    ? [
        [tf("tx.cols.type"), tt(`types.${tx.type}`)],
        [tf("tx.cols.date"), fmt(tx.createdAt, "datetime")],
        [
          tf("tx.cols.account"),
          tx.type === "transfer" && tx.counterparty
            ? tt("transferBetween", {
                from: refName(tx.account, tf("wallet"), accounts),
                to: refName(tx.counterparty, tf("wallet"), accounts),
              })
            : refName(tx.account, tf("wallet"), accounts),
        ],
        ...(tx.method ? ([[tf("tx.cols.method"), tx.method]] as [string, ReactNode][]) : []),
        [tf("review.amount"), formatMoney(tx.amount)],
        [tf("review.fee"), formatMoney(tx.fee)],
        [t("net"), formatMoney(Math.round((tx.amount - tx.fee) * 100) / 100)],
        ...(tx.rate && tx.localCurrency
          ? ([
              [
                t("rate"),
                tf("review.rateValue", {
                  rate: formatMoney(tx.rate, tx.localCurrency, { decimals: tx.rate >= 100 ? 0 : 2 }),
                }),
              ],
              [
                t("localAmount"),
                formatMoney(tx.localAmount ?? 0, tx.localCurrency, { decimals: tx.rate >= 100 ? 0 : 2 }),
              ],
            ] as [string, ReactNode][])
          : []),
        ...(tx.destinationMasked
          ? ([[t("destination"), tx.destinationMasked]] as [string, ReactNode][])
          : []),
      ]
    : [];

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("details")}</SheetTitle>
          <SheetDescription>{tx ? t("detailsFor", { reference: tx.reference }) : " "}</SheetDescription>
        </SheetHeader>
        <SheetBody className="grid content-start gap-6">
          {q.isPending && <Skeleton className="h-72" />}
          {q.isError && <ErrorState compact title={t("error")} onRetry={() => q.refetch()} />}
          {tx && (
            <>
              <div className="grid justify-items-start gap-2">
                <MoneyText
                  amount={tx.type === "withdrawal" ? -tx.amount : tx.amount}
                  tone={tx.type === "transfer" ? "plain" : "direction"}
                  sign={tx.type === "transfer" ? "never" : "always"}
                  voided={["rejected", "failed", "cancelled"].includes(tx.status)}
                  size="xl"
                />
                <StatusBadge status={tx.status} />
                {tx.reason && (
                  <div className="grid gap-1">
                    <p className="text-sm text-danger-text">{tx.reason}</p>
                    {["rejected", "failed"].includes(tx.status) && (
                      <Link
                        href={retryHref(tx) as never}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
                      >
                        <RotateCcw aria-hidden /> {tt("fixRetry")}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
                <span className="grid">
                  <span className="text-xs text-text-3">{ts("reference")}</span>
                  <span className="font-display font-medium tabular">{tx.reference}</span>
                </span>
                <CopyButton value={tx.reference} label={ts("copyReference")} />
              </div>

              <dl className="grid gap-0 text-sm">
                {rows.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 border-b border-border py-2.5 last:border-0"
                  >
                    <dt className="text-text-3">{k}</dt>
                    <dd className="text-right font-medium tabular">{v}</dd>
                  </div>
                ))}
              </dl>

              <section aria-labelledby="tx-timeline">
                <h3 id="tx-timeline" className="mb-3 font-display font-bold">
                  {t("timeline")}
                </h3>
                <ol className="grid gap-3">
                  {tx.timeline.map((step, i) => (
                    <li key={`${step.status}-${i}`} className="flex gap-3 text-sm">
                      {step.status === "approved" ? (
                        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                      ) : ["rejected", "failed", "cancelled"].includes(step.status) ? (
                        <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
                      ) : (
                        <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-text-3" />
                      )}
                      <span className="grid">
                        <span className="font-medium">{ts(step.status)}</span>
                        <time dateTime={step.at} className="text-xs text-text-3">
                          {fmt(step.at, "datetime")}
                        </time>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </SheetBody>
        {tx && (
          <SheetFooter className="grid gap-2 sm:grid-cols-2">
            {tx.status === "approved" ? (
              <a
                href={`/receipt/${tx.id}`}
                target="_blank"
                rel="noopener"
                className={buttonVariants({ variant: "outline" })}
              >
                <Receipt aria-hidden /> {t("receipt")}
              </a>
            ) : (
              <p className="self-center text-xs text-text-3">{t("receiptOnly")}</p>
            )}
            <Link
              href={`/help/tickets?new=1&tx=${tx.id}` as never}
              className={buttonVariants({ variant: "outline" })}
            >
              <LifeBuoy aria-hidden /> {t("contactSupport")}
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
