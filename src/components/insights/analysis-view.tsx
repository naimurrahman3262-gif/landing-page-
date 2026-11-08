"use client";

import { useTranslations } from "next-intl";
import { SsoEmbed } from "@/components/embeds/sso-embed";
import { PageHeader } from "@/components/common/page-header";

/** Analysis (brief §6.6): Autochartist in an EmbedFrame, with an error state if the handoff fails. */
export function AnalysisView() {
  const t = useTranslations("analysis");
  return (
    <div className="grid w-full gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <SsoEmbed provider="autochartist" title={t("embedTitle")} />
    </div>
  );
}
