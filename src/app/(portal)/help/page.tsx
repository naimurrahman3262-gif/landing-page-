import { HelpView } from "@/components/help/help-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("helpCentre");

export default function Page() {
  return <HelpView />;
}
