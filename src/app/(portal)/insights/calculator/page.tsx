import { getTranslations } from "next-intl/server";
import { CalculatorView } from "@/components/insights/calculator-view";
import { ComingSoon } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("calculator");

export default async function Page() {
  if (!isEnabled("insightsCalculator"))
    return <ComingSoon title={(await getTranslations("nav"))("calculator")} />;
  return <CalculatorView />;
}
