import { OpenAccountView } from "@/components/trading/open-account-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("openAccount");

export default function OpenAccountPage() {
  return <OpenAccountView />;
}
