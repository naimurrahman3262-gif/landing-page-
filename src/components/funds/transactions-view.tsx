"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataColumnMeta } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountName, refName } from "@/lib/accounts";
import { apiFetch } from "@/lib/api/client";
import { useAccounts } from "@/lib/api/queries/accounts";
import { filtersQuery, useTransactions, useTransactionSummary } from "@/lib/api/queries/funds";
import { TransactionPage, type Transaction } from "@/lib/api/schemas";
import { localToday, rangeToInstants, type RangePreset } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { useFormatDate, useTimeZone } from "@/lib/format-context";
import { cn } from "@/lib/utils";
import { retryHref, TransactionRow } from "./transaction-row";
import { TransactionSheet } from "./transaction-sheet";

const PRESETS = ["today", "7d", "30d", "month", "all"] as const;
const TYPES = ["deposit", "withdrawal", "transfer"] as const;
const STATUSES = ["approved", "pending", "processing", "rejected", "failed", "cancelled"] as const;
const SIZES = [25, 50, 100] as const;
const TYPE_ICON = { deposit: ArrowDownToLine, withdrawal: ArrowUpFromLine, transfer: ArrowLeftRight };
const VOIDED = new Set(["rejected", "failed", "cancelled"]);

/** "1 2 3 … 29": first, last, current ±1, with gaps (old bug: wrong pagination). */
export function pageList(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  if (page <= 3) [2, 3].forEach((n) => n <= pages && keep.add(n));
  if (page >= pages - 2) [pages - 1, pages - 2].forEach((n) => n >= 1 && keep.add(n));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export function TransactionsView() {
  const t = useTranslations("funds.tx");
  const tf = useTranslations("funds");
  const tt = useTranslations("transactions");
  const ts = useTranslations("status");
  const fmt = useFormatDate();
  const timeZone = useTimeZone();
  const accounts = useAccounts().data?.items;
  const [f, setF] = useQueryStates({
    range: parseAsStringLiteral([...PRESETS, "custom"] as const).withDefault("30d"),
    from: parseAsString,
    to: parseAsString,
    type: parseAsArrayOf(parseAsStringLiteral(TYPES)).withDefault([]),
    status: parseAsArrayOf(parseAsStringLiteral(STATUSES)).withDefault([]),
    account: parseAsString,
    q: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
    size: parseAsInteger.withDefault(25),
    /** Open transaction (deep-linkable, e.g. from a support ticket). */
    tx: parseAsString,
  });
  const openId = f.tx;
  const setOpenId = useCallback((id: string | null) => void setF({ tx: id }), [setF]);
  const [search, setSearch] = useState(f.q);
  const [exporting, setExporting] = useState(false);

  // Debounce the reference search into the URL.
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== f.q) void setF({ q: search || null, page: null });
    }, 300);
    return () => clearTimeout(id);
  }, [search, f.q, setF]);

  // Dates resolve in the user's zone, so "Today" is their today.
  const instants = useMemo(
    () =>
      f.range === "custom" && f.from && f.to
        ? rangeToInstants({ from: f.from, to: f.to }, timeZone)
        : rangeToInstants({ preset: (f.range === "custom" ? "30d" : f.range) as RangePreset }, timeZone),
    [f.range, f.from, f.to, timeZone],
  );
  const pageSize = (SIZES as readonly number[]).includes(f.size) ? f.size : 25;
  const filters = {
    from: instants.from,
    to: instants.to,
    type: f.type,
    status: f.status,
    account: f.account,
    q: f.q,
  };
  const list = useTransactions({ ...filters, page: f.page, pageSize });
  const summary = useTransactionSummary(filters);

  // Dev invariant (brief §8): summary = Σ approved rows, checkable when all rows fit on one page.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !list.data || !summary.data || list.isPlaceholderData)
      return;
    if (list.data.total > list.data.items.length) return;
    const sum = (type: string) =>
      Math.round(
        list.data.items
          .filter((x) => x.type === type && x.status === "approved")
          .reduce((s, x) => s + x.amount, 0) * 100,
      ) / 100;
    if (
      sum("deposit") !== summary.data.approvedDeposits ||
      sum("withdrawal") !== summary.data.approvedWithdrawals
    ) {
      console.error("[invariant] transaction summary ≠ Σ approved filtered rows");
    }
  }, [list.data, summary.data, list.isPlaceholderData]);

  const periodLabel =
    f.range === "custom" && f.from && f.to
      ? t("periods.custom", {
          from: formatDate(`${f.from}T12:00:00Z`, "date"),
          to: formatDate(`${f.to}T12:00:00Z`, "date"),
        })
      : t(`periods.${f.range === "custom" ? "30d" : f.range}`);
  const filtersActive = f.type.length > 0 || f.status.length > 0 || !!f.account || !!f.q;

  const columns = useMemo<ColumnDef<Transaction, unknown>[]>(
    () => [
      {
        id: "date",
        header: t("cols.date"),
        enableSorting: false,
        cell: ({ row }) => (
          <time dateTime={row.original.createdAt}>{fmt(row.original.createdAt, "datetime")}</time>
        ),
      },
      {
        id: "type",
        header: t("cols.type"),
        enableSorting: false,
        cell: ({ row }) => {
          const Icon = TYPE_ICON[row.original.type];
          return (
            <span className="inline-flex items-center gap-2">
              <Icon aria-hidden className="size-4 text-text-3" /> {tt(`types.${row.original.type}`)}
            </span>
          );
        },
      },
      {
        id: "account",
        header: t("cols.account"),
        enableSorting: false,
        cell: ({ row }) => {
          const x = row.original;
          return x.type === "transfer" && x.counterparty
            ? tt("transferBetween", {
                from: refName(x.account, tf("wallet"), accounts),
                to: refName(x.counterparty, tf("wallet"), accounts),
              })
            : refName(x.account, tf("wallet"), accounts);
        },
      },
      {
        id: "method",
        header: t("cols.method"),
        enableSorting: false,
        cell: ({ row }) => row.original.method ?? "—",
      },
      {
        id: "amount",
        header: t("cols.amount"),
        enableSorting: false,
        meta: { numeric: true } satisfies DataColumnMeta,
        cell: ({ row }) => {
          const x = row.original;
          return (
            <MoneyText
              amount={x.type === "withdrawal" ? -x.amount : x.amount}
              tone={x.type === "transfer" ? "plain" : "direction"}
              sign={x.type === "transfer" ? "never" : "always"}
              voided={VOIDED.has(x.status)}
              size="sm"
            />
          );
        },
      },
      {
        id: "status",
        header: t("cols.status"),
        enableSorting: false,
        cell: ({ row }) => {
          const x = row.original;
          return (
            <div className="grid max-w-72 justify-items-start gap-1 whitespace-normal">
              <StatusBadge status={x.status} />
              {x.reason && (x.status === "rejected" || x.status === "failed") && (
                <span className="text-xs text-danger-text">
                  {x.reason}{" "}
                  <a
                    href={retryHref(x)}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-primary-text underline-offset-4 hover:underline"
                  >
                    {tt("fixRetry")}
                  </a>
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <RowMenu tx={row.original} onOpen={() => setOpenId(row.original.id)} />,
      },
    ],
    [t, tt, tf, fmt, accounts, setOpenId],
  );

  async function exportCsv() {
    setExporting(true);
    try {
      const rows: Transaction[] = [];
      for (let page = 1; ; page++) {
        const res = TransactionPage.parse(
          await apiFetch(`/transactions?${filtersQuery({ ...filters, page, pageSize: 100 })}`),
        );
        rows.push(...res.items);
        if (rows.length >= res.total || res.items.length === 0) break;
      }
      const esc = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = [
        "Date",
        "Reference",
        "Type",
        "Account",
        "Counterparty",
        "Method",
        "Amount (USD)",
        "Fee (USD)",
        "Status",
        "Reason",
      ];
      const lines = rows.map((x) =>
        [
          fmt(x.createdAt, "datetime"),
          x.reference,
          tt(`types.${x.type}`),
          refName(x.account, tf("wallet"), accounts),
          x.counterparty ? refName(x.counterparty, tf("wallet"), accounts) : "",
          x.method ?? "",
          (x.type === "withdrawal" ? -x.amount : x.amount).toFixed(2),
          x.fee.toFixed(2),
          ts(x.status),
          x.reason ?? "",
        ]
          .map(esc)
          .join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `winprofx-transactions-${localToday(timeZone)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const toggle = (key: "type" | "status", value: string) => {
    const cur: string[] = f[key];
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    void setF({ [key]: next.length ? next : null, page: null } as never);
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" loading={exporting}>
                <Download aria-hidden /> {t("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{periodLabel}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void exportCsv()}>{t("exportCsv")}</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/print/transactions?${filtersQuery(filters)}`} target="_blank" rel="noopener">
                  {t("exportPdf")}
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* ------------------------------- filters ------------------------------- */}
      <section aria-label={t("clear")} className="mb-6 grid gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <RangeFilter
            value={f.range}
            from={f.from}
            to={f.to}
            timeZone={timeZone}
            onPreset={(r) => void setF({ range: r === "30d" ? null : r, from: null, to: null, page: null })}
            onCustom={(from, to) => void setF({ range: "custom", from, to, page: null })}
          />
          <div className="grid gap-2 lg:w-56">
            <Label htmlFor="tx-account">{t("account")}</Label>
            <Select
              value={f.account ?? "all"}
              onValueChange={(v) => void setF({ account: v === "all" ? null : v, page: null })}
            >
              <SelectTrigger id="tx-account" className="min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allAccounts")}</SelectItem>
                <SelectItem value="wallet">{tf("wallet")}</SelectItem>
                {accounts
                  ?.filter((a) => a.kind === "live")
                  .map((a) => (
                    <SelectItem key={a.login} value={String(a.login)}>
                      {accountName(a)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative min-w-0 lg:ml-auto lg:w-64">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-3"
            />
            <Input
              type="search"
              aria-label={t("search")}
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChipGroup label={t("type")}>
            {TYPES.map((x) => (
              <Chip key={x} pressed={f.type.includes(x)} onClick={() => toggle("type", x)}>
                {tt(`types.${x}`)}
              </Chip>
            ))}
          </ChipGroup>
          <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <ChipGroup label={t("status")}>
            {STATUSES.map((x) => (
              <Chip key={x} pressed={f.status.includes(x)} onClick={() => toggle("status", x)}>
                {ts(x)}
              </Chip>
            ))}
          </ChipGroup>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                void setF({ type: null, status: null, account: null, q: null, page: null });
              }}
            >
              <X aria-hidden /> {t("clear")}
            </Button>
          )}
        </div>
      </section>

      {/* ------------------------------- summary ------------------------------- */}
      <section aria-label={t("summary.note")} className="mb-2 grid gap-3 sm:grid-cols-3">
        {(["deposits", "withdrawals", "net"] as const).map((k) => {
          const s = summary.data;
          const value =
            s &&
            (k === "deposits" ? (
              <MoneyText amount={s.approvedDeposits} size="lg" />
            ) : k === "withdrawals" ? (
              <MoneyText amount={s.approvedWithdrawals} size="lg" />
            ) : (
              <MoneyText amount={s.net} size="lg" tone="direction" sign="always" />
            ));
          const count =
            s && k !== "net"
              ? t("summary.count", {
                  count: k === "deposits" ? s.approvedDepositCount : s.approvedWithdrawalCount,
                })
              : undefined;
          return (
            <StatTile
              key={k}
              label={`${t(`summary.${k}`)} · ${periodLabel}`}
              value={
                <>
                  {value}
                  {count && <span className="block text-xs text-text-3">{count}</span>}
                </>
              }
              state={summary.isPending ? "loading" : summary.isError ? "error" : "ready"}
              errorAction={
                <Button variant="link" size="sm" onClick={() => summary.refetch()}>
                  {tf("tx.error")}
                </Button>
              }
            />
          );
        })}
      </section>
      <p className="mb-6 text-xs text-text-3">{t("summary.note")}</p>

      {/* -------------------------------- table -------------------------------- */}
      {list.isError ? (
        <ErrorState title={t("error")} onRetry={() => list.refetch()} retrying={list.isFetching} />
      ) : !data ? (
        <div className="h-96 animate-pulse rounded-lg bg-surface-1 motion-reduce:animate-none" aria-busy />
      ) : (
        <div
          className={cn(list.isFetching && list.isPlaceholderData && "opacity-60 transition-opacity")}
          aria-busy={list.isFetching || undefined}
        >
          <DataTable
            data={data.items}
            columns={columns}
            caption={`${t("title")} · ${periodLabel}`}
            getRowId={(x) => x.id}
            pageSize={pageSize}
            onRowClick={(x) => setOpenId(x.id)}
            renderCard={(x) => (
              <div>
                <TransactionRow tx={x} accounts={accounts} />
                <Button
                  variant="ghost"
                  size="sm"
                  block
                  onClick={() => setOpenId(x.id)}
                  aria-label={`${t("openDetails")}: ${x.reference}`}
                >
                  {t("openDetails")}
                </Button>
              </div>
            )}
            empty={
              <EmptyState
                icon={Receipt}
                title={filtersActive || f.range !== "all" ? t("empty") : t("emptyNone")}
                description={filtersActive || f.range !== "all" ? t("emptyBody") : t("emptyNoneBody")}
                action={
                  filtersActive && (
                    <Button
                      variant="outline"
                      onClick={() => void setF({ type: null, status: null, account: null, q: null })}
                    >
                      {t("clear")}
                    </Button>
                  )
                }
              />
            }
          />
          {data.total > 0 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-text-2">
                <span className="tabular">
                  {t("showing", {
                    from: (data.page - 1) * pageSize + 1,
                    to: Math.min(data.page * pageSize, data.total),
                    total: data.total,
                  })}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => void setF({ size: v === "25" ? null : Number(v), page: null })}
                >
                  <SelectTrigger aria-label={t("pageSize")} className="h-9 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {pages > 1 && (
                <nav
                  aria-label={t("pagination")}
                  className="flex flex-wrap items-center justify-center gap-1"
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("prev")}
                    disabled={data.page <= 1}
                    onClick={() => void setF({ page: data.page - 1 })}
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  {pageList(data.page, pages).map((n, i) =>
                    n === "gap" ? (
                      <span key={`gap-${i}`} aria-hidden className="px-1 text-text-3">
                        …
                      </span>
                    ) : (
                      <Button
                        key={n}
                        variant={n === data.page ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label={t("page", { page: n })}
                        aria-current={n === data.page ? "page" : undefined}
                        onClick={() => void setF({ page: n === 1 ? null : n })}
                        className="tabular"
                      >
                        {n}
                      </Button>
                    ),
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("next")}
                    disabled={data.page >= pages}
                    onClick={() => void setF({ page: data.page + 1 })}
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </nav>
              )}
            </div>
          )}
        </div>
      )}

      <TransactionSheet id={openId} onOpenChange={(o) => !o && setOpenId(null)} accounts={accounts} />
    </>
  );
}

function RowMenu({ tx, onOpen }: { tx: Transaction; onOpen: () => void }) {
  const t = useTranslations("funds.tx");
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stops the row click; the menu has its own keyboard handling
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("more", { reference: tx.reference })}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onOpen}>{t("openDetails")}</DropdownMenuItem>
          {tx.status === "approved" && (
            <DropdownMenuItem asChild>
              <a href={`/receipt/${tx.id}`} target="_blank" rel="noopener">
                {t("receipt")}
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={`/help/tickets?new=1&tx=${tx.id}`}>{t("contactSupport")}</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm text-text-3">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring",
        pressed
          ? "border-primary-border bg-primary-soft font-medium text-text-1"
          : "border-border text-text-2 hover:border-border-strong hover:text-text-1",
      )}
    >
      {children}
    </button>
  );
}

function RangeFilter({
  value,
  from,
  to,
  timeZone,
  onPreset,
  onCustom,
}: {
  value: string;
  from: string | null;
  to: string | null;
  timeZone: string;
  onPreset: (r: (typeof PRESETS)[number]) => void;
  onCustom: (from: string, to: string) => void;
}) {
  const t = useTranslations("funds.tx");
  const [open, setOpen] = useState(false);
  const today = localToday(timeZone);
  const [a, setA] = useState(from ?? "");
  const [b, setB] = useState(to ?? today);
  const valid = !!a && !!b && a <= b && b <= today;

  return (
    <div className="grid min-w-0 gap-2">
      <span id="tx-range" className="text-sm font-medium">
        {t("range")}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="max-w-full overflow-x-auto">
            <SegmentedControl
              aria-labelledby="tx-range"
              value={value}
              onValueChange={(v) =>
                v === "custom" ? setOpen(true) : onPreset(v as (typeof PRESETS)[number])
              }
            >
              {PRESETS.map((p) => (
                <SegmentedControlItem key={p} value={p}>
                  {t(`ranges.${p}`)}
                </SegmentedControlItem>
              ))}
              <SegmentedControlItem value="custom" onClick={() => setOpen(true)}>
                <CalendarRange aria-hidden /> {t("ranges.custom")}
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
        </PopoverAnchor>
        <PopoverContent className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="tx-from">{t("from")}</Label>
            <Input
              id="tx-from"
              type="date"
              max={b || today}
              value={a}
              onChange={(e) => setA(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tx-to">{t("to")}</Label>
            <Input
              id="tx-to"
              type="date"
              min={a}
              max={today}
              value={b}
              onChange={(e) => setB(e.target.value)}
            />
          </div>
          <Button
            disabled={!valid}
            onClick={() => {
              onCustom(a, b);
              setOpen(false);
            }}
          >
            {t("apply")}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
