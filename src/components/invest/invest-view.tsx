"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { SsoEmbed } from "@/components/embeds/sso-embed";
import { PageHeader } from "@/components/common/page-header";

/** Social trading / PAMM (brief §6.7): plain-language intro + risk line, then the provider. No profit promises. */
export function InvestView({ kind }: { kind: "social" | "pamm" }) {
  const t = useTranslations("invest");
  const title = t(`${kind}Title`);
  return (
    <div className="grid w-full gap-6">
      <PageHeader title={title} subtitle={t(`${kind}Intro`)} />
      <p
        role="note"
        className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-text"
      >
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t("risk")}
      </p>
      <SsoEmbed provider={kind} title={title} />
    </div>
  );
}
