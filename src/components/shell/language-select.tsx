"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOCALE_COOKIE } from "@/lib/auth/constants";
import { LOCALES } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/** Language switcher: auth pages and the profile menu. Stores the choice in a cookie. */
export function LanguageSelect({ className }: { className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      <SelectTrigger aria-label={t("auth.languageLabel")} className={cn("h-11 w-auto gap-2", className)}>
        <Languages aria-hidden className="size-4 text-text-3" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {t(`languages.${l}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
