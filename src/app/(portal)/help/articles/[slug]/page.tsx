import { getTranslations } from "next-intl/server";
import { RouteStub } from "@/components/shell/coming-soon";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("article");

/** Stub: the screen for this route is built in a later phase. */
export default async function Page() {
  const t = await getTranslations("nav");
  return <RouteStub title={t("article")} backHref="/help" />;
}
