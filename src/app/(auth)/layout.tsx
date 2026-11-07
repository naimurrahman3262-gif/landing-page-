import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Footer } from "@/components/shell/footer";
import { LanguageSelect } from "@/components/shell/language-select";
import { BRAND } from "@/config/brand";
import { LEGAL } from "@/config/legal";

/** Auth pages: no app shell, no chat launcher (G11), language switcher on every page. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("footer");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        <Link
          href="/login"
          className="rounded-sm font-display text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          {BRAND}
        </Link>
        <LanguageSelect />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        {children}
      </main>
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 md:px-8">
        {LEGAL.supportEmail && (
          <p className="mb-3 text-xs text-text-3">
            {t("support")}:{" "}
            <a
              href={`mailto:${LEGAL.supportEmail}`}
              className="text-text-2 underline-offset-4 hover:underline"
            >
              {LEGAL.supportEmail}
            </a>
          </p>
        )}
        <Footer />
      </div>
    </div>
  );
}
