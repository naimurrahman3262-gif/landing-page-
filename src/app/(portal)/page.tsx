import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { ApiHealth } from "./api-health";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("scaffold");
  return { title: t("title") };
}

/** Temporary Phase 1 page. Replaced by the Home portfolio overview in Phase 4. */
export default async function ScaffoldPage() {
  const t = await getTranslations("scaffold");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 md:px-6 lg:px-8">
      <p className="font-display text-sm font-medium text-primary-text">{BRAND}</p>
      <h1 className="font-display text-3xl font-bold">{t("heading")}</h1>
      <p className="text-text-2">{t("body")}</p>

      <section className="grid gap-3 rounded-lg border bg-surface-1 p-6">
        <p className="font-display text-xl font-bold">{t("displayFont")}</p>
        <p className="text-text-2">{t("bodyFont")}</p>
      </section>

      <ApiHealth />
    </main>
  );
}
