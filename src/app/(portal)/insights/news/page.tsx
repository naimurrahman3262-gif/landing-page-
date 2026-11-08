import { getTranslations } from "next-intl/server";
import { NewsView } from "@/components/insights/news-view";
import { ComingSoon } from "@/components/shell/coming-soon";
import { isEnabled } from "@/config/features";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("news");

export default async function Page() {
  if (!isEnabled("insightsNews")) return <ComingSoon title={(await getTranslations("nav"))("news")} />;
  return <NewsView />;
}
