import { getTranslations } from "next-intl/server";
import { InvestView } from "@/components/invest/invest-view";
import { ComingSoon } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("pamm");

export default async function Page() {
  if (!isEnabled("investPamm")) return <ComingSoon title={(await getTranslations("nav"))("pamm")} />;
  return <InvestView kind="pamm" />;
}
