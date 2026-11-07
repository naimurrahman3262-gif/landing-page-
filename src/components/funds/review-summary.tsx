import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ReviewRow {
  label: string;
  value: ReactNode;
  /** Emphasise the bottom line ("You'll receive"). */
  strong?: boolean;
}

/** Review summary shared by Deposit, Withdraw and Transfer (brief §6.5). */
export function ReviewSummary({ rows, className }: { rows: ReviewRow[]; className?: string }) {
  return (
    <dl className={cn("grid gap-0 rounded-lg border border-border bg-surface-1 px-4", className)}>
      {rows.map((r) => (
        <div
          key={r.label}
          className={cn(
            "flex items-start justify-between gap-4 border-b border-border py-3 text-sm last:border-0",
            r.strong && "py-4",
          )}
        >
          <dt className={r.strong ? "font-medium text-text-1" : "text-text-2"}>{r.label}</dt>
          <dd
            className={cn(
              "text-right font-display tabular",
              r.strong ? "text-lg font-bold text-text-1" : "font-medium text-text-1",
            )}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
