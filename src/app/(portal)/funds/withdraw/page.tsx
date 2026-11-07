import { WithdrawFlow } from "@/components/funds/withdraw-flow";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("withdraw");

export default function WithdrawPage() {
  return <WithdrawFlow />;
}
