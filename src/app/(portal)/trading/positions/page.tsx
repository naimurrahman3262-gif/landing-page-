import { PositionsView } from "@/components/trading/positions-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("positions");

export default function PositionsPage() {
  return <PositionsView />;
}
