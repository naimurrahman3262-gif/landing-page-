"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import type { TradingSummary } from "@/lib/api/schemas";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

type Point = TradingSummary["series"][number];

/** At most 6 evenly spaced x ticks (brief §6.4). */
function ticks(points: Point[]): string[] {
  if (points.length <= 6) return points.map((p) => p.date);
  const step = (points.length - 1) / 5;
  return Array.from({ length: 6 }, (_, i) => points[Math.round(i * step)]!.date);
}

const axis = { stroke: "var(--text-3)", fontSize: 12, tickLine: false, axisLine: false } as const;
const shortDate = (d: string) => formatDate(`${d}T12:00:00Z`, "date").replace(/ \d{4}$/, "");

function ChartCard({
  title,
  points,
  dataKey,
  format,
  empty,
  children,
}: {
  empty?: string;
  title: string;
  points: Point[];
  dataKey: keyof Point;
  format: (v: number) => string;
  children: React.ReactNode;
}) {
  const t = useTranslations("positions.charts");
  return (
    <Card padding="sm" className="grid min-w-0 gap-3">
      <CardTitle>{title}</CardTitle>
      {/* Visual chart; the data table below carries the same numbers for screen readers. */}
      {empty ? (
        <p className="grid h-56 place-content-center rounded-md border border-dashed border-border-strong px-4 text-center text-sm text-text-2">
          {empty}
        </p>
      ) : (
        <div className="h-56" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      )}
      <table className="sr-only">
        <caption>{t("table", { chart: title })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("date")}</th>
            <th scope="col">{t("value")}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{formatDate(`${p.date}T12:00:00Z`, "date")}</td>
              <td>{format(p[dataKey] as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function TooltipBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border-strong bg-surface-3 px-3 py-2 text-xs shadow-2">
      <p className="text-text-3">{label}</p>
      <p className="font-display font-bold text-text-1 tabular">{value}</p>
    </div>
  );
}

/**
 * Equity, cumulative realized P/L and volume, each from its own series.
 * The P/L chart never plots equity (old bug). Equity's y-axis is auto-scaled,
 * not zero-based. Lines and areas only: no bars for time series.
 */
export default function HistoryCharts({ summary }: { summary: TradingSummary }) {
  const t = useTranslations("positions.charts");
  const points = summary.series;
  const money = (v: number) => formatMoney(v, summary.currency);
  // Axis labels must differ from each other: use full numbers when the range is narrow.
  const axisFormatter = (key: "equity" | "realizedCumulative") => {
    const values = points.map((p) => p[key]);
    const span = Math.max(...values) - Math.min(...values);
    return (v: number) =>
      span < 5000
        ? formatNumber(v, span < 10 ? 2 : 0)
        : new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  };
  const noTrades = points.every((p) => p.volume === 0);
  const xTicks = ticks(points);
  const tooltip = (fmt: (v: number) => string) => (
    <Tooltip
      cursor={{ stroke: "var(--border-strong)" }}
      content={({ active, payload, label }) =>
        active && payload?.length ? (
          <TooltipBox
            label={formatDate(`${label}T12:00:00Z`, "date")}
            value={fmt(Number(payload[0]!.value))}
          />
        ) : null
      }
    />
  );
  const x = <XAxis dataKey="date" ticks={xTicks} tickFormatter={shortDate} {...axis} />;
  const grid = <CartesianGrid stroke="var(--chart-grid)" vertical={false} />;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title={t("equity")} points={points} dataKey="equity" format={money}>
        <AreaChart accessibilityLayer={false} data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-area-from)" />
              <stop offset="100%" stopColor="var(--chart-area-to)" />
            </linearGradient>
          </defs>
          {grid}
          {x}
          <YAxis domain={["auto", "auto"]} tickFormatter={axisFormatter("equity")} width={64} {...axis} />
          {tooltip(money)}
          <Area
            type="monotone"
            dataKey="equity"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#equityFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartCard>

      <ChartCard
        title={t("realized")}
        empty={noTrades ? t("empty") : undefined}
        points={points}
        dataKey="realizedCumulative"
        format={(v) => formatMoney(v, summary.currency, { sign: "always" })}
      >
        <LineChart accessibilityLayer={false} data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {grid}
          {x}
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={axisFormatter("realizedCumulative")}
            width={64}
            {...axis}
          />
          {tooltip((v) => formatMoney(v, summary.currency, { sign: "always" }))}
          <Line
            type="monotone"
            dataKey="realizedCumulative"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartCard>

      <ChartCard
        title={t("volume")}
        empty={noTrades ? t("empty") : undefined}
        points={points}
        dataKey="volume"
        format={(v) => formatNumber(v, 2)}
      >
        <AreaChart accessibilityLayer={false} data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {grid}
          {x}
          <YAxis allowDecimals tickFormatter={(v: number) => formatNumber(v, 1)} width={40} {...axis} />
          {tooltip((v) => formatNumber(v, 2))}
          <Area
            type="linear"
            dataKey="volume"
            stroke="var(--chart-3)"
            strokeWidth={2}
            fill="var(--chart-3)"
            fillOpacity={0.15}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartCard>
    </div>
  );
}
