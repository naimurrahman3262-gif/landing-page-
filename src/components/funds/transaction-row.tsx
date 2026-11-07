"use client";

import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MoneyText } from "@/components/common/money-text";
import { StatusBadge } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { refName } from "@/lib/accounts";
import type { Account, Transaction } from "@/lib/api/schemas";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";

const ICON = { deposit: ArrowDownToLine, withdrawal: ArrowUpFromLine, transfer: ArrowLeftRight };
const VOIDED = new Set(["rejected", "failed", "cancelled"]);

/** Where "Fix and retry" goes: the original flow, prefilled from the transaction. */
export function retryHref(tx: Transaction): string {
  const base =
    tx.type === "deposit"
      ? "/funds/deposit"
      : tx.type === "withdrawal"
        ? "/funds/withdraw"
        : "/funds/transfer";
  return `${base}?retry=${tx.id}`;
}

/**
 * One transaction (Home recent activity; Transactions on mobile in Phase 5).
 * Amount sign = direction (+ in, − out, none for transfers between own
 * accounts). Status = badge only. Failed/rejected/cancelled amounts are muted
 * and struck through, never green (old bug: green "+$1.04" on a rejected deposit).
 * The rejection reason shows inline with "Fix and retry".
 */
export function TransactionRow({ tx, accounts }: { tx: Transaction; accounts?: Account[] }) {
  const t = useTranslations("transactions");
  const fmt = useFormatDate();
  const Icon = ICON[tx.type];
  const wallet = t("wallet");
  const where =
    tx.type === "transfer" && tx.counterparty
      ? t("transferBetween", {
          from: refName(tx.account, wallet, accounts),
          to: refName(tx.counterparty, wallet, accounts),
        })
      : refName(tx.account, wallet, accounts);
  const voided = VOIDED.has(tx.status);
  const signed = tx.type === "deposit" ? tx.amount : tx.type === "withdrawal" ? -tx.amount : tx.amount;

  return (
    <div className="flex gap-3 py-3" data-testid="transaction-row">
      <span className="mt-0.5 grid size-9 shrink-0 place-content-center rounded-full bg-surface-3 text-text-2">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate text-sm font-medium text-text-1">
              {t(`types.${tx.type}`)}
              {tx.method && <span className="text-text-2"> · {tx.method}</span>}
            </p>
            <p className="truncate text-xs text-text-3">
              {where} · <time dateTime={tx.createdAt}>{fmt(tx.createdAt, "datetime")}</time>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <MoneyText
              amount={signed}
              currency={tx.currency}
              tone={tx.type === "transfer" ? "plain" : "direction"}
              sign={tx.type === "transfer" ? "never" : "always"}
              voided={voided}
              size="sm"
            />
            <StatusBadge status={tx.status} />
          </div>
        </div>
        {tx.reason && (tx.status === "rejected" || tx.status === "failed") && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <p className="text-danger-text">
              <span className="sr-only">{t("reason")}: </span>
              {tx.reason}
            </p>
            <Link
              href={retryHref(tx) as never}
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto text-xs")}
            >
              <RotateCcw aria-hidden className="size-3.5!" /> {t("fixRetry")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
