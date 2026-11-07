"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  /** What happened, e.g. "We couldn't load your accounts." */
  title: string;
  /** What to do next. */
  description?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  /** Extra action, e.g. "Open in new tab" or "Contact support". */
  action?: ReactNode;
  /** compact = inside a widget; never take over the whole page for one failed widget. */
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retrying,
  action,
  compact,
  className,
}: ErrorStateProps) {
  const t = useTranslations("common");
  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn(
        "flex flex-col gap-3 rounded-lg border",
        compact
          ? "border-danger-soft bg-danger-soft p-4"
          : "items-center border-border bg-surface-1 px-6 py-10 text-center",
        className,
      )}
    >
      <div className={cn("flex gap-3", compact ? "items-start" : "flex-col items-center")}>
        <TriangleAlert
          aria-hidden
          className={cn("shrink-0 text-danger-text", compact ? "mt-0.5 size-5" : "size-7")}
        />
        <div className="grid gap-1">
          <p className="font-display font-bold text-text-1">{title}</p>
          {description && <p className="text-sm text-text-2">{description}</p>}
        </div>
      </div>
      {(onRetry || action) && (
        <div className={cn("flex flex-wrap gap-2", compact && "pl-8")}>
          {onRetry && (
            <Button variant="outline" size={compact ? "sm" : "md"} onClick={onRetry} loading={retrying}>
              {!retrying && <RotateCw aria-hidden />}
              {t("tryAgain")}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
