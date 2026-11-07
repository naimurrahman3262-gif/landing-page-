import { TicketsView } from "@/components/help/tickets-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("tickets");

export default function Page() {
  return <TicketsView />;
}
