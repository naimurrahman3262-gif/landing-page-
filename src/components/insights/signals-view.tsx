"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Search, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useSyncExternalStore } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignals, useToggleFavourite } from "@/lib/api/queries/insights";
import type { Signal } from "@/lib/api/schemas";
import { formatNumber } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { cn } from "@/lib/utils";

const GROUPS = ["all", "major", "minor", "exotic"] as const;

const DIRECTION = {
  buy: { icon: ArrowUpRight, className: "bg-success-soft text-success-text" },
  neutral: { icon: Minus, className: "bg-neutral-soft text-text-2" },
  sell: { icon: ArrowDownRight, className: "bg-danger-soft text-danger-text" },
} as const;

function useIsDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(min-width: 64rem)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 64rem)").matches,
    () => true,
  );
}

/** Buy / Neutral / Sell: always icon + text + colour. */
export function DirectionBadge({ direction }: { direction: Signal["direction"] }) {
  const t = useTranslations("signals.direction");
  const { icon: Icon, className } = DIRECTION[direction];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 font-display text-xs font-medium",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(direction)}
    </span>
  );
}

/** Signals (brief §6.6): list + detail on desktop, a sheet on mobile, legend, search, groups, favourites. */
export function SignalsView() {
  const t = useTranslations("signals");
  const desktop = useIsDesktop();
  const [f, setF] = useQueryStates({
    q: parseAsString.withDefault(""),
    group: parseAsStringLiteral(GROUPS).withDefault("all"),
    fav: parseAsBoolean.withDefault(false),
    s: parseAsString,
  });
  const q = useSignals();
  const items = (q.data?.items ?? []).filter(
    (s) =>
      (f.group === "all" || s.group === f.group) &&
      (!f.fav || s.favourite) &&
      s.symbol.toLowerCase().includes(f.q.trim().toLowerCase()),
  );
  const selected = q.data?.items.find((s) => s.id === f.s) ?? (desktop ? items[0] : undefined);

  return (
    <div className="grid w-full gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-3 md:flex md:flex-wrap md:items-center">
        <div className="relative md:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-3"
          />
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={f.q}
            onChange={(e) => void setF({ q: e.target.value || null })}
            size={1}
            className="w-full pl-9"
          />
        </div>
        <SegmentedControl
          aria-label={t("groups.all")}
          value={f.group}
          onValueChange={(v) => void setF({ group: v === "all" ? null : (v as (typeof GROUPS)[number]) })}
          className="w-full overflow-x-auto md:w-auto"
        >
          {GROUPS.map((g) => (
            <SegmentedControlItem key={g} value={g} className="flex-1">
              {t(`groups.${g}`)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <Button
          variant="outline"
          aria-pressed={f.fav}
          onClick={() => void setF({ fav: f.fav ? null : true })}
          className={cn(f.fav && "border-primary-border bg-primary-soft text-primary-text")}
        >
          <Star aria-hidden className={cn(f.fav && "fill-current")} /> {t("favourites")}
        </Button>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-sm text-text-2">
        <DirectionBadge direction="buy" />
        <DirectionBadge direction="neutral" />
        <DirectionBadge direction="sell" />
        <span>{t("legend")}</span>
      </p>

      {q.isPending && <Skeleton className="h-96" />}
      {q.isError && <ErrorState title={t("error")} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && items.length === 0 && (
        <EmptyState
          icon={f.fav ? Star : Search}
          title={f.fav ? t("emptyFavourites") : t("empty")}
          description={f.fav ? t("emptyFavouritesBody") : t("emptyBody")}
        />
      )}
      {q.data && items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-5">
          <ul className="grid content-start gap-2 lg:col-span-2" aria-label={t("title")}>
            {items.map((s) => (
              <SignalRow
                key={s.id}
                signal={s}
                selected={selected?.id === s.id}
                onSelect={() => void setF({ s: s.id })}
              />
            ))}
          </ul>
          {desktop && (
            <div className="lg:col-span-3">
              {selected ? (
                <SignalDetail signal={selected} />
              ) : (
                <Card className="text-text-2">{t("choose")}</Card>
              )}
            </div>
          )}
        </div>
      )}

      {!desktop && (
        <Sheet open={!!f.s && !!selected} onOpenChange={(o) => !o && void setF({ s: null })}>
          <SheetContent>
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle>{selected.symbol}</SheetTitle>
                </SheetHeader>
                <SheetBody>
                  <SignalDetail signal={selected} inSheet />
                </SheetBody>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function SignalRow({
  signal: s,
  selected,
  onSelect,
}: {
  signal: Signal;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("signals");
  const fmt = useFormatDate();
  const fav = useToggleFavourite();
  return (
    <li
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-surface-1 transition-colors",
        selected ? "border-primary-border bg-primary-soft" : "border-border hover:bg-surface-2",
      )}
    >
      <button
        type="button"
        aria-current={selected || undefined}
        onClick={onSelect}
        className="grid min-w-0 flex-1 gap-1 rounded-lg p-3 text-left focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{s.symbol}</span>
          <DirectionBadge direction={s.direction} />
        </span>
        <span className="text-sm text-text-3">
          {t(`groups.${s.group}`)} · {s.timeframe} · {t("issued", { when: fmt(s.issuedAt, "relative") })}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        aria-pressed={s.favourite}
        aria-label={
          s.favourite ? t("unfavourite", { symbol: s.symbol }) : t("favourite", { symbol: s.symbol })
        }
        onClick={() => fav.mutate({ id: s.id, favourite: !s.favourite })}
        className="mr-1 shrink-0"
      >
        <Star aria-hidden className={cn(s.favourite && "fill-warning text-warning")} />
      </Button>
    </li>
  );
}

function SignalDetail({ signal: s, inSheet }: { signal: Signal; inSheet?: boolean }) {
  const t = useTranslations("signals");
  const fmt = useFormatDate();
  const levels = [
    ["entry", s.entry],
    ["target", s.target],
    ["stop", s.stop],
  ] as const;
  const body = (
    <div className="grid gap-5">
      {!inSheet && (
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-bold">{s.symbol}</h2>
          <DirectionBadge direction={s.direction} />
        </div>
      )}
      {inSheet && <DirectionBadge direction={s.direction} />}
      <p className="text-text-2">{s.summary}</p>
      <dl className="grid grid-cols-3 gap-3">
        {levels.map(([k, v]) => (
          <div key={k} className="grid gap-1 rounded-md bg-surface-2 p-3">
            <dt className="text-sm text-text-3">{t(k)}</dt>
            <dd className="font-medium tabular">{v === null ? "—" : formatNumber(v, s.digits)}</dd>
          </div>
        ))}
      </dl>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-text-3">{t("timeframe")}:</dt>
          <dd>{s.timeframe}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-3">{t("source")}:</dt>
          <dd>
            {s.source} · {fmt(s.issuedAt, "datetime")}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-text-3">{t("disclaimer")}</p>
      <Link href="/trading/platforms" className={cn(buttonVariants(), "w-fit")}>
        {t("trade")}
      </Link>
    </div>
  );
  return inSheet ? body : <Card>{body}</Card>;
}
