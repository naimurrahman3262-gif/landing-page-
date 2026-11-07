"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, FlaskConical, LayoutGrid, List, Plus, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataColumnMeta } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountName, filterAccounts, sortAccounts, type AccountSort } from "@/lib/accounts";
import { useAccounts } from "@/lib/api/queries/accounts";
import type { Account } from "@/lib/api/schemas";
import { formatAccountId, formatLeverage, formatMoney } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { AccountCard } from "./account-card";
import { AccountMenu } from "./account-menu";

const TABS = ["live", "demo", "archived"] as const;
const SORTS = ["equityDesc", "equityAsc", "newest", "login"] as const;
export const VIEW_COOKIE = "wpx_accounts_view";
const COUNT_KEY = "wpx:accounts-count";

/** G20: skeleton count = last known count, so nothing jumps when data lands. */
function useLastKnownCount(count: number | undefined): number {
  const [last, setLast] = useState(4);
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(COUNT_KEY));
      if (stored > 0) setLast(Math.min(stored, 12));
    } catch {}
  }, []);
  useEffect(() => {
    if (count === undefined) return;
    try {
      localStorage.setItem(COUNT_KEY, String(count));
    } catch {}
  }, [count]);
  return last;
}

export function AccountsView({ initialView }: { initialView: "grid" | "table" }) {
  const t = useTranslations("accounts");
  const router = useRouter();
  const fmt = useFormatDate();
  const query = useAccounts();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("live"));
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [type, setType] = useQueryState("type", parseAsString.withDefault("all"));
  const [sort, setSort] = useQueryState("sort", parseAsStringLiteral(SORTS).withDefault("equityDesc"));
  const [view, setView] = useState(initialView);

  const tabAll = useMemo(
    () => (query.data ? filterAccounts(query.data.items, { tab, query: "", type: "all" }) : []),
    [query.data, tab],
  );
  const visible = useMemo(
    () =>
      query.data
        ? sortAccounts(filterAccounts(query.data.items, { tab, query: q, type }), sort as AccountSort)
        : [],
    [query.data, tab, q, type, sort],
  );
  const skeletons = useLastKnownCount(query.data ? tabAll.length : undefined);

  function changeView(v: string) {
    const next = v as "grid" | "table";
    setView(next);
    document.cookie = `${VIEW_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  const columns = useMemo<ColumnDef<Account, unknown>[]>(
    () => [
      {
        id: "account",
        header: t("login"),
        accessorFn: (a) => a.login,
        cell: ({ row }) => (
          <div className="grid">
            <span className="font-display font-medium">{accountName(row.original)}</span>
            {row.original.label && (
              <span className="text-xs text-text-3 tabular">{formatAccountId(row.original.login)}</span>
            )}
          </div>
        ),
        meta: { csv: (a) => (a as Account).login } satisfies DataColumnMeta,
      },
      { id: "type", header: t("type"), accessorFn: (a) => t(`types.${a.type}`) },
      {
        id: "status",
        header: t("status"),
        accessorFn: (a) => a.status,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "equity",
        header: t("equity"),
        accessorFn: (a) => a.equity,
        cell: ({ row }) => (
          <MoneyText
            amount={row.original.equity}
            currency={row.original.currency}
            size="sm"
            showCentEquivalent={false}
          />
        ),
        meta: { numeric: true } satisfies DataColumnMeta,
      },
      {
        id: "balance",
        header: t("balance"),
        accessorFn: (a) => a.balance,
        cell: ({ row }) => formatMoney(row.original.balance, row.original.currency),
        meta: { numeric: true } satisfies DataColumnMeta,
      },
      {
        id: "credit",
        header: t("credit"),
        accessorFn: (a) => a.credit,
        cell: ({ row }) => formatMoney(row.original.credit, row.original.currency),
        meta: { numeric: true } satisfies DataColumnMeta,
      },
      {
        id: "freeMargin",
        header: t("freeMargin"),
        accessorFn: (a) => a.freeMargin,
        cell: ({ row }) => formatMoney(row.original.freeMargin, row.original.currency),
        meta: { numeric: true } satisfies DataColumnMeta,
      },
      {
        id: "leverage",
        header: t("leverage"),
        accessorFn: (a) => a.leverage,
        cell: ({ row }) => formatLeverage(row.original.leverage),
        meta: { numeric: true } satisfies DataColumnMeta,
      },
      { id: "server", header: t("server"), accessorFn: (a) => a.server },
      {
        id: "created",
        header: t("created"),
        accessorFn: (a) => a.createdAt,
        cell: ({ row }) => fmt(row.original.createdAt, "date"),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stops the row click; the menu has its own keyboard handling
          <div onClick={(e) => e.stopPropagation()}>
            <AccountMenu account={row.original} />
          </div>
        ),
        meta: { hideOnCard: true } satisfies DataColumnMeta,
      },
    ],
    [t, fmt],
  );

  const filtersActive = q !== "" || type !== "all";
  const emptyIcon = tab === "archived" ? Archive : tab === "demo" ? FlaskConical : Wallet;
  const empty = filtersActive ? (
    <EmptyState
      icon={Search}
      title={t("emptyLive")}
      description={t("emptyLiveBody")}
      action={
        <Button
          variant="outline"
          onClick={() => {
            void setQ(null);
            void setType(null);
          }}
        >
          {t("clearFilters")}
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={emptyIcon}
      title={t(`emptyTab.${tab}`)}
      description={t(`emptyTabBody.${tab}`)}
      action={
        tab !== "archived" && (
          <Link
            href={tab === "demo" ? "/trading/accounts/new?kind=demo" : "/trading/accounts/new"}
            className={buttonVariants()}
          >
            <Plus aria-hidden /> {t("openAccount")}
          </Link>
        )
      }
    />
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Link href="/trading/accounts/new" className={buttonVariants()}>
            <Plus aria-hidden /> {t("openAccount")}
          </Link>
        }
      />

      <Tabs value={tab} onValueChange={(v) => void setTab(v as (typeof TABS)[number])}>
        <TabsList aria-label={t("title")}>
          {TABS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(`tabs.${k}`)}
              {query.data && (
                <span className="rounded-full bg-surface-3 px-1.5 text-xs text-text-2 tabular">
                  {filterAccounts(query.data.items, { tab: k, query: "", type: "all" }).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="my-4 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative md:max-w-xs md:flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-3"
          />
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={q}
            onChange={(e) => void setQ(e.target.value || null)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={(v) => void setType(v === "all" ? null : v)}>
            <SelectTrigger aria-label={t("filterType")} className="w-auto min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              {(["standard", "pro", "cent"] as const).map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`types.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v) => void setSort(v === "equityDesc" ? null : (v as AccountSort))}
          >
            <SelectTrigger aria-label={t("sort")} className="w-auto min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`sortOptions.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SegmentedControl
            value={view}
            onValueChange={changeView}
            aria-label={t("view")}
            className="md:ml-auto"
          >
            <SegmentedControlItem value="grid" aria-label={t("grid")}>
              <LayoutGrid aria-hidden />
            </SegmentedControlItem>
            <SegmentedControlItem value="table" aria-label={t("table")}>
              <List aria-hidden />
            </SegmentedControlItem>
          </SegmentedControl>
        </div>
      </div>

      {query.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
          {Array.from({ length: skeletons }, (_, i) => (
            <Card key={i} padding="sm" className="grid gap-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-16" />
              <Skeleton className="h-9 w-3/4" />
            </Card>
          ))}
        </div>
      )}

      {query.isError && (
        <ErrorState title={t("error")} onRetry={() => query.refetch()} retrying={query.isFetching} />
      )}

      {query.data && (
        <>
          <p className="sr-only" aria-live="polite">
            {t("count", { count: visible.length })}
          </p>
          {view === "grid" ? (
            visible.length === 0 ? (
              empty
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((a) => (
                  <li key={a.login} className="flex">
                    <AccountCard account={a} />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <DataTable
              data={visible}
              columns={columns}
              caption={t("title")}
              getRowId={(a) => String(a.login)}
              csvName={`winprofx-accounts-${tab}`}
              empty={empty}
              onRowClick={(a) => router.push(`/trading/accounts/${a.login}`)}
            />
          )}
        </>
      )}
    </>
  );
}
