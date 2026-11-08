import { getTranslations } from "next-intl/server";
import { SignalsView } from "@/components/insights/signals-view";
import { ComingSoon } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("signals");

export default async function Page() {
  if (!isEnabled("insightsSignals")) return <ComingSoon title={(await getTranslations("nav"))("signals")} />;
  return <SignalsView />;
}
