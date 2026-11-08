import { getTranslations } from "next-intl/server";
import { AnalysisView } from "@/components/insights/analysis-view";
import { ComingSoon } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("analysis");

export default async function Page() {
  if (!isEnabled("insightsAnalysis"))
    return <ComingSoon title={(await getTranslations("nav"))("analysis")} />;
  return <AnalysisView />;
}
