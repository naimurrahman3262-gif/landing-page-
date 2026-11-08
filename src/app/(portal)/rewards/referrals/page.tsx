import { getTranslations } from "next-intl/server";
import { ReferralsView } from "@/components/rewards/referrals-view";
import { ComingSoon } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("referrals");

export default async function Page() {
  if (!isEnabled("rewardsReferrals"))
    return <ComingSoon title={(await getTranslations("nav"))("referrals")} />;
  return <ReferralsView />;
}
