import { FundsStatusView } from "@/components/funds/funds-status-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("depositStatus");

type Props = { params: Promise<{ id: string }> };

export default async function DepositStatusPage({ params }: Props) {
  const { id } = await params;
  return <FundsStatusView id={id} kind="deposit" />;
}
