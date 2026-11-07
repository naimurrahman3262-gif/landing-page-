"use client";

import { Globe, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormAlert } from "@/components/auth/auth-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Stepper } from "@/components/common/stepper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useCreateDeposit, useMethods, useQuote, useTransaction, useWallet } from "@/lib/api/queries/funds";
import { formatMoney, formatNumber } from "@/lib/format";
import { checkAmount, estimate, fundOptions, parseAmount } from "@/lib/funds";
import { useApiErrorMessage } from "@/lib/hooks";
import { AccountPicker } from "./account-picker";
import { AmountInput } from "./amount-input";
import { MethodCard } from "./method-card";
import { ReviewSummary } from "./review-summary";
import { StickyActionBar } from "./sticky-action-bar";

const STEPS = ["where", "how", "amount"] as const;
type Step = (typeof STEPS)[number];

/**
 * Deposit in 3 steps (brief §6.5). Each step has its own URL (?step=) so Back
 * works; the page scrolls to the top on every step change.
 */
export function DepositFlow() {
  const t = useTranslations("funds");
  const locale = useLocale();
  const countryName = (code: string) => regionName(code, locale);
  const router = useRouter();
  const apiError = useApiErrorMessage();
  const [p, setP] = useQueryStates(
    {
      step: parseAsStringLiteral(STEPS).withDefault("where"),
      account: parseAsString, // destination: "wallet" | login (cards link with ?account=)
      method: parseAsString,
      amount: parseAsString,
      all: parseAsBoolean.withDefault(false),
      retry: parseAsString,
    },
    { history: "push" },
  );
  const wallet = useWallet();
  const accounts = useAccounts();
  const methods = useMethods("deposit", p.all);
  const create = useCreateDeposit();
  const retryTx = useTransaction(p.retry ?? undefined);
  const [error, setError] = useState<string>();
  // One idempotency key per attempt, so a double tap can't create two deposits.
  const idemKey = useRef(crypto.randomUUID());

  const options = useMemo(
    () =>
      wallet.data && accounts.data
        ? fundOptions("deposit", wallet.data.balance, accounts.data.items)
        : undefined,
    [wallet.data, accounts.data],
  );
  const destination = p.account ?? "wallet";
  const dest = options?.find((o) => o.value === destination);
  const method = methods.data?.items.find((m) => m.id === p.method);
  const amount = parseAmount(p.amount ?? "");
  const problem = method ? checkAmount(p.amount ?? "", { min: method.min, max: method.max }) : null;
  const valid = !!method && amount !== null && !problem;
  const quote = useQuote(
    { methodId: method?.id, amount: amount ?? undefined, purpose: "deposit" },
    p.step === "amount" && valid,
  );

  // Prefill from a failed/rejected deposit ("Fix and retry").
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !retryTx.data || !methods.data) return;
    prefilled.current = true;
    const tx = retryTx.data;
    const m = methods.data.items.find((x) => x.name === tx.method);
    void setP({
      account: tx.account.kind === "wallet" ? "wallet" : String(tx.account.login),
      method: m?.id ?? null,
      amount: String(tx.amount),
      step: m ? "amount" : "how",
    });
  }, [retryTx.data, methods.data, setP]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [p.step]);

  const go = (step: Step) => void setP({ step });
  const stepLabels = STEPS.map((id) => ({ id, label: t(`steps.${id}`) }));

  async function submit() {
    if (!method || amount === null || !valid) return;
    setError(undefined);
    try {
      const res = await create.mutateAsync({
        methodId: method.id,
        destination,
        amount,
        idempotencyKey: idemKey.current,
      });
      router.push(`/funds/deposit/status/${res.transaction.id}` as never);
    } catch (e) {
      setError(apiError(e).message || t("deposit.error"));
      idemKey.current = crypto.randomUUID();
    }
  }

  const destName = dest ? (dest.kind === "wallet" ? t("wallet") : dest.name) : "";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title={t("deposit.title")} subtitle={t("deposit.subtitle")} />
      <Stepper steps={stepLabels} current={p.step} className="mb-6" />
      {p.retry && <FormAlert tone="info">{t("deposit.retryNote")}</FormAlert>}
      <FormAlert>{error}</FormAlert>

      {(wallet.isError || accounts.isError) && (
        <ErrorState
          title={t("deposit.error")}
          onRetry={() => {
            void wallet.refetch();
            void accounts.refetch();
          }}
        />
      )}

      {p.step === "where" && (
        <section aria-labelledby="dep-where" className="grid gap-3">
          <h2 id="dep-where" className="font-display text-lg font-bold">
            {t("deposit.whereTitle")}
          </h2>
          <AccountPicker
            id="dep-destination"
            label={t("deposit.whereTitle")}
            options={options}
            value={destination}
            onChange={(v) => void setP({ account: v === "wallet" ? null : v })}
            amountKind="balance"
          />
          <StickyActionBar>
            <Button disabled={!dest || !!dest.disabledReason} onClick={() => go("how")}>
              {t("continue")}
            </Button>
          </StickyActionBar>
        </section>
      )}

      {p.step === "how" && (
        <section aria-labelledby="dep-how" className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="dep-how" className="font-display text-lg font-bold">
              {t("deposit.howTitle")}
            </h2>
            {methods.data && (
              <Button variant="link" size="sm" onClick={() => void setP({ all: !p.all || null })}>
                <Globe aria-hidden />
                {p.all
                  ? t("deposit.showLocal", { country: countryName(methods.data.country) })
                  : t("deposit.showAll")}
              </Button>
            )}
          </div>
          {methods.data && !p.all && (
            <p className="flex items-center gap-1.5 text-sm text-text-3">
              <Info aria-hidden className="size-4" />{" "}
              {t("deposit.countryNote", { country: countryName(methods.data.country) })}
            </p>
          )}
          {methods.isPending && <Skeleton className="h-64" />}
          {methods.isError && (
            <ErrorState compact title={t("deposit.error")} onRetry={() => methods.refetch()} />
          )}
          {methods.data && methods.data.items.length === 0 && (
            <EmptyState
              icon={Globe}
              title={t("deposit.noMethods", { country: countryName(methods.data.country) })}
            />
          )}
          {methods.data && (
            <div role="radiogroup" aria-labelledby="dep-how" className="grid gap-3">
              {methods.data.items.map((m) => (
                <MethodCard
                  key={m.id}
                  method={m}
                  selected={m.id === p.method}
                  onSelect={() => void setP({ method: m.id })}
                />
              ))}
            </div>
          )}
          <StickyActionBar onBack={() => router.back()}>
            <Button disabled={!method} onClick={() => go("amount")}>
              {t("continue")}
            </Button>
          </StickyActionBar>
        </section>
      )}

      {p.step === "amount" && method && (
        <section aria-labelledby="dep-amount" className="grid gap-5">
          <h2 id="dep-amount" className="font-display text-lg font-bold">
            {t("deposit.amountTitle")}
          </h2>
          <AmountInput
            id="dep-amount-input"
            value={p.amount ?? ""}
            onChange={(v) => void setP({ amount: v || null }, { history: "replace" })}
            presets={method.presets}
            problem={problem}
            methodName={method.name}
            hint={
              amount !== null && method.rate !== 1 && !problem
                ? t("amount.localEstimate", {
                    amount: formatMoney(estimate(method, amount).local, method.localCurrency, {
                      decimals: 0,
                    }),
                    rate: `$1.00 = ${formatMoney(method.rate, method.localCurrency, { decimals: method.rate >= 100 ? 0 : 2 })}`,
                  })
                : undefined
            }
          />
          {valid && (
            <section aria-label={t("review.title")} aria-busy={quote.isFetching || undefined}>
              {quote.isError ? (
                <FormAlert>{apiError(quote.error).message || t("review.quoteError")}</FormAlert>
              ) : (
                <ReviewSummary
                  rows={[
                    { label: t("review.destination"), value: destName },
                    { label: t("review.method"), value: method.name },
                    { label: t("review.amount"), value: formatMoney(quote.data?.amount ?? amount!) },
                    { label: t("review.fee"), value: quote.data ? formatMoney(quote.data.fee) : "…" },
                    ...(method.rate !== 1 && quote.data
                      ? [
                          {
                            label: t("review.rate"),
                            value: t("review.rateValue", {
                              rate: formatMoney(quote.data.rate, quote.data.localCurrency, {
                                decimals: quote.data.rate >= 100 ? 0 : 2,
                              }),
                            }),
                          },
                          {
                            label: t("review.local"),
                            value: formatMoney(quote.data.localAmount, quote.data.localCurrency, {
                              decimals: quote.data.rate >= 100 ? 0 : 2,
                            }),
                          },
                        ]
                      : []),
                    { label: t("review.eta"), value: quote.data?.eta ?? method.eta },
                    {
                      label: t("review.receive"),
                      strong: true,
                      value: quote.data
                        ? dest?.currency === "USC"
                          ? `${formatMoney(quote.data.net)} (${formatNumber(quote.data.net * 100)} USC)`
                          : formatMoney(quote.data.net)
                        : "…",
                    },
                  ]}
                />
              )}
            </section>
          )}
          <StickyActionBar onBack={() => router.back()}>
            <Button
              className="truncate"
              disabled={!valid || !quote.data}
              loading={create.isPending}
              onClick={submit}
            >
              {valid && amount !== null
                ? t("deposit.continueCta", { amount: formatMoney(amount), method: method.name })
                : t("deposit.continueIdle")}
            </Button>
          </StickyActionBar>
        </section>
      )}

      {p.step === "amount" && !method && methods.data && (
        <Button variant="outline" onClick={() => go("how")}>
          {t("back")}
        </Button>
      )}
    </div>
  );
}

function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
