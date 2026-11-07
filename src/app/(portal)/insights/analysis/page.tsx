import { getTranslations } from "next-intl/server";
import { ComingSoon, RouteStub } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("analysis");

/** Stub: the screen for this route is built in a later phase. */
export default async function Page() {
  const t = await getTranslations("nav");
  if (!isEnabled("insightsAnalysis")) return <ComingSoon title={t("analysis")} />;
  return <RouteStub title={t("analysis")} />;
}
