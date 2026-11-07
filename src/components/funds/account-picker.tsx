"use client";

import { Check, ChevronDown, Search, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Destination } from "@/lib/api/schemas";
import { formatMoney } from "@/lib/format";
import type { FundOption } from "@/lib/funds";
import { cn } from "@/lib/utils";

export interface AccountPickerProps {
  id: string;
  label: string;
  options: FundOption[] | undefined;
  value: Destination | null;
  onChange: (value: Destination) => void;
  /** "available" for money going out, "balance" for money coming in. */
  amountKind: "available" | "balance";
  invalid?: boolean;
}

function useOptionText() {
  const t = useTranslations("funds");
  const ta = useTranslations("accounts");
  const ts = useTranslations("status");
  return (o: FundOption, amountKind: "available" | "balance") => {
    const name = o.kind === "wallet" ? t("wallet") : o.name;
    const type = o.kind === "wallet" ? "" : ta(`types.${o.kind}`);
    const money = o.currency === "USC" ? formatMoney(o.native, "USC") : formatMoney(o.amountUsd);
    const amount =
      amountKind === "available"
        ? t("picker.available", { amount: money })
        : t("picker.balance", { amount: money });
    const reason =
      o.disabledReason === "zero"
        ? t("picker.disabledZero")
        : o.disabledReason === "status" && o.status
          ? t("picker.disabledStatus", { status: ts(o.status).toLowerCase() })
          : null;
    return { name, type, amount, reason };
  };
}

/**
 * The one account picker (brief §6.5): a trigger showing the choice, opening a
 * searchable sheet (bottom sheet on mobile). Wallet first. Rows that can't be
 * used stay visible, disabled, with the reason.
 */
export function AccountPicker({
  id,
  label,
  options,
  value,
  onChange,
  amountKind,
  invalid,
}: AccountPickerProps) {
  const t = useTranslations("funds");
  const text = useOptionText();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options?.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!options || !needle) return options ?? [];
    return options.filter((o) => {
      const s = text(o, amountKind);
      return `${s.name} ${s.type} ${o.value}`.toLowerCase().includes(needle);
    });
  }, [options, q, text, amountKind]);

  if (!options) return <Skeleton className="h-16" />;
  const sel = selected ? text(selected, amountKind) : null;

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "flex min-h-16 w-full items-center gap-3 rounded-md border bg-surface-1 px-4 py-3 text-left transition-colors",
          "hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus-ring",
          invalid ? "border-danger" : "border-border-input",
        )}
      >
        <span className="grid size-9 shrink-0 place-content-center rounded-full bg-surface-3 text-text-2">
          <Wallet aria-hidden className="size-4" />
        </span>
        <span className="grid min-w-0 flex-1">
          {sel ? (
            <>
              <span className="truncate font-display font-medium text-text-1">
                {sel.name}
                {sel.type && <span className="text-text-3"> · {sel.type}</span>}
              </span>
              <span className="truncate text-sm text-text-2 tabular">{sel.amount}</span>
            </>
          ) : (
            <span className="text-text-3">{t("picker.choose")}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary-text">
          {t("picker.change")} <ChevronDown aria-hidden className="size-4" />
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="max-sm:inset-x-0 max-sm:top-auto max-sm:h-auto max-sm:max-h-sheet max-sm:rounded-t-xl max-sm:border-t max-sm:border-l-0"
        >
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription className="sr-only">{t("picker.search")}</SheetDescription>
          </SheetHeader>
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-3"
              />
              <Input
                type="search"
                aria-label={t("picker.search")}
                placeholder={t("picker.search")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <SheetBody className="p-2">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-2">{t("picker.empty")}</p>
            ) : (
              <div role="radiogroup" aria-label={label} className="grid gap-1">
                {filtered.map((o) => {
                  const s = text(o, amountKind);
                  const isSel = o.value === value;
                  const disabled = !!o.disabledReason;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={isSel}
                      aria-disabled={disabled || undefined}
                      onClick={() => {
                        if (disabled) return;
                        onChange(o.value);
                        setOpen(false);
                        setQ("");
                      }}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
                        isSel ? "bg-primary-soft" : "hover:bg-surface-2",
                        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
                      )}
                    >
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate font-display font-medium">
                          {s.name}
                          {s.type && <span className="text-text-3"> · {s.type}</span>}
                        </span>
                        <span className="truncate text-sm text-text-2 tabular">{s.reason ?? s.amount}</span>
                      </span>
                      {isSel && <Check aria-hidden className="size-5 shrink-0 text-primary-text" />}
                    </button>
                  );
                })}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
