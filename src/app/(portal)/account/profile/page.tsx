import { ProfileView } from "@/components/account/profile-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("profile");

export default function Page() {
  return <ProfileView />;
}
