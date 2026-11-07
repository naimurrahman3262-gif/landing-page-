"use client";

import { ArrowDownUp, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useCreateTransfer, useWallet } from "@/lib/api/queries/funds";
import { formatMoney } from "@/lib/format";
import { checkAmount, fundOptions, parseAmount, type FundOption } from "@/lib/funds";
import { useApiErrorMessage } from "@/lib/hooks";
import { AccountPicker } from "./account-picker";
import { AmountInput } from "./amount-input";
import { ReviewSummary } from "./review-summary";
import { StickyActionBar } from "./sticky-action-bar";

/**
 * Transfer in 2 steps (brief §6.5): one screen with From ⇄ To + amount and
 * both new balances live, then a review dialog ("instant and can't be
 * reversed"). No extra chooser step; "another client" is a small note.
 */
export function TransferView() {
  const t = useTranslations("funds");
  const apiError = useApiErrorMessage();
  const [p, setP] = useQueryStates({ from: parseAsString, to: parseAsString, amount: parseAsString });
  const wallet = useWallet();
  const accounts = useAccounts();
  const transfer = useCreateTransfer();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();
  const idemKey = useRef(crypto.randomUUID());

  const fromValue = p.from ?? "wallet";
  const fromOptions = useMemo(
    () =>
      wallet.data && accounts.data
        ? fundOptions("transferFrom", wallet.data.balance, accounts.data.items)
        : undefined,
    [wallet.data, accounts.data],
  );
  // The destination list never includes the source.
  const toOptions = useMemo(
    () =>
      wallet.data && accounts.data
        ? fundOptions("transferTo", wallet.data.balance, accounts.data.items, fromValue)
        : undefined,
    [wallet.data, accounts.data, fromValue],
  );
  const from = fromOptions?.find((o) => o.value === fromValue);
  const to = toOptions?.find((o) => o.value === p.to);
  const available = from?.amountUsd ?? 0;
  const amount = parseAmount(p.amount ?? "");
  const problem = checkAmount(p.amount ?? "", { min: 0.01, available });
  const valid = !!from && !from.disabledReason && !!to && !to.disabledReason && amount !== null && !problem;

  const name = (o?: FundOption) => (o ? (o.kind === "wallet" ? t("wallet") : o.name) : "");
  const fromAfter = amount !== null ? Math.round((available - amount) * 100) / 100 : available;
  const toAfter = to ? Math.round((to.amountUsd + (amount ?? 0)) * 100) / 100 : null;

  function swap() {
    // Only swap when the destination can also be a source.
    void setP({ from: p.to === "wallet" ? null : p.to, to: fromValue });
  }

  async function submit() {
    if (!valid || !to || amount === null) return;
    setError(undefined);
    try {
      await transfer.mutateAsync({ from: fromValue, to: to.value, amount, idempotencyKey: idemKey.current });
      toast.success(t("transfer.success", { amount: formatMoney(amount), to: name(to) }));
      setConfirm(false);
      idemKey.current = crypto.randomUUID();
      void setP({ amount: null });
    } catch (e) {
      setError(apiError(e).message || t("transfer.error"));
      idemKey.current = crypto.randomUUID();
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title={t("transfer.title")} subtitle={t("transfer.subtitle")} />
      <Card className="grid gap-4">
        <div className="grid gap-2">
          <span className="text-sm font-medium" id="tr-from-label">
            {t("transfer.from")}
          </span>
          <AccountPicker
            id="tr-from"
            label={t("transfer.from")}
            options={fromOptions}
            value={fromValue}
            onChange={(v) => void setP({ from: v === "wallet" ? null : v, to: p.to === v ? null : p.to })}
            amountKind="available"
          />
          {amount !== null && !problem && (
            <p className="text-sm text-text-2 tabular">
              {t("transfer.newBalance", { amount: formatMoney(fromAfter) })}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("transfer.swap")}
            onClick={swap}
            disabled={!p.to || !fromOptions?.some((o) => o.value === p.to && !o.disabledReason)}
          >
            <ArrowDownUp aria-hidden />
          </Button>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium">{t("transfer.to")}</span>
          <AccountPicker
            id="tr-to"
            label={t("transfer.chooseTo")}
            options={toOptions}
            value={p.to}
            onChange={(v) => void setP({ to: v })}
            amountKind="balance"
          />
          {toAfter !== null && amount !== null && !problem && (
            <p className="text-sm text-text-2 tabular">
              {t("transfer.newBalance", { amount: formatMoney(toAfter) })}
            </p>
          )}
        </div>

        <AmountInput
          id="tr-amount"
          value={p.amount ?? ""}
          onChange={(v) => void setP({ amount: v || null })}
          max={available}
          problem={problem}
        />

        <p className="flex items-center gap-1.5 text-sm text-text-3">
          <Info aria-hidden className="size-4 shrink-0" /> {t("transfer.otherClient")}
        </p>
      </Card>

      <StickyActionBar>
        <Button disabled={!valid} onClick={() => setConfirm(true)}>
          {t("transfer.review")}
        </Button>
      </StickyActionBar>

      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => {
          setConfirm(o);
          if (!o) setError(undefined);
        }}
        title={t("transfer.confirmTitle")}
        description={t("transfer.confirmBody")}
        confirmLabel={t("transfer.confirm")}
        pending={transfer.isPending}
        error={error}
        onConfirm={submit}
      >
        {valid && to && amount !== null && (
          <ReviewSummary
            rows={[
              { label: t("review.source"), value: name(from) },
              { label: t("review.destination"), value: name(to) },
              { label: t("transfer.after", { account: name(from) }), value: formatMoney(fromAfter) },
              { label: t("transfer.after", { account: name(to) }), value: formatMoney(toAfter ?? 0) },
              { label: t("review.amount"), value: formatMoney(amount), strong: true },
            ]}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
