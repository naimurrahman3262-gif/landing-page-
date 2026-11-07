import { HomeView } from "@/components/home/home-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("home");

export default function HomePage() {
  return <HomeView />;
}
