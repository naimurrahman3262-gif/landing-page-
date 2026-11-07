import { SecurityView } from "@/components/account/security-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("security");

export default function Page() {
  return <SecurityView />;
}
