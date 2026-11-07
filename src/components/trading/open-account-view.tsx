"use client";

import { ArrowDownToLine, Check, CircleCheck, Download, Eye } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { FormAlert } from "@/components/auth/auth-card";
import { CopyButton } from "@/components/common/copy-button";
import { ErrorState } from "@/components/common/error-state";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { Stepper } from "@/components/common/stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { firstOpenAccountStep } from "@/lib/accounts";
import { useAccountTypes, useOpenAccount } from "@/lib/api/queries/accounts";
import type { AccountType } from "@/lib/api/schemas";
import { formatAccountId, formatLeverage, formatMoney, formatNumber } from "@/lib/format";
import { useApiErrorMessage, useValidationMessage } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const STEPS = ["type", "config", "review"] as const;
type Step = (typeof STEPS)[number];
type Credentials = { login: number; server: string; masterPassword: string; investorPassword: string };

/**
 * Open account (brief §6.3). Every step has its own URL so browser Back works;
 * the page scrolls to the top on each step. Passwords are shown once and are
 * kept only in component state (never in the URL or the query cache).
 */
export function OpenAccountView() {
  const t = useTranslations("openAccount");
  const ta = useTranslations("accounts");
  const apiError = useApiErrorMessage();
  const vt = useValidationMessage();
  const types = useAccountTypes();
  const open = useOpenAccount();
  const [p, setP] = useQueryStates(
    {
      kind: parseAsStringLiteral(["live", "demo"] as const).withDefault("live"),
      step: parseAsStringLiteral(STEPS),
      type: parseAsStringLiteral(["standard", "pro", "cent"] as const),
      leverage: parseAsInteger,
      currency: parseAsString,
      balance: parseAsInteger,
    },
    { history: "push" },
  );
  const [label, setLabel] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<Credentials | null>(null);

  const list = types.data ?? [];
  const firstStep = firstOpenAccountStep(list);
  const step: Step = p.step ?? firstStep;
  // Only one type? Skip selection and use it.
  const typeId = p.type ?? (list.length === 1 ? list[0]!.id : null);
  const type = list.find((x) => x.id === typeId);
  const currency = p.currency ?? (type?.currencies.length === 1 ? type.currencies[0]! : null);
  const steps = (firstStep === "config" ? STEPS.slice(1) : STEPS).map((id) => ({
    id,
    label: t(`steps.${id}`),
  }));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [step, created]);

  const go = (next: Step) => void setP({ step: next === firstStep ? null : next });

  async function submit() {
    if (!type || !p.leverage || !currency) return;
    setError(undefined);
    try {
      const res = await open.mutateAsync({
        kind: p.kind,
        type: type.id,
        leverage: p.leverage,
        currency,
        label: label.trim() || undefined,
        demoBalance: p.kind === "demo" ? (p.balance ?? type.demoBalances[0]) : undefined,
      });
      setCreated(res.credentials);
    } catch (e) {
      setError(apiError(e).message || t("error"));
    }
  }

  if (created) return <Success credentials={created} kind={p.kind} />;

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={p.kind === "demo" ? t("subtitleDemo") : t("subtitleLive")}
        backHref="/trading/accounts"
        actions={
          <SegmentedControl
            value={p.kind}
            aria-label={t("accountKind")}
            onValueChange={(v) =>
              void setP({
                kind: v === "live" ? null : (v as "demo"),
                step: null,
                leverage: null,
                balance: null,
              })
            }
          >
            <SegmentedControlItem value="live">{t("live")}</SegmentedControlItem>
            <SegmentedControlItem value="demo">{t("demo")}</SegmentedControlItem>
          </SegmentedControl>
        }
      />

      {types.isPending && <Skeleton className="h-80" />}
      {types.isError && (
        <ErrorState title={t("typesError")} onRetry={() => types.refetch()} retrying={types.isFetching} />
      )}

      {types.data && (
        <div className="grid max-w-4xl gap-6">
          <Stepper steps={steps} current={step} />
          <FormAlert>{error}</FormAlert>

          {step === "type" && (
            <>
              <ul className="grid gap-4 md:grid-cols-3" aria-label={t("steps.type")}>
                {list.map((x) => (
                  <li key={x.id} className="flex">
                    <TypeCard
                      type={x}
                      selected={x.id === typeId}
                      onSelect={() => void setP({ type: x.id, leverage: null, currency: null })}
                    />
                  </li>
                ))}
              </ul>
              {touched && !typeId && <p className="text-sm text-danger-text">{t("typeRequired")}</p>}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setTouched(true);
                    if (typeId) {
                      setTouched(false);
                      go("config");
                    }
                  }}
                >
                  {t("continue")}
                </Button>
              </div>
            </>
          )}

          {step === "config" && type && (
            <Card className="grid gap-5">
              <p className="font-display font-bold">
                {ta(`types.${type.id}`)} · {p.kind === "demo" ? t("demo") : t("live")}
              </p>
              <Field
                id="oa-leverage"
                label={t("leverage")}
                required
                error={touched && !p.leverage ? t("leverageRequired") : undefined}
              >
                {(a) => (
                  <Select
                    value={p.leverage ? String(p.leverage) : ""}
                    onValueChange={(v) => void setP({ leverage: Number(v) })}
                  >
                    <SelectTrigger {...a}>
                      <SelectValue placeholder={t("leveragePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {type.leverageOptions.map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          {formatLeverage(l)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field
                id="oa-currency"
                label={t("currency")}
                required
                error={touched && !currency ? t("currencyRequired") : undefined}
              >
                {(a) => (
                  <Select
                    value={currency ?? ""}
                    onValueChange={(v) => void setP({ currency: v })}
                    disabled={type.currencies.length === 1}
                  >
                    <SelectTrigger {...a}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {type.currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              {p.kind === "demo" && (
                <Field id="oa-balance" label={t("demoBalance")}>
                  {(a) => (
                    <Select
                      value={String(p.balance ?? type.demoBalances[0])}
                      onValueChange={(v) => void setP({ balance: Number(v) })}
                    >
                      <SelectTrigger {...a}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {type.demoBalances.map((b) => (
                          <SelectItem key={b} value={String(b)}>
                            {formatMoney(b, type.currencies[0])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              )}
              <Field
                id="oa-label"
                label={t("label")}
                hint={t("labelHint")}
                error={label.trim().length > 40 ? vt("labelTooLong") : undefined}
              >
                {(a) => (
                  <Input {...a} value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
                )}
              </Field>
              <div className="flex justify-between gap-2">
                {firstStep === "type" ? (
                  <Button variant="ghost" onClick={() => history.back()}>
                    {t("back")}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  onClick={() => {
                    setTouched(true);
                    if (p.leverage && currency) {
                      setTouched(false);
                      if (!p.currency) void setP({ currency });
                      go("review");
                    }
                  }}
                >
                  {t("continue")}
                </Button>
              </div>
            </Card>
          )}

          {step === "review" && type && p.leverage && currency && (
            <Card className="grid gap-5">
              <h2 className="font-display text-lg font-bold">{t("review")}</h2>
              <dl className="grid gap-3 text-sm">
                {[
                  [t("reviewKind"), p.kind === "demo" ? t("demo") : t("live")],
                  [t("reviewType"), ta(`types.${type.id}`)],
                  [t("leverage"), formatLeverage(p.leverage)],
                  [t("currency"), currency],
                  ...(p.kind === "demo"
                    ? [[t("demoBalance"), formatMoney(p.balance ?? type.demoBalances[0]!, currency)]]
                    : []),
                  ...(label.trim() ? [[t("label"), label.trim()]] : []),
                  ...(p.kind === "live" ? [[t("minDeposit"), formatMoney(type.minDeposit)]] : []),
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 border-b border-border pb-3 last:border-0"
                  >
                    <dt className="text-text-3">{k}</dt>
                    <dd className="font-display font-medium tabular">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => history.back()}>
                  {t("back")}
                </Button>
                <Button loading={open.isPending} onClick={submit}>
                  {t("submit")}
                </Button>
              </div>
            </Card>
          )}

          {/* Deep link to a later step without its inputs → start over cleanly. */}
          {((step !== "type" && !type) || (step === "review" && (!p.leverage || !currency))) && (
            <Button variant="outline" className="w-fit" onClick={() => void setP({ step: null })}>
              {t("back")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function TypeCard({
  type,
  selected,
  onSelect,
}: {
  type: AccountType;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("openAccount");
  const ta = useTranslations("accounts");
  const name = ta(`types.${type.id}`);
  const rows: [string, string][] = [
    [t("minDeposit"), formatMoney(type.minDeposit)],
    [t("spread"), t("pips", { value: formatNumber(type.spreadFrom, 1) })],
    [
      t("commission"),
      type.commissionPerLot === null
        ? t("noCommission")
        : t("commissionValue", { amount: formatMoney(type.commissionPerLot) }),
    ],
    [t("maxLeverage"), formatLeverage(type.maxLeverage)],
  ];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col gap-4 rounded-lg border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring",
        selected
          ? "border-primary-border bg-primary-soft"
          : "border-border bg-surface-1 hover:border-border-strong",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-display text-lg font-bold">{name}</span>
        {selected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-display text-xs font-medium text-on-primary">
            <Check aria-hidden className="size-3.5" /> {t("selected")}
          </span>
        )}
      </span>
      <dl className="grid gap-2 text-sm">
        {rows.map(([k, v]) => (
          <span key={k} className="flex justify-between gap-3">
            <dt className="text-text-3">{k}</dt>
            <dd className="font-display font-medium tabular">{v}</dd>
          </span>
        ))}
      </dl>
    </button>
  );
}

function Success({ credentials, kind }: { credentials: Credentials; kind: "live" | "demo" }) {
  const t = useTranslations("openAccount");
  const tc = useTranslations("common");
  const [reveal, setReveal] = useState(false);
  const rows: [string, string, boolean][] = [
    [t("credentialsLogin"), String(credentials.login), false],
    [t("credentialsServer"), credentials.server, false],
    [t("credentialsMaster"), credentials.masterPassword, true],
    [t("credentialsInvestor"), credentials.investorPassword, true],
  ];
  return (
    <div className="mx-auto grid max-w-xl gap-6 pt-4">
      <div className="grid justify-items-center gap-2 text-center">
        <CircleCheck aria-hidden className="size-12 text-success" />
        <h1 className="font-display text-2xl font-bold">{t("successTitle")}</h1>
        <p className="text-sm text-text-2">{t("successBody")}</p>
      </div>
      <Card className="grid gap-3">
        <dl className="grid gap-3 text-sm">
          {rows.map(([k, v, secret]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="text-text-3">{k}</dt>
              <dd className="flex items-center gap-1 font-display font-medium tabular">
                {secret && !reveal ? "••••••••••" : v}
                <CopyButton value={v} label={tc("copyValue", { label: k.toLowerCase() })} />
              </dd>
            </div>
          ))}
        </dl>
        <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setReveal((r) => !r)}>
          <Eye aria-hidden /> {reveal ? tc("hide") : tc("show")}
        </Button>
      </Card>
      <div className="flex flex-col gap-2 sm:flex-row">
        {kind === "live" && (
          <Link
            href={`/funds/deposit?account=${credentials.login}`}
            className={buttonVariants({ block: true })}
          >
            <ArrowDownToLine aria-hidden /> {t("depositNow")}
          </Link>
        )}
        <Link href="/trading/platforms" className={buttonVariants({ variant: "outline", block: true })}>
          <Download aria-hidden /> {t("download")}
        </Link>
      </div>
      <Link href={`/trading/accounts/${credentials.login}`} className={buttonVariants({ variant: "link" })}>
        {t("viewAccount")} · {formatAccountId(credentials.login)}
      </Link>
    </div>
  );
}
