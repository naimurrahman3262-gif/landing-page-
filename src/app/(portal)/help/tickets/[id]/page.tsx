import { notFound } from "next/navigation";
import { TicketDetailView } from "@/components/help/ticket-detail-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("ticket");

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!/^[\w-]{1,40}$/.test(id)) notFound();
  return <TicketDetailView id={id} />;
}
