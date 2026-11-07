import { PlatformsView } from "@/components/trading/platforms-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("platforms");

export default function Page() {
  return <PlatformsView />;
}
