"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  /** Usually a <MoneyText>. Ignored while loading or on error. */
  value?: ReactNode;
  /** Change in percentage points; shown with sign + arrow icon. */
  delta?: number;
  /** ISO time the figure was synced from the source (required for money KPIs). */
  syncedAt?: string;
  state?: "ready" | "loading" | "error";
  /** Shown in place of the value on error, e.g. a retry button. */
  errorAction?: ReactNode;
  className?: string;
}

export function StatTile({
  label,
  value,
  delta,
  syncedAt,
  state = "ready",
  errorAction,
  className,
}: StatTileProps) {
  const t = useTranslations("common");
  const fmt = useFormatDate();

  return (
    <Card
      padding="sm"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      aria-busy={state === "loading" || undefined}
    >
      <p className="truncate text-sm text-text-2">{label}</p>

      {state === "loading" && <Skeleton className="h-8 w-3/4" />}
      {state === "error" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-danger-text">
          <span>{t("unavailable")}</span>
          {errorAction}
        </div>
      )}
      {state === "ready" && <div className="min-w-0">{value}</div>}

      <div className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {state === "ready" && delta !== undefined && Number.isFinite(delta) && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-display font-medium tabular",
              delta > 0 ? "text-success-text" : delta < 0 ? "text-danger-text" : "text-text-3",
            )}
          >
            {delta > 0 ? (
              <TrendingUp aria-hidden className="size-3.5" />
            ) : delta < 0 ? (
              <TrendingDown aria-hidden className="size-3.5" />
            ) : null}
            {formatPercent(delta, { sign: "always" })}
          </span>
        )}
        {syncedAt && state !== "loading" && (
          <span className="text-text-3">
            <time dateTime={syncedAt}>{t("synced", { time: fmt(syncedAt, "time") })}</time>
          </span>
        )}
      </div>
    </Card>
  );
}
