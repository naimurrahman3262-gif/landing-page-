"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney, formatNumber } from "@/lib/format";
import type { AmountProblem } from "@/lib/funds";
import { cn } from "@/lib/utils";

export interface AmountInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  presets?: number[];
  /** Show a Max button that fills this amount. */
  max?: number;
  problem: AmountProblem | null;
  /** Method name for "Below the $50.00 minimum for USDT (TRC20)". */
  methodName?: string;
  /** Optional line under the field, e.g. local-currency estimate or remaining balance. */
  hint?: ReactNode;
}

/**
 * Amount entry with the currency prefix aligned in the field, realistic presets,
 * a Max button and live validation that says what happened + what to do.
 */
export function AmountInput({
  id,
  value,
  onChange,
  presets,
  max,
  problem,
  methodName = "",
  hint,
}: AmountInputProps) {
  const t = useTranslations("funds.amount");
  const errorId = problem ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const message =
    problem?.kind === "belowMin"
      ? t("belowMin", { min: formatMoney(problem.min), method: methodName })
      : problem?.kind === "aboveMax"
        ? t("aboveMax", { max: formatMoney(problem.max), method: methodName })
        : problem?.kind === "aboveAvailable"
          ? t("aboveAvailable", { amount: formatMoney(problem.available) })
          : problem?.kind === "invalid"
            ? t("invalid")
            : null;

  return (
    <div className="grid min-w-0 gap-3">
      <label htmlFor={id} className="text-sm font-medium">
        {t("label")}
      </label>
      <div
        className={cn(
          "flex h-16 min-w-0 items-center gap-1 rounded-md border bg-surface-1 px-4 transition-colors",
          "focus-within:outline-2 focus-within:outline-primary-border",
          problem ? "border-danger" : "border-border-input focus-within:border-focus-ring",
        )}
      >
        <span aria-hidden className="font-display text-2xl font-bold text-text-3">
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          aria-invalid={problem ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          size={1}
          className="h-full w-full min-w-0 flex-1 bg-transparent font-display text-2xl font-bold text-text-1 tabular outline-none placeholder:text-text-3"
        />
        <span className="font-display text-sm font-medium text-text-3">USD</span>
        {max !== undefined && max > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(formatNumber(max, 2).replace(/,/g, ""))}
          >
            {t("max")}
          </Button>
        )}
      </div>
      {message && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger-text" aria-live="polite">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {message}
        </p>
      )}
      {hint && (
        <div id={hintId} className="text-sm text-text-2">
          {hint}
        </div>
      )}
      {presets && presets.length > 0 && (
        <div role="group" aria-label={t("presets")} className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = value === String(p);
            return (
              <Button
                key={p}
                type="button"
                variant={active ? "primary" : "outline"}
                size="sm"
                aria-pressed={active}
                onClick={() => onChange(String(p))}
                className="tabular"
              >
                {formatMoney(p, "USD", { decimals: p % 1 === 0 ? 0 : 2 })}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
