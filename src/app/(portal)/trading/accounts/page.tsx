import { cookies } from "next/headers";
import { AccountsView, VIEW_COOKIE } from "@/components/trading/accounts-view";
import { navMetadata } from "@/lib/page";

export const generateMetadata = () => navMetadata("accounts");

export default async function AccountsPage() {
  // Grid/table choice is remembered in a cookie, so the server renders the right view.
  const view = (await cookies()).get(VIEW_COOKIE)?.value === "table" ? "table" : "grid";
  return <AccountsView initialView={view} />;
}
