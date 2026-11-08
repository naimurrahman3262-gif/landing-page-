"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import type { ZodType } from "zod";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INSTRUMENTS, type Instrument } from "@/config/instruments";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useQuotes } from "@/lib/api/queries/insights";
import {
  MarginInput,
  PipValueInput,
  PositionSizeInput,
  ProfitInput,
  pipValue,
  positionSize,
  profitLoss,
  quoteToUsd,
  requiredMargin,
} from "@/lib/calculators";
import { formatAccountId, formatLeverage, formatMoney, formatNumber } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { useValidationMessage } from "@/lib/hooks";

const TABS = ["position", "pip", "margin", "profit"] as const;
type Values = Record<string, string>;

/** Zod-validated values; errors only for fields the user has left. */
function useValidated<T>(schema: ZodType<T>, values: Values, touched: Set<string>) {
  return useMemo(() => {
    const r = schema.safeParse(values);
    if (r.success) return { data: r.data, errors: {} as Record<string, string> };
    const errors: Record<string, string> = {};
    for (const i of r.error.issues) {
      const k = String(i.path[0]);
      if (touched.has(k)) errors[k] ??= i.message;
    }
    return { data: null, errors };
  }, [schema, values, touched]);
}

/** Native calculators (brief §6.6): position size, pip value, margin, profit/loss. */
export function CalculatorView() {
  const t = useTranslations("calculator");
  const fmt = useFormatDate();
  const [tab, setTab] = useQueryState("calc", parseAsStringLiteral(TABS).withDefault("position"));
  const [symbol, setSymbol] = useState("EURUSD");
  const quotes = useQuotes();
  const accounts = useAccounts();
  const inst = INSTRUMENTS.find((i) => i.symbol === symbol)!;

  const mids = useMemo(
    () => Object.fromEntries((quotes.data ?? []).map((q) => [q.symbol, (q.bid + q.ask) / 2])),
    [quotes.data],
  );
  const toUsd = quoteToUsd(inst.quote, mids);
  const mid = mids[symbol];
  const quoteAt = quotes.data?.find((q) => q.symbol === symbol)?.at;
  const usdAccounts = (accounts.data?.items ?? []).filter((a) => !a.archived && a.currency === "USD");

  const priceHint = quoteAt
    ? t("priceAsOf", { time: fmt(quoteAt, "time") })
    : quotes.isError
      ? t("error")
      : undefined;
  const common = { inst, toUsd, mid, priceHint, accounts: usdAccounts };

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Card className="grid gap-5">
        <Field id="calc-instrument" label={t("instrument")} className="sm:max-w-xs">
          {(a) => (
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger {...a}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENTS.map((i) => (
                  <SelectItem key={i.symbol} value={i.symbol}>
                    {i.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Tabs value={tab} onValueChange={(v) => void setTab(v as (typeof TABS)[number])}>
          <TabsList className="max-w-full overflow-x-auto">
            {TABS.map((k) => (
              <TabsTrigger key={k} value={k}>
                {t(`tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="position">
            <PositionCalc key={`${symbol}-${mid ? 1 : 0}`} {...common} />
          </TabsContent>
          <TabsContent value="pip">
            <PipCalc key={`${symbol}-${mid ? 1 : 0}`} {...common} />
          </TabsContent>
          <TabsContent value="margin">
            <MarginCalc key={`${symbol}-${mid ? 1 : 0}`} {...common} />
          </TabsContent>
          <TabsContent value="profit">
            <ProfitCalc key={`${symbol}-${mid ? 1 : 0}`} {...common} />
          </TabsContent>
        </Tabs>
        <p className="text-xs text-text-3">{t("assumptions")}</p>
      </Card>
    </div>
  );
}

interface CalcProps {
  inst: Instrument;
  toUsd: number | null;
  mid: number | undefined;
  priceHint?: string;
  accounts: { login: number; label: string | null; balance: number; leverage: number }[];
}

function useForm(initial: Values) {
  const [values, setValues] = useState<Values>(initial);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const vt = useValidationMessage();
  const bind = (name: string, errors: Record<string, string>) => ({
    value: values[name] ?? "",
    inputMode: "decimal" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
    onBlur: () => setTouched((s) => new Set(s).add(name)),
    error: vt(errors[name]),
  });
  return { values, setValues, touched, bind };
}

function NumberField({
  id,
  label,
  hint,
  field,
}: {
  id: string;
  label: string;
  hint?: string;
  field: ReturnType<ReturnType<typeof useForm>["bind"]>;
}) {
  const { error, ...input } = field;
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      {(a) => <Input {...a} {...input} size={1} className="w-full tabular" />}
    </Field>
  );
}

function AccountFill({
  accounts,
  onPick,
}: {
  accounts: CalcProps["accounts"];
  onPick: (a: CalcProps["accounts"][number]) => void;
}) {
  const t = useTranslations("calculator");
  const [v, setV] = useState("none");
  if (!accounts.length) return null;
  return (
    <Field id="calc-account" label={t("account")}>
      {(a) => (
        <Select
          value={v}
          onValueChange={(x) => {
            setV(x);
            const acc = accounts.find((y) => String(y.login) === x);
            if (acc) onPick(acc);
          }}
        >
          <SelectTrigger {...a}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("accountNone")}</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.login} value={String(acc.login)}>
                {acc.label ?? formatAccountId(acc.login)} · {formatMoney(acc.balance)} ·{" "}
                {formatLeverage(acc.leverage)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

function Result({ value, detail, warn }: { value?: string; detail?: string; warn?: string }) {
  const t = useTranslations("calculator");
  return (
    <div className="grid content-start gap-1 rounded-md bg-surface-2 p-4" aria-live="polite">
      <span className="text-sm text-text-3">{t("result")}</span>
      {warn ? (
        <span className="text-sm text-warning-text">{warn}</span>
      ) : (
        <>
          <output className="font-display text-2xl font-bold tabular">{value ?? "—"}</output>
          {detail && <span className="text-sm text-text-2">{detail}</span>}
        </>
      )}
    </div>
  );
}

const priceStr = (mid: number | undefined, inst: Instrument) => (mid ? mid.toFixed(inst.digits) : "");

function PositionCalc({ inst, toUsd, accounts }: CalcProps) {
  const t = useTranslations("calculator");
  const f = useForm({ balance: "", riskPercent: "1", stopPips: "20" });
  const { data, errors } = useValidated(PositionSizeInput, f.values, f.touched);
  const r = data && toUsd ? positionSize(inst, data.balance, data.riskPercent, data.stopPips, toUsd) : null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-4">
        <AccountFill
          accounts={accounts}
          onPick={(a) => f.setValues((v) => ({ ...v, balance: String(a.balance) }))}
        />
        <NumberField id="calc-balance" label={t("balance")} field={f.bind("balance", errors)} />
        <NumberField id="calc-risk" label={t("risk")} field={f.bind("riskPercent", errors)} />
        <NumberField id="calc-stop" label={t("stopPips")} field={f.bind("stopPips", errors)} />
      </div>
      <Result
        warn={toUsd ? undefined : t("noRate", { currency: inst.quote })}
        value={r ? t("positionResult", { lots: formatNumber(r.lots, 2) }) : undefined}
        detail={r ? t("positionDetail", { risk: formatMoney(r.risk) }) : undefined}
      />
    </div>
  );
}

function PipCalc({ inst, toUsd }: CalcProps) {
  const t = useTranslations("calculator");
  const f = useForm({ lots: "1" });
  const { data, errors } = useValidated(PipValueInput, f.values, f.touched);
  const v = data && toUsd ? pipValue(inst, data.lots, toUsd) : null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-4">
        <NumberField id="calc-lots" label={t("lots")} field={f.bind("lots", errors)} />
      </div>
      <Result
        warn={toUsd ? undefined : t("noRate", { currency: inst.quote })}
        value={v !== null ? t("pipResult", { value: formatMoney(v) }) : undefined}
      />
    </div>
  );
}

function MarginCalc({ inst, toUsd, mid, priceHint, accounts }: CalcProps) {
  const t = useTranslations("calculator");
  const f = useForm({ lots: "1", price: priceStr(mid, inst), leverage: "500" });
  const { data, errors } = useValidated(MarginInput, f.values, f.touched);
  const v = data && toUsd ? requiredMargin(inst, data.lots, data.price, data.leverage, toUsd) : null;
  const levels = [50, 100, 200, 300, 400, 500, 1000];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-4">
        <AccountFill
          accounts={accounts}
          onPick={(a) => f.setValues((x) => ({ ...x, leverage: String(a.leverage) }))}
        />
        <NumberField id="calc-m-lots" label={t("lots")} field={f.bind("lots", errors)} />
        <NumberField id="calc-m-price" label={t("price")} hint={priceHint} field={f.bind("price", errors)} />
        <Field id="calc-leverage" label={t("leverage")}>
          {(a) => (
            <Select
              value={f.values.leverage}
              onValueChange={(leverage) => f.setValues((x) => ({ ...x, leverage }))}
            >
              <SelectTrigger {...a}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...levels, Number(f.values.leverage)])]
                  .filter((n) => n > 0)
                  .sort((x, y) => x - y)
                  .map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {formatLeverage(n)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>
      <Result
        warn={toUsd ? undefined : t("noRate", { currency: inst.quote })}
        value={v !== null ? t("marginResult", { value: formatMoney(v) }) : undefined}
      />
    </div>
  );
}

function ProfitCalc({ inst, toUsd, mid, priceHint }: CalcProps) {
  const t = useTranslations("calculator");
  const f = useForm({ lots: "1", open: priceStr(mid, inst), close: priceStr(mid, inst), side: "buy" });
  const { data, errors } = useValidated(ProfitInput, f.values, f.touched);
  const r = data && toUsd ? profitLoss(inst, data.side, data.lots, data.open, data.close, toUsd) : null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-4">
        <div className="grid gap-2">
          <span id="calc-side" className="text-sm font-medium">
            {t("side")}
          </span>
          <SegmentedControl
            aria-labelledby="calc-side"
            value={f.values.side!}
            onValueChange={(side) => f.setValues((x) => ({ ...x, side }))}
            className="w-fit"
          >
            <SegmentedControlItem value="buy">{t("buy")}</SegmentedControlItem>
            <SegmentedControlItem value="sell">{t("sell")}</SegmentedControlItem>
          </SegmentedControl>
        </div>
        <NumberField id="calc-p-lots" label={t("lots")} field={f.bind("lots", errors)} />
        <NumberField id="calc-open" label={t("open")} hint={priceHint} field={f.bind("open", errors)} />
        <NumberField id="calc-close" label={t("close")} field={f.bind("close", errors)} />
      </div>
      <Result
        warn={toUsd ? undefined : t("noRate", { currency: inst.quote })}
        value={r ? t("profitResult", { value: formatMoney(r.amount, "USD", { sign: "always" }) }) : undefined}
        detail={r ? t("profitDetail", { pips: formatNumber(r.pips, 1) }) : undefined}
      />
    </div>
  );
}
