import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { Footer } from "@/components/shell/footer";
import { NAV_COOKIE, THEME_COOKIE } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/bff/server";
import { FormatProvider } from "@/lib/format-context";
import { visibleNav } from "@/lib/nav";
import { UserProvider } from "@/lib/user-context";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentUser();
  const path = (await headers()).get("x-pathname") ?? "/";
  if (current === "expired") redirect(`/api/auth/session-expired?next=${encodeURIComponent(path)}` as never);
  if (!current) redirect(`/login?next=${encodeURIComponent(path)}`);

  const jar = await cookies();
  const expanded = decodeURIComponent(jar.get(NAV_COOKIE)?.value ?? "")
    .split(",")
    .filter(Boolean);
  const theme = jar.get(THEME_COOKIE)?.value === "light" ? "light" : "dark";

  return (
    <UserProvider user={current.user}>
      <FormatProvider timeZone={current.user.timeZone}>
        <AppShell groups={visibleNav()} initialExpanded={expanded} theme={theme} footer={<Footer />}>
          {children}
        </AppShell>
      </FormatProvider>
    </UserProvider>
  );
}
