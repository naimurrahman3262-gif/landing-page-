import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/bff/server";
import { FormatProvider } from "@/lib/format-context";
import { UserProvider } from "@/lib/user-context";

/** Print-only pages (receipt, PDF export): no shell, the user's time zone, auth required. */
export default async function PrintLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentUser();
  if (!current || typeof current !== "object") redirect("/login");
  return (
    <UserProvider user={current.user}>
      <FormatProvider timeZone={current.user.timeZone}>
        <main className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:p-0">{children}</main>
      </FormatProvider>
    </UserProvider>
  );
}
