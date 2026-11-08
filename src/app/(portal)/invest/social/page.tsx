import { getTranslations } from "next-intl/server";
import { InvestView } from "@/components/invest/invest-view";
import { ComingSoon } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("social");

export default async function Page() {
  if (!isEnabled("investSocial")) return <ComingSoon title={(await getTranslations("nav"))("social")} />;
  return <InvestView kind="social" />;
}
