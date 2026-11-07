import { FundsStatusView } from "@/components/funds/funds-status-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("withdrawStatus");

type Props = { params: Promise<{ id: string }> };

export default async function WithdrawStatusPage({ params }: Props) {
  const { id } = await params;
  return <FundsStatusView id={id} kind="withdrawal" />;
}
