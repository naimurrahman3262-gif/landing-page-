import { TransactionsView } from "@/components/funds/transactions-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("transactions");

export default function TransactionsPage() {
  return <TransactionsView />;
}
