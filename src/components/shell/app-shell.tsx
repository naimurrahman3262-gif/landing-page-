"use client";

import { ChatLauncher } from "@/components/help/chat-launcher";
import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { BRAND } from "@/config/brand";
import type { NavGroup } from "@/config/nav";
import { resolveActive } from "@/lib/nav";
import { CommandSearch } from "./command-search";
import { NotificationBell } from "./notification-bell";
import { ProfileMenu } from "./profile-menu";
import { SideNav } from "./side-nav";
import { ThemeToggle, type Theme } from "./theme-toggle";

export interface AppShellProps {
  groups: NavGroup[];
  initialExpanded: string[];
  theme: Theme;
  footer: ReactNode;
  children: ReactNode;
}

/** Sidebar is persistent from `lg`; below that it's a drawer (brief §3). */
export function AppShell({ groups, initialExpanded, theme, footer, children }: AppShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const active = resolveActive(pathname, groups);

  // Close the drawer after navigation.
  useEffect(() => setDrawer(false), [pathname]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-display text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("shell.skipToContent")}
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface-1 lg:block">
        <SideNav groups={groups} initialExpanded={initialExpanded} />
      </aside>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">{t("nav.primary")}</SheetTitle>
          <SheetDescription className="sr-only">{BRAND}</SheetDescription>
          <SideNav groups={groups} initialExpanded={initialExpanded} onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-bg/85 px-2 backdrop-blur md:px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t("nav.openMenu")}
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <Menu aria-hidden className="size-5!" />
          </Button>
          <p className="min-w-0 flex-1 truncate font-display text-base font-bold lg:hidden">
            {active ? t(`nav.${active.item.key}`) : BRAND}
          </p>

          <button
            type="button"
            onClick={() => setSearch(true)}
            className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface-1 px-3 text-sm text-text-3 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-focus-ring lg:flex"
          >
            <Search aria-hidden className="size-4" />
            <span className="flex-1 text-left">{t("shell.searchPlaceholder")}</span>
            <kbd className="rounded-sm border border-border px-1.5 font-sans text-xs">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={t("shell.search")}
              onClick={() => setSearch(true)}
            >
              <Search aria-hidden className="size-5!" />
            </Button>
            <NotificationBell />
            <ThemeToggle key={theme} initial={theme} />
            <ProfileMenu />
          </div>
        </header>

        {/* pb-24 reserves room for the chat launcher so it never covers content (G11). */}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pt-6 pb-24 outline-none md:px-6 lg:px-8 lg:pt-8"
        >
          {children}
        </main>
        <div className="mx-auto w-full max-w-screen-2xl px-4 pb-8 md:px-6 lg:px-8">{footer}</div>
      </div>

      <CommandSearch groups={groups} open={search} onOpenChange={setSearch} />
      <ChatLauncher />
    </div>
  );
}
