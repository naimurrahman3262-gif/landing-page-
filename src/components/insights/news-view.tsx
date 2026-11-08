"use client";

import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-card";
import { EmbedFrame } from "@/components/embeds/embed-frame";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { INSTRUMENTS } from "@/config/instruments";
import { useSaveWatchlist, useSentiment, useWatchlist } from "@/lib/api/queries/insights";
import type { Market, Sentiment } from "@/lib/api/schemas";
import { useFormatDate } from "@/lib/format-context";
import { useApiErrorMessage } from "@/lib/hooks";
import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

const MARKETS = ["fx", "metals", "crypto", "indices"] as const satisfies readonly Market[];

/** TradingView symbol for one of our instruments. */
function tvSymbol(symbol: string): string {
  if (symbol.startsWith("XAU") || symbol.startsWith("XAG")) return `OANDA:${symbol}`;
  if (symbol === "BTCUSD") return "BITSTAMP:BTCUSD";
  return `FX:${symbol}`;
}

/** TradingView timeline widget URL (their documented iframe embed), FX/metals/crypto, theme-aware. */
export function timelineUrl(
  f: { market: Market | null; symbol: string | null },
  theme: string,
  compact: boolean,
) {
  const base = {
    colorTheme: theme,
    isTransparent: true,
    displayMode: compact ? "compact" : "regular",
    width: "100%",
    height: "100%",
    locale: "en",
  };
  const feed = f.symbol
    ? { feedMode: "symbol", symbol: tvSymbol(f.symbol) }
    : f.market === "metals"
      ? { feedMode: "symbol", symbol: "OANDA:XAUUSD" }
      : {
          feedMode: "market",
          market: f.market === "crypto" ? "crypto" : f.market === "indices" ? "index" : "forex",
        };
  return `https://s.tradingview.com/embed-widget/timeline/?locale=en#${encodeURIComponent(JSON.stringify({ ...base, ...feed }))}`;
}

/** News (brief §6.6): feed first, filters in a top bar, settings in a sheet. */
export function NewsView() {
  const t = useTranslations("news");
  const theme = useTheme();
  const [f, setF] = useQueryStates({
    market: parseAsStringLiteral(MARKETS),
    symbol: parseAsString,
    display: parseAsStringLiteral(["compact"] as const),
  });
  const watchlist = useWatchlist();
  const sentiment = useSentiment(watchlist.data ?? []);
  const [settings, setSettings] = useState(false);
  const active = f.symbol ? null : (f.market ?? "fx");
  const filterLabel = f.symbol ?? t(`markets.${active ?? "fx"}`);

  return (
    <div className="grid w-full gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button variant="outline" onClick={() => setSettings(true)}>
            <Settings2 aria-hidden /> {t("settings")}
          </Button>
        }
      />

      <div role="group" aria-label={t("filters")} className="flex gap-2 overflow-x-auto pb-1">
        {MARKETS.map((m) => (
          <Chip
            key={m}
            pressed={active === m}
            onClick={() => void setF({ market: m === "fx" ? null : m, symbol: null })}
          >
            {t(`markets.${m}`)}
          </Chip>
        ))}
        {(watchlist.data ?? []).length > 0 && <span aria-hidden className="mx-1 w-px shrink-0 bg-border" />}
        {(watchlist.data ?? []).map((s) => (
          <Chip
            key={s}
            pressed={f.symbol === s}
            onClick={() => void setF({ symbol: f.symbol === s ? null : s, market: null })}
          >
            {s}
          </Chip>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <EmbedFrame
            title={t("feedTitle", { filter: filterLabel })}
            src={timelineUrl({ market: f.market, symbol: f.symbol }, theme, f.display === "compact")}
          />
        </div>
        {sentiment.data && <SentimentCard data={sentiment.data} />}
      </div>

      <SettingsSheet
        open={settings}
        onOpenChange={setSettings}
        current={watchlist.data ?? []}
        compact={f.display === "compact"}
        onCompact={(c) => void setF({ display: c ? "compact" : null })}
      />
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
        "h-10 shrink-0 rounded-full border px-4 font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring",
        pressed
          ? "border-primary-border bg-primary-soft text-primary-text"
          : "border-border-strong text-text-2 hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

/** Shown only when the API says where the numbers come from and when (§6.6). */
export function SentimentCard({ data }: { data: Sentiment }) {
  const t = useTranslations("news");
  const fmt = useFormatDate();
  if (!data.source || !data.asOf || data.items.length === 0) return null;
  return (
    <Card className="grid content-start gap-4">
      <CardTitle>{t("sentiment")}</CardTitle>
      <ul className="grid gap-3">
        {data.items.map((i) => {
          const short = 100 - i.longPercent;
          return (
            <li key={i.symbol} className="grid gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{i.symbol}</span>
                <span className="text-text-2 tabular">
                  {t("sentimentLong", { percent: i.longPercent })} · {t("sentimentShort", { percent: short })}
                </span>
              </div>
              <div
                role="img"
                aria-label={t("sentimentRow", { symbol: i.symbol, long: i.longPercent, short })}
                className="flex h-2 overflow-hidden rounded-full bg-danger"
              >
                <div className="h-full bg-success" style={{ width: `${i.longPercent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-3">
        {t("sentimentSource", { source: data.source, time: fmt(data.asOf, "datetime") })}
      </p>
    </Card>
  );
}

function SettingsSheet({
  open,
  onOpenChange,
  current,
  compact,
  onCompact,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: string[];
  compact: boolean;
  onCompact: (c: boolean) => void;
}) {
  const t = useTranslations("news");
  const apiError = useApiErrorMessage();
  const save = useSaveWatchlist();
  const [picked, setPicked] = useState<string[]>(current);
  const [error, setError] = useState<string>();

  async function submit() {
    setError(undefined);
    try {
      await save.mutateAsync(picked);
      toast.success(t("saved"));
      onOpenChange(false);
    } catch (e) {
      setError(apiError(e).message);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setPicked(current);
        onOpenChange(o);
      }}
    >
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("settings")}</SheetTitle>
          <SheetDescription>{t("settingsBody")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="grid content-start gap-5">
          <FormAlert>{error}</FormAlert>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t("watchlist")}</legend>
            {INSTRUMENTS.map((i) => {
              const checked = picked.includes(i.symbol);
              return (
                <label key={i.symbol} className="flex min-h-11 items-center gap-3 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={!checked && picked.length >= 12}
                    onCheckedChange={(c) =>
                      setPicked((p) => (c ? [...p, i.symbol] : p.filter((x) => x !== i.symbol)))
                    }
                  />
                  {i.symbol}
                </label>
              );
            })}
          </fieldset>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="news-compact" className="text-sm font-medium">
              {t("compact")}
            </label>
            <Switch id="news-compact" checked={compact} onCheckedChange={onCompact} />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button loading={save.isPending} onClick={() => void submit()}>
            {t("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
