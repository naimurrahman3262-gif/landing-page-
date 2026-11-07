import { DepositFlow } from "@/components/funds/deposit-flow";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("deposit");

export default function DepositPage() {
  return <DepositFlow />;
}
