"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { DataColumnMeta } from "@/components/common/data-table";
import { MoneyText } from "@/components/common/money-text";
import type { Deal, PendingOrder, Position } from "@/lib/api/schemas";
import { formatMoney, formatNumber, PLACEHOLDER } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";

const num: DataColumnMeta = { numeric: true };
const price = (v: number | null, digits: number) => (v === null ? PLACEHOLDER : formatNumber(v, digits));

function Side({ side }: { side: "buy" | "sell" }) {
  const t = useTranslations("positions.side");
  // Text first; colour only reinforces it.
  return (
    <span
      className={cn("font-display font-medium", side === "buy" ? "text-success-text" : "text-danger-text")}
    >
      {t(side)}
    </span>
  );
}

/** Columns for open positions. `currency` is the account currency (USD or USC). */
export function usePositionColumns(currency: string) {
  const t = useTranslations("positions.cols");
  const fmt = useFormatDate();
  return useMemo<ColumnDef<Position, unknown>[]>(
    () => [
      {
        id: "symbol",
        header: t("symbol"),
        accessorKey: "symbol",
        cell: ({ row }) => <span className="font-display font-medium">{row.original.symbol}</span>,
      },
      {
        id: "side",
        header: t("side"),
        accessorKey: "side",
        cell: ({ row }) => <Side side={row.original.side} />,
      },
      {
        id: "volume",
        header: t("volume"),
        accessorKey: "volume",
        cell: ({ row }) => formatNumber(row.original.volume, 2),
        meta: num,
      },
      {
        id: "openPrice",
        header: t("openPrice"),
        accessorKey: "openPrice",
        cell: ({ row }) => price(row.original.openPrice, row.original.digits),
        meta: num,
      },
      {
        id: "openTime",
        header: t("openTime"),
        accessorKey: "openTime",
        cell: ({ row }) => fmt(row.original.openTime, "datetime"),
      },
      {
        id: "currentPrice",
        header: t("currentPrice"),
        accessorKey: "currentPrice",
        cell: ({ row }) => price(row.original.currentPrice, row.original.digits),
        meta: num,
      },
      {
        id: "sl",
        header: t("sl"),
        accessorKey: "sl",
        cell: ({ row }) => price(row.original.sl, row.original.digits),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "tp",
        header: t("tp"),
        accessorKey: "tp",
        cell: ({ row }) => price(row.original.tp, row.original.digits),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "swap",
        header: t("swap"),
        accessorKey: "swap",
        cell: ({ row }) => formatMoney(row.original.swap, currency),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "commission",
        header: t("commission"),
        accessorKey: "commission",
        cell: ({ row }) => formatMoney(row.original.commission, currency),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "profit",
        header: t("profit"),
        accessorKey: "profit",
        cell: ({ row }) => (
          <MoneyText
            amount={row.original.profit}
            currency={currency}
            tone="direction"
            size="sm"
            showCentEquivalent={false}
          />
        ),
        meta: num,
      },
    ],
    [t, fmt, currency],
  );
}

export function useOrderColumns() {
  const t = useTranslations("positions");
  const fmt = useFormatDate();
  return useMemo<ColumnDef<PendingOrder, unknown>[]>(
    () => [
      {
        id: "symbol",
        header: t("cols.symbol"),
        accessorKey: "symbol",
        cell: ({ row }) => <span className="font-display font-medium">{row.original.symbol}</span>,
      },
      {
        id: "type",
        header: t("cols.type"),
        accessorKey: "type",
        cell: ({ row }) => t(`orderType.${row.original.type}`),
      },
      {
        id: "volume",
        header: t("cols.volume"),
        accessorKey: "volume",
        cell: ({ row }) => formatNumber(row.original.volume, 2),
        meta: num,
      },
      {
        id: "price",
        header: t("cols.price"),
        accessorKey: "price",
        cell: ({ row }) => price(row.original.price, row.original.digits),
        meta: num,
      },
      {
        id: "currentPrice",
        header: t("cols.currentPrice"),
        accessorKey: "currentPrice",
        cell: ({ row }) => price(row.original.currentPrice, row.original.digits),
        meta: num,
      },
      {
        id: "sl",
        header: t("cols.sl"),
        accessorKey: "sl",
        cell: ({ row }) => price(row.original.sl, row.original.digits),
        meta: num,
      },
      {
        id: "tp",
        header: t("cols.tp"),
        accessorKey: "tp",
        cell: ({ row }) => price(row.original.tp, row.original.digits),
        meta: num,
      },
      {
        id: "created",
        header: t("cols.created"),
        accessorKey: "createdAt",
        cell: ({ row }) => fmt(row.original.createdAt, "datetime"),
      },
    ],
    [t, fmt],
  );
}

export function useDealColumns(currency: string) {
  const t = useTranslations("positions.cols");
  const fmt = useFormatDate();
  return useMemo<ColumnDef<Deal, unknown>[]>(
    () => [
      {
        id: "symbol",
        header: t("symbol"),
        accessorKey: "symbol",
        cell: ({ row }) => <span className="font-display font-medium">{row.original.symbol}</span>,
      },
      {
        id: "side",
        header: t("side"),
        accessorKey: "side",
        cell: ({ row }) => <Side side={row.original.side} />,
      },
      {
        id: "volume",
        header: t("volume"),
        accessorKey: "volume",
        cell: ({ row }) => formatNumber(row.original.volume, 2),
        meta: num,
      },
      {
        id: "openPrice",
        header: t("openPrice"),
        accessorKey: "openPrice",
        cell: ({ row }) => price(row.original.openPrice, row.original.digits),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "openTime",
        header: t("openTime"),
        accessorKey: "openTime",
        cell: ({ row }) => fmt(row.original.openTime, "datetime"),
        meta: { hideOnCard: true },
      },
      {
        id: "closePrice",
        header: t("closePrice"),
        accessorKey: "closePrice",
        cell: ({ row }) => price(row.original.closePrice, row.original.digits),
        meta: num,
      },
      {
        id: "closeTime",
        header: t("closeTime"),
        accessorKey: "closeTime",
        cell: ({ row }) => fmt(row.original.closeTime, "datetime"),
      },
      {
        id: "sl",
        header: t("sl"),
        accessorKey: "sl",
        cell: ({ row }) => price(row.original.sl, row.original.digits),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "tp",
        header: t("tp"),
        accessorKey: "tp",
        cell: ({ row }) => price(row.original.tp, row.original.digits),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "swap",
        header: t("swap"),
        accessorKey: "swap",
        cell: ({ row }) => formatMoney(row.original.swap, currency),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "commission",
        header: t("commission"),
        accessorKey: "commission",
        cell: ({ row }) => formatMoney(row.original.commission, currency),
        meta: { ...num, hideOnCard: true },
      },
      {
        id: "profit",
        header: t("profit"),
        accessorKey: "profit",
        cell: ({ row }) => (
          <MoneyText
            amount={row.original.profit}
            currency={currency}
            tone="direction"
            size="sm"
            showCentEquivalent={false}
          />
        ),
        meta: num,
      },
    ],
    [t, fmt, currency],
  );
}
