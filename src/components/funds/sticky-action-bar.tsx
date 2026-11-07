"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui";

/**
 * Bottom action bar for money flows: one row with Back and the primary action.
 * Fixed to the viewport bottom on mobile (safe-area aware) so the main action
 * is always one thumb away; sticky at the bottom of the flow column from `sm`.
 */
export function StickyActionBar({
  onBack,
  children,
  summary,
}: {
  onBack?: () => void;
  /** The primary action, e.g. "Continue — $250.00 via USDT (TRC20)". */
  children: ReactNode;
  summary?: ReactNode;
}) {
  const t = useTranslations("funds");
  const addStickyBar = useUiStore((s) => s.addStickyBar);
  // The chat launcher hides while a stepper footer is on screen (brief §6.11).
  useEffect(() => addStickyBar(), [addStickyBar]);
  return (
    <>
      {/* Spacer so the fixed bar never covers the last field on mobile. */}
      <div aria-hidden className="h-24 sm:hidden" />
      <div
        data-slot="sticky-action-bar"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-safe backdrop-blur sm:sticky sm:inset-x-auto sm:mt-6 sm:rounded-lg sm:border sm:bg-surface-1/95 sm:pt-3"
      >
        <div className="flex min-w-0 items-center gap-3 pb-3">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onBack}
              aria-label={t("back")}
              className="shrink-0"
            >
              <ArrowLeft aria-hidden className="size-5!" />
            </Button>
          )}
          {summary && (
            <div className="hidden min-w-0 flex-1 truncate text-sm text-text-2 sm:block">{summary}</div>
          )}
          <div className="min-w-0 flex-1 sm:ml-auto sm:flex sm:flex-none sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
