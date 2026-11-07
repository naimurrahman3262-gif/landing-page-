"use client";

import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MoneyText } from "@/components/common/money-text";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/config/brand";
import { LEGAL } from "@/config/legal";
import { refName } from "@/lib/accounts";
import { apiFetch } from "@/lib/api/client";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useTransaction } from "@/lib/api/queries/funds";
import { TransactionPage, type Transaction } from "@/lib/api/schemas";
import { formatMoney } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { useUser } from "@/lib/user-context";

function PrintBar() {
  const t = useTranslations("funds.receipt");
  return (
    <div className="mb-6 flex justify-end print:hidden">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer aria-hidden /> {t("print")}
      </Button>
    </div>
  );
}

function Letterhead({ title }: { title: string }) {
  const user = useUser();
  const fmt = useFormatDate();
  const t = useTranslations("funds.receipt");
  return (
    <header className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
      <div>
        <p className="font-display text-xl font-bold">{BRAND}</p>
        {LEGAL.registeredName && <p className="text-xs text-text-3">{LEGAL.registeredName}</p>}
        {LEGAL.registeredAddress && <p className="text-xs text-text-3">{LEGAL.registeredAddress}</p>}
      </div>
      <div className="text-right">
        <h1 className="font-display text-lg font-bold">{title}</h1>
        <p className="text-xs text-text-3">{t("issued", { date: fmt(new Date(), "datetime") })}</p>
        <p className="text-xs text-text-3">
          {user.firstName} {user.lastName}
        </p>
      </div>
    </header>
  );
}

/** Receipt: approved transactions only (same rule everywhere). */
export function ReceiptView({ id }: { id: string }) {
  const t = useTranslations("funds.receipt");
  const tf = useTranslations("funds");
  const tt = useTranslations("transactions");
  const fmt = useFormatDate();
  const q = useTransaction(id);
  const accounts = useAccounts().data?.items;

  if (q.isPending) return <Skeleton className="h-80" />;
  if (!q.data || q.data.status !== "approved") return <p className="text-text-2">{t("notAvailable")}</p>;
  const tx = q.data;
  const rows: [string, string][] = [
    [tf("status.reference"), tx.reference],
    [tf("tx.cols.date"), fmt(tx.createdAt, "datetime")],
    [tf("tx.cols.type"), tt(`types.${tx.type}`)],
    [tf("tx.cols.account"), refName(tx.account, tf("wallet"), accounts)],
    ...(tx.counterparty
      ? ([[tf("review.destination"), refName(tx.counterparty, tf("wallet"), accounts)]] as [string, string][])
      : []),
    ...(tx.method ? ([[tf("tx.cols.method"), tx.method]] as [string, string][]) : []),
    ...(tx.destinationMasked ? ([[tf("tx.destination"), tx.destinationMasked]] as [string, string][]) : []),
    [tf("review.amount"), formatMoney(tx.amount)],
    [tf("review.fee"), formatMoney(tx.fee)],
    [tf("tx.net"), formatMoney(Math.round((tx.amount - tx.fee) * 100) / 100)],
  ];
  return (
    <>
      <PrintBar />
      <Letterhead title={t("title")} />
      <div className="mb-6 flex items-center gap-3">
        <MoneyText amount={tx.amount} size="xl" />
        <StatusBadge status={tx.status} />
      </div>
      <dl className="grid text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-text-3">{k}</dt>
            <dd className="font-medium tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** PDF export: the browser's print-to-PDF of the current filters (no PDF library). */
export function TransactionsPrintView() {
  const t = useTranslations("funds.tx");
  const tf = useTranslations("funds");
  const tt = useTranslations("transactions");
  const fmt = useFormatDate();
  const params = useSearchParams();
  const accounts = useAccounts().data?.items;
  const [rows, setRows] = useState<Transaction[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Transaction[] = [];
      for (let page = 1; ; page++) {
        const q = new URLSearchParams(params);
        q.set("page", String(page));
        q.set("pageSize", "100");
        const res = TransactionPage.parse(await apiFetch(`/transactions?${q}`));
        all.push(...res.items);
        if (all.length >= res.total || res.items.length === 0) break;
      }
      if (!cancelled) setRows(all);
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (rows && rows.length > 0) setTimeout(() => window.print(), 300);
  }, [rows]);

  return (
    <>
      <PrintBar />
      <Letterhead title={t("title")} />
      {!rows ? (
        <p className="text-text-2">{t("exporting")}</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-2">{t("cols.date")}</th>
              <th className="py-2 pr-2">{t("cols.reference")}</th>
              <th className="py-2 pr-2">{t("cols.type")}</th>
              <th className="py-2 pr-2">{t("cols.account")}</th>
              <th className="py-2 pr-2">{t("cols.method")}</th>
              <th className="py-2 pr-2 text-right">{t("cols.amount")}</th>
              <th className="py-2">{t("cols.status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id} className="border-b border-border">
                <td className="py-1.5 pr-2">{fmt(x.createdAt, "datetime")}</td>
                <td className="py-1.5 pr-2 tabular">{x.reference}</td>
                <td className="py-1.5 pr-2">{tt(`types.${x.type}`)}</td>
                <td className="py-1.5 pr-2">{refName(x.account, tf("wallet"), accounts)}</td>
                <td className="py-1.5 pr-2">{x.method ?? "—"}</td>
                <td className="py-1.5 pr-2 text-right tabular">
                  {formatMoney(x.type === "withdrawal" ? -x.amount : x.amount, "USD", {
                    sign: x.type === "transfer" ? "never" : "always",
                  })}
                </td>
                <td className="py-1.5">{x.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
