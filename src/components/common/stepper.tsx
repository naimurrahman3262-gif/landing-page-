import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface StepperProps {
  steps: { id: string; label: string }[];
  current: string;
  className?: string;
}

/**
 * Progress for multi-step flows (Open account; Deposit, Withdraw and Transfer
 * in Phase 5). Full labels from `sm`, compact "Step 2 of 3" below it (§11).
 */
export function Stepper({ steps, current, className }: StepperProps) {
  const t = useTranslations("common");
  const index = Math.max(
    0,
    steps.findIndex((s) => s.id === current),
  );

  return (
    <nav aria-label={t("stepOf", { current: index + 1, total: steps.length })} className={className}>
      <p className="font-display text-sm font-medium text-text-2 sm:hidden">
        {t("stepOf", { current: index + 1, total: steps.length })} ·{" "}
        <span className="text-text-1">{steps[index]?.label}</span>
      </p>
      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((step, i) => {
          const state = i < index ? "done" : i === index ? "current" : "todo";
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className="flex items-center gap-2 font-display text-sm font-medium whitespace-nowrap"
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-content-center rounded-full border text-xs",
                    state === "done" && "border-primary bg-primary text-on-primary",
                    state === "current" && "border-primary-text text-primary-text",
                    state === "todo" && "border-border-strong text-text-3",
                  )}
                >
                  {state === "done" ? <Check aria-hidden className="size-4" /> : i + 1}
                </span>
                <span className={state === "todo" ? "text-text-3" : "text-text-1"}>{step.label}</span>
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn("h-px flex-1", i < index ? "bg-primary" : "bg-border-strong")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
