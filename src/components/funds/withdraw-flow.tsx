"use client";

import { Check, IdCard, Info, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormAlert } from "@/components/auth/auth-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { StepUpAuthDialog } from "@/components/common/step-up-auth-dialog";
import { Stepper } from "@/components/common/stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/lib/api/queries/accounts";
import {
  useCreateWithdrawal,
  useDuplicateWithdrawal,
  useMethods,
  usePayoutMethods,
  useQuote,
  useTransaction,
  useWallet,
} from "@/lib/api/queries/funds";
import type { Method, PayoutMethod } from "@/lib/api/schemas";
import { formatMoney } from "@/lib/format";
import { useFormatDate } from "@/lib/format-context";
import { checkAmount, fundOptions, parseAmount } from "@/lib/funds";
import { useApiErrorMessage } from "@/lib/hooks";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { AccountPicker } from "./account-picker";
import { AmountInput } from "./amount-input";
import { PayoutMethodSheet } from "./payout-method-sheet";
import { ReviewSummary } from "./review-summary";
import { StickyActionBar } from "./sticky-action-bar";

const STEPS = ["from", "to", "amount", "review"] as const;
type Step = (typeof STEPS)[number];

/**
 * Withdraw in 4 steps (brief §6.5): From (withdrawable, not balance) → To
 * (saved payout methods with limits, fee, ETA) → Amount (Max, remaining
 * balance, duplicate warning) → Review + step-up. KYC-gated (§9).
 */
export function WithdrawFlow() {
  const user = useUser();
  if (user.kycStatus !== "verified") return <KycGate />;
  return <WithdrawSteps />;
}

function KycGate() {
  const t = useTranslations("funds.withdraw");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />
      <EmptyState
        icon={IdCard}
        title={t("kycTitle")}
        description={t("kycBody")}
        action={
          <Link href="/account/verification" className={buttonVariants()}>
            {t("kycCta")}
          </Link>
        }
      />
    </div>
  );
}

function WithdrawSteps() {
  const t = useTranslations("funds");
  const fmt = useFormatDate();
  const router = useRouter();
  const apiError = useApiErrorMessage();
  const [p, setP] = useQueryStates(
    {
      step: parseAsStringLiteral(STEPS).withDefault("from"),
      account: parseAsString, // source
      payout: parseAsString,
      amount: parseAsString,
      retry: parseAsString,
    },
    { history: "push" },
  );
  const wallet = useWallet();
  const accounts = useAccounts();
  const payouts = usePayoutMethods();
  const methods = useMethods("withdraw", true);
  const create = useCreateWithdrawal();
  const retryTx = useTransaction(p.retry ?? undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const [error, setError] = useState<string>();
  const idemKey = useRef(crypto.randomUUID());

  const options = useMemo(
    () =>
      wallet.data && accounts.data
        ? fundOptions("withdraw", wallet.data.balance, accounts.data.items)
        : undefined,
    [wallet.data, accounts.data],
  );
  const sourceValue = p.account ?? "wallet";
  const source = options?.find((o) => o.value === sourceValue);
  const methodOf = (pm: PayoutMethod): Method | undefined =>
    methods.data?.items.find((m) => m.id === pm.methodId);
  const payout = payouts.data?.find((x) => x.id === p.payout);
  const method = payout ? methodOf(payout) : undefined;
  const available = source?.amountUsd ?? 0;
  const amount = parseAmount(p.amount ?? "");
  const problem = method
    ? checkAmount(p.amount ?? "", { min: method.min, max: method.max, available })
    : null;
  const valid = !!method && amount !== null && !problem;
  const quote = useQuote(
    { methodId: method?.id, amount: amount ?? undefined, purpose: "withdraw" },
    valid && (p.step === "amount" || p.step === "review"),
  );
  const duplicate = useDuplicateWithdrawal(valid ? sourceValue : null, valid ? amount : null);

  // Prefill from a rejected withdrawal ("Fix and retry"); the problem stays visible.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !retryTx.data || !payouts.data || !methods.data) return;
    prefilled.current = true;
    const tx = retryTx.data;
    const m = methods.data.items.find((x) => x.name === tx.method);
    const pm = payouts.data.find((x) => x.methodId === m?.id && x.status === "verified");
    void setP({
      account: tx.account.kind === "wallet" ? null : String(tx.account.login),
      payout: pm?.id ?? null,
      amount: String(tx.amount),
      step: pm ? "amount" : "to",
    });
  }, [retryTx.data, payouts.data, methods.data, setP]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [p.step]);

  const go = (step: Step) => void setP({ step });
  const sourceName = source ? (source.kind === "wallet" ? t("wallet") : source.name) : "";
  const remaining = amount !== null ? Math.max(0, Math.round((available - amount) * 100) / 100) : available;
  const notWithdrawable = methods.data?.items.filter((m) => !m.withdrawable) ?? [];

  async function submit(stepUpToken: string) {
    if (!payout || amount === null) return;
    setError(undefined);
    try {
      const res = await create.mutateAsync({
        source: sourceValue,
        payoutMethodId: payout.id,
        amount,
        stepUpToken,
        idempotencyKey: idemKey.current,
      });
      router.push(`/funds/withdraw/status/${res.transaction.id}` as never);
    } catch (e) {
      setError(apiError(e).message || t("withdraw.error"));
      idemKey.current = crypto.randomUUID();
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title={t("withdraw.title")} subtitle={t("withdraw.subtitle")} />
      <Stepper
        steps={STEPS.map((id) => ({ id, label: t(`steps.${id}`) }))}
        current={p.step}
        className="mb-6"
      />
      {p.retry && <FormAlert tone="info">{t("withdraw.retryNote")}</FormAlert>}
      <FormAlert>{error}</FormAlert>

      {p.step === "from" && (
        <section aria-labelledby="wd-from" className="grid gap-3">
          <h2 id="wd-from" className="font-display text-lg font-bold">
            {t("withdraw.fromTitle")}
          </h2>
          <p className="flex items-start gap-1.5 text-sm text-text-3">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" /> {t("withdraw.fromHint")}
          </p>
          <AccountPicker
            id="wd-source"
            label={t("withdraw.fromTitle")}
            options={options}
            value={sourceValue}
            onChange={(v) => void setP({ account: v === "wallet" ? null : v })}
            amountKind="available"
          />
          <StickyActionBar>
            <Button disabled={!source || !!source.disabledReason} onClick={() => go("to")}>
              {t("continue")}
            </Button>
          </StickyActionBar>
        </section>
      )}

      {p.step === "to" && (
        <section aria-labelledby="wd-to" className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="wd-to" className="font-display text-lg font-bold">
              {t("withdraw.toTitle")}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus aria-hidden /> {t("withdraw.addNew")}
            </Button>
          </div>
          {(payouts.isPending || methods.isPending) && <Skeleton className="h-48" />}
          {payouts.data && payouts.data.length === 0 && (
            <EmptyState
              icon={Plus}
              title={t("withdraw.noPayouts")}
              action={<Button onClick={() => setAddOpen(true)}>{t("withdraw.addNew")}</Button>}
            />
          )}
          {payouts.data && methods.data && payouts.data.length > 0 && (
            <div role="radiogroup" aria-labelledby="wd-to" className="grid gap-3">
              {payouts.data.map((pm) => {
                const m = methodOf(pm);
                const usable = pm.status === "verified";
                const selected = pm.id === p.payout;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-disabled={!usable || undefined}
                    onClick={() => usable && void setP({ payout: pm.id })}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring",
                      selected ? "border-primary-border bg-primary-soft" : "border-border bg-surface-1",
                      usable ? "hover:border-border-strong" : "cursor-not-allowed opacity-70",
                    )}
                  >
                    <span className="grid min-w-0 flex-1 gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold">{pm.label}</span>
                        <span className="font-display text-sm text-text-2 tabular">{pm.masked}</span>
                        {pm.isDefault && (
                          <span className="rounded-sm bg-primary-soft px-1.5 text-xs text-primary-text">
                            {t("withdraw.default")}
                          </span>
                        )}
                        <StatusBadge status={pm.status} />
                      </span>
                      <span className="text-sm text-text-2">{m?.name}</span>
                      {m && (
                        <span className="text-sm text-text-2 tabular">
                          {t("withdraw.pmLimits", {
                            min: formatMoney(m.min),
                            max: formatMoney(m.max),
                            fee: m.feeFixed || m.feePct ? formatMoney(m.feeFixed) : t("method.noFee"),
                            eta: m.eta,
                          })}
                        </span>
                      )}
                      {!usable && (
                        <span className="text-sm text-warning-text">
                          {pm.rejectionReason ?? t("withdraw.pmNotUsable")}
                        </span>
                      )}
                    </span>
                    {selected && <Check aria-hidden className="size-5 shrink-0 text-primary-text" />}
                  </button>
                );
              })}
            </div>
          )}
          {notWithdrawable.length > 0 && (
            <details className="rounded-lg border border-border px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-text-2">
                {t("withdraw.notWithdrawableTitle")}
              </summary>
              <ul className="mt-2 grid gap-2 text-text-2">
                {notWithdrawable.map((m) => (
                  <li key={m.id}>
                    <span className="font-medium text-text-1">{m.name}:</span> {m.withdrawNote}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <StickyActionBar onBack={() => router.back()}>
            <Button disabled={!payout || payout.status !== "verified"} onClick={() => go("amount")}>
              {t("continue")}
            </Button>
          </StickyActionBar>
        </section>
      )}

      {(p.step === "amount" || p.step === "review") && method && payout && source && (
        <section aria-labelledby="wd-amount" className="grid gap-5">
          <h2 id="wd-amount" className="font-display text-lg font-bold">
            {p.step === "amount" ? t("withdraw.amountTitle") : t("withdraw.reviewTitle")}
          </h2>
          {p.step === "amount" && (
            <AmountInput
              id="wd-amount-input"
              value={p.amount ?? ""}
              onChange={(v) => void setP({ amount: v || null }, { history: "replace" })}
              max={Math.min(available, method.max)}
              problem={problem}
              methodName={method.name}
              hint={
                <span className="tabular">
                  {t("withdraw.remaining")}:{" "}
                  <span className="font-medium text-text-1">{formatMoney(remaining)}</span>
                  {" · "}
                  {t("picker.available", { amount: formatMoney(available) })}
                </span>
              }
            />
          )}
          {duplicate.data && (
            <div
              className="flex gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-text"
              role="status"
            >
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                {t("withdraw.duplicate", {
                  amount: formatMoney(amount ?? 0),
                  when: fmt(duplicate.data.createdAt, "relative"),
                })}{" "}
                <Link
                  href={`/funds/withdraw/status/${duplicate.data.id}` as never}
                  className="font-medium underline underline-offset-4"
                >
                  {t("withdraw.viewIt")}
                </Link>
              </span>
            </div>
          )}
          {valid && (
            <ReviewSummary
              rows={[
                { label: t("review.source"), value: sourceName },
                { label: t("review.destination"), value: `${payout.label} ${payout.masked}` },
                { label: t("review.method"), value: method.name },
                { label: t("review.amount"), value: formatMoney(amount!) },
                { label: t("review.fee"), value: quote.data ? formatMoney(quote.data.fee) : "…" },
                { label: t("review.eta"), value: quote.data?.eta ?? method.eta },
                { label: t("review.remaining", { account: sourceName }), value: formatMoney(remaining) },
                {
                  label: t("review.receive"),
                  value: quote.data ? formatMoney(quote.data.net) : "…",
                  strong: true,
                },
              ]}
            />
          )}
          {quote.isError && <FormAlert>{apiError(quote.error).message || t("review.quoteError")}</FormAlert>}
          <StickyActionBar onBack={() => router.back()}>
            {p.step === "amount" ? (
              <Button disabled={!valid || !quote.data} onClick={() => go("review")}>
                {t("continue")}
              </Button>
            ) : (
              <Button
                disabled={!valid || !quote.data}
                loading={create.isPending}
                onClick={() => setStepUp(true)}
              >
                {t("withdraw.confirm", { amount: formatMoney(amount ?? 0) })}
              </Button>
            )}
          </StickyActionBar>
        </section>
      )}

      {(p.step === "amount" || p.step === "review") &&
        !(method && payout) &&
        payouts.data &&
        methods.data && (
          <Button variant="outline" onClick={() => go("to")}>
            {t("back")}
          </Button>
        )}

      <PayoutMethodSheet open={addOpen} onOpenChange={setAddOpen} />
      <StepUpAuthDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={t("withdraw.stepUpAction")}
        onVerified={(tok) => void submit(tok)}
      />
    </div>
  );
}
