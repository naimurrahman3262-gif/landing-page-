import { notFound } from "next/navigation";
import { AccountDetailsView } from "@/components/trading/account-details-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("details");

type Props = { params: Promise<{ login: string }> };

export default async function AccountDetailsPage({ params }: Props) {
  const { login } = await params;
  if (!/^\d{1,12}$/.test(login)) notFound();
  return <AccountDetailsView login={Number(login)} />;
}
