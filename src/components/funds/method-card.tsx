"use client";

import { Check, ChevronDown, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Method } from "@/lib/api/schemas";
import { formatMoney } from "@/lib/format";
import { monogram } from "@/lib/funds";
import { cn } from "@/lib/utils";

/**
 * Payment method card (brief §6.5). Selected ≠ hover: filled tint, cyan border,
 * check and "Selected" text. Processing time is real text. Limits in USD and
 * the local currency. Optional 3-step "How it works".
 */
export function MethodCard({
  method,
  selected,
  onSelect,
  purpose = "deposit",
}: {
  method: Method;
  selected: boolean;
  onSelect: () => void;
  purpose?: "deposit" | "withdraw";
}) {
  const t = useTranslations("funds.method");
  const fee =
    method.feeFixed === 0 && method.feePct === 0
      ? t("noFee")
      : [method.feeFixed ? formatMoney(method.feeFixed) : null, method.feePct ? `${method.feePct}%` : null]
          .filter(Boolean)
          .join(" + ");
  const local = method.localCurrency !== "USDT" && method.rate !== 1;
  const localMin = local
    ? formatMoney(method.min * method.rate, method.localCurrency, { decimals: 0 })
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        selected
          ? "border-primary-border bg-primary-soft"
          : "border-border bg-surface-1 hover:border-border-strong",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex w-full items-start gap-3 rounded-lg p-4 text-left focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-content-center rounded-md bg-surface-3 font-display text-sm font-bold text-text-1"
        >
          {monogram(method.name)}
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display font-bold text-text-1">{method.name}</span>
            {selected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-display text-xs font-medium text-on-primary">
                <Check aria-hidden className="size-3.5" /> {t("selected")}
              </span>
            )}
          </span>
          <span className="text-sm text-text-2">{method.description}</span>
          <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-text-1">
              <Clock aria-hidden className="size-3.5 text-text-3" />
              <span className="sr-only">{t("processing")}: </span>
              {method.eta}
            </span>
            <span className="text-text-2">
              {t("fee")}: <span className="text-text-1">{fee}</span>
            </span>
          </span>
          <span className="text-sm text-text-2 tabular">
            {t("minMax", { min: formatMoney(method.min), max: formatMoney(method.max) })}
            {localMin && <span className="text-text-3"> · {t("local", { amount: localMin })}</span>}
          </span>
          {purpose === "deposit" && !method.withdrawable && (
            <span className="text-xs text-text-3">{t("notWithdrawable")}</span>
          )}
        </span>
      </button>
      {method.howItWorks.length > 0 && (
        <details className="group border-t border-border px-4 py-2">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-sm py-1 text-sm font-medium text-primary-text focus-visible:outline-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden">
            {t("howItWorks")}
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-2 mb-1 grid gap-2 text-sm text-text-2">
            {method.howItWorks.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid size-5 shrink-0 place-content-center rounded-full bg-surface-3 text-xs font-bold text-text-1">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
