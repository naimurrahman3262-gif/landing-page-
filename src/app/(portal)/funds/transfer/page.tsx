import { TransferView } from "@/components/funds/transfer-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("transfer");

export default function TransferPage() {
  return <TransferView />;
}
