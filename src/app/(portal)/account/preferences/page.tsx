import { PreferencesView } from "@/components/account/preferences-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("preferences");

export default function Page() {
  return <PreferencesView />;
}
