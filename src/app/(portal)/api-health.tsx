"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api/client";

/** Proves the browser → BFF → MSW backend chain works. Removed in Phase 4. */
export function ApiHealth() {
  const t = useTranslations("scaffold");
  const { status } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ status: string }>("/health"),
  });

  return (
    <section
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border bg-surface-1 p-6"
      data-testid="api-health"
      data-status={status}
    >
      {status === "pending" && <LoaderCircle aria-hidden className="size-5 animate-spin text-text-3" />}
      {status === "success" && <CircleCheck aria-hidden className="size-5 text-success" />}
      {status === "error" && <CircleAlert aria-hidden className="size-5 text-danger" />}
      <div>
        <p className="font-display font-medium">{t("apiCheck")}</p>
        <p className="text-sm text-text-2">
          {status === "pending" ? t("checking") : status === "success" ? t("apiOk") : t("apiError")}
        </p>
      </div>
    </section>
  );
}
