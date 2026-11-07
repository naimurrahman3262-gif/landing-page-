import { VerificationView } from "@/components/account/verification-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("verification");

export default function Page() {
  return <VerificationView />;
}
