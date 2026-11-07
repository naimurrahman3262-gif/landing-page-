"use client";

import { CalendarRange, CandlestickChart, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountName, sortAccounts } from "@/lib/accounts";
import { useAccounts } from "@/lib/api/queries/accounts";
import {
  useClosedDeals,
  useOpenPositions,
  usePendingOrders,
  useTradingSummary,
  type Range,
} from "@/lib/api/queries/trading";
import { formatMoney, formatNumber, formatPercent, PLACEHOLDER } from "@/lib/format";
import { useDealColumns, useOrderColumns, usePositionColumns } from "./position-columns";

// Charts are heavy: load them only when needed (§12).
const HistoryCharts = dynamic(() => import("./history-charts"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-72" />
      ))}
    </div>
  ),
});

const TABS = ["open", "pending", "closed"] as const;
const PRESETS = ["7d", "30d", "90d"] as const;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Dev-only invariant (brief §8): log when a KPI doesn't match its rows. */
function useInvariant(ok: boolean | undefined, message: string) {
  useEffect(() => {
    if (ok === false && process.env.NODE_ENV !== "production") console.error(`[invariant] ${message}`);
  }, [ok, message]);
}

export function PositionsView() {
  const t = useTranslations("positions");
  const ta = useTranslations("accounts");
  const accounts = useAccounts();
  const [params, setParams] = useQueryStates({
    account: parseAsInteger,
    tab: parseAsStringLiteral(TABS).withDefault("open"),
    range: parseAsStringLiteral(PRESETS).withDefault("30d"),
    from: parseAsString,
    to: parseAsString,
  });

  // Live accounts first (largest equity is the default), then demo.
  const selectable = useMemo(() => {
    if (!accounts.data) return [];
    const open = accounts.data.items.filter((a) => !a.archived);
    return [
      ...sortAccounts(
        open.filter((a) => a.kind === "live"),
        "equityDesc",
      ),
      ...sortAccounts(
        open.filter((a) => a.kind === "demo"),
        "equityDesc",
      ),
    ];
  }, [accounts.data]);
  const account = selectable.find((a) => a.login === params.account) ?? selectable[0];
  const login = account?.login;
  const range: Range =
    params.from && params.to ? { from: params.from, to: params.to } : { preset: params.range };

  const summary = useTradingSummary(login, range);
  const positions = useOpenPositions(login);
  const orders = usePendingOrders(login, params.tab === "pending");
  const deals = useClosedDeals(login, range, params.tab === "closed");

  const positionCols = usePositionColumns(account?.currency ?? "USD");
  const orderCols = useOrderColumns();
  const dealCols = useDealColumns(account?.currency ?? "USD");

  // KPIs come from the same source as the terminal, and must equal the rows.
  useInvariant(
    summary.data && positions.data
      ? round2(positions.data.reduce((s, p) => s + p.profit + p.swap, 0)) === summary.data.openPnl
      : undefined,
    "open P/L KPI ≠ Σ open position P/L",
  );
  useInvariant(
    summary.data && deals.data
      ? round2(deals.data.reduce((s, d) => s + d.profit + d.swap + d.commission, 0)) ===
          summary.data.realizedPnl && deals.data.length === summary.data.closedTrades
      : undefined,
    "realized P/L / closed trades KPI ≠ closed deal rows",
  );

  if (accounts.isPending) {
    return (
      <>
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (accounts.isError) {
    return (
      <>
        <PageHeader title={t("title")} />
        <ErrorState title={t("error")} onRetry={() => accounts.refetch()} retrying={accounts.isFetching} />
      </>
    );
  }
  if (!account) {
    return (
      <>
        <PageHeader title={t("title")} />
        <EmptyState
          icon={CandlestickChart}
          title={t("noAccounts")}
          description={t("noAccountsBody")}
          action={
            <Link href="/trading/accounts/new" className={buttonVariants()}>
              <Plus aria-hidden /> {ta("openAccount")}
            </Link>
          }
        />
      </>
    );
  }

  const cur = account.currency;
  const s = summary.data;
  const state = summary.isPending ? "loading" : summary.isError ? "error" : "ready";
  const money = (v: number | undefined, direction = false) =>
    v === undefined ? null : (
      <MoneyText amount={v} currency={cur} size="lg" tone={direction ? "direction" : "plain"} />
    );
  const retry = (
    <Button variant="link" size="sm" onClick={() => summary.refetch()}>
      {t("error")}
    </Button>
  );
  const kpi = (label: string, value: React.ReactNode) => (
    <StatTile label={label} value={value} state={state} syncedAt={s?.syncedAt} errorAction={retry} />
  );
  const name = accountName(account);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="grid w-full min-w-0 gap-2 md:w-80">
          <Label htmlFor="pos-account">{t("account")}</Label>
          <Select value={String(account.login)} onValueChange={(v) => void setParams({ account: Number(v) })}>
            <SelectTrigger id="pos-account" className="min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectable.map((a) => (
                <SelectItem key={a.login} value={String(a.login)}>
                  {accountName(a)} · {ta(`types.${a.type}`)}
                  {a.kind === "demo" ? ` (${ta("tabs.demo")})` : ""} · {formatMoney(a.balance, a.currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <RangePicker
          range={range}
          onPreset={(p) => void setParams({ range: p === "30d" ? null : p, from: null, to: null })}
          onCustom={(from, to) => void setParams({ from, to })}
        />
      </div>

      <section aria-label={t("title")} className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpi(t("kpi.equity"), money(s?.equity))}
        {kpi(t("kpi.balance"), money(s?.balance))}
        {kpi(t("kpi.credit"), money(s?.credit))}
        {kpi(t("kpi.margin"), money(s?.margin))}
        {kpi(t("kpi.freeMargin"), money(s?.freeMargin))}
        {kpi(
          t("kpi.marginLevel"),
          s && (
            <span className="font-display text-2xl font-bold tabular">
              {s.marginLevel === null ? PLACEHOLDER : formatPercent(s.marginLevel)}
            </span>
          ),
        )}
        {kpi(`${t("kpi.realized")} (${t("kpi.period")})`, money(s?.realizedPnl, true))}
        {kpi(
          `${t("kpi.closedTrades")} (${t("kpi.period")})`,
          s && (
            <span className="font-display text-2xl font-bold tabular">{formatNumber(s.closedTrades)}</span>
          ),
        )}
      </section>

      <div className="mb-8">
        {summary.isError ? (
          <ErrorState compact title={t("charts.error")} onRetry={() => summary.refetch()} />
        ) : s ? (
          <HistoryCharts summary={s} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        )}
      </div>

      <Tabs
        value={params.tab}
        onValueChange={(v) => void setParams({ tab: v === "open" ? null : (v as (typeof TABS)[number]) })}
      >
        <TabsList aria-label={t("title")}>
          {TABS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(`tabs.${k}`)}
              {k === "open" && positions.data && (
                <span className="rounded-full bg-surface-3 px-1.5 text-xs text-text-2 tabular">
                  {positions.data.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="open">
          <TabBody query={positions} title={t("tabs.open")}>
            {(rows) => (
              <DataTable
                data={rows}
                columns={positionCols}
                caption={t("tabs.open")}
                getRowId={(p) => String(p.ticket)}
                csvName={`winprofx-${account.login}-open-positions`}
                empty={
                  <EmptyState
                    icon={CandlestickChart}
                    title={t("empty.open", { account: name })}
                    description={t("emptyBody")}
                  />
                }
              />
            )}
          </TabBody>
        </TabsContent>
        <TabsContent value="pending">
          <TabBody query={orders} title={t("tabs.pending")}>
            {(rows) => (
              <DataTable
                data={rows}
                columns={orderCols}
                caption={t("tabs.pending")}
                getRowId={(o) => String(o.ticket)}
                csvName={`winprofx-${account.login}-pending-orders`}
                empty={
                  <EmptyState
                    icon={CandlestickChart}
                    title={t("empty.pending", { account: name })}
                    description={t("emptyBody")}
                  />
                }
              />
            )}
          </TabBody>
        </TabsContent>
        <TabsContent value="closed">
          <TabBody query={deals} title={t("tabs.closed")}>
            {(rows) => (
              <DataTable
                data={rows}
                columns={dealCols}
                caption={t("tabs.closed")}
                getRowId={(d) => String(d.ticket)}
                initialSorting={[{ id: "closeTime", desc: true }]}
                csvName={`winprofx-${account.login}-closed-trades`}
                empty={
                  <EmptyState
                    icon={CandlestickChart}
                    title={t("empty.closed", { account: name })}
                    description={t("emptyBody")}
                  />
                }
              />
            )}
          </TabBody>
        </TabsContent>
      </Tabs>
    </>
  );
}

function TabBody<T>({
  query,
  title,
  children,
}: {
  query: { isPending: boolean; isError: boolean; data?: T[]; refetch: () => unknown; isFetching: boolean };
  title: string;
  children: (rows: T[]) => React.ReactNode;
}) {
  const t = useTranslations("positions");
  if (query.isError)
    return (
      <ErrorState
        compact
        title={`${title}: ${t("error")}`}
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
      />
    );
  if (query.isPending || !query.data) return <Skeleton className="h-40" />;
  return <>{children(query.data)}</>;
}

/* ------------------------------ range picker ----------------------------- */

function RangePicker({
  range,
  onPreset,
  onCustom,
}: {
  range: Range;
  onPreset: (p: (typeof PRESETS)[number]) => void;
  onCustom: (from: string, to: string) => void;
}) {
  const t = useTranslations("positions");
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("from" in range ? range.from : "");
  const [to, setTo] = useState("to" in range ? range.to : today);
  const value = "preset" in range ? range.preset : "custom";
  const valid = !!from && !!to && from <= to && to <= today;

  return (
    <div className="grid gap-2">
      <span id="pos-range" className="text-sm font-medium">
        {t("range")}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-labelledby="pos-range"
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
                <CalendarRange aria-hidden />{" "}
                {value === "custom" && "from" in range ? `${range.from} – ${range.to}` : t("ranges.custom")}
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
        </PopoverAnchor>
        <PopoverContent align="end" className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="range-from">{t("from")}</Label>
            <Input
              id="range-from"
              type="date"
              max={to || today}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="range-to">{t("to")}</Label>
            <Input
              id="range-to"
              type="date"
              min={from}
              max={today}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button
            disabled={!valid}
            onClick={() => {
              onCustom(from, to);
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
