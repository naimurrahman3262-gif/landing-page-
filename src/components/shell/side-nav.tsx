"use client";

import {
  ChartCandlestick,
  ChevronDown,
  ExternalLink,
  Gift,
  House,
  LifeBuoy,
  Newspaper,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/common/badge";
import { BRAND } from "@/config/brand";
import { NEW_BADGE } from "@/config/features";
import { LINKS } from "@/config/links";
import type { NavGroup } from "@/config/nav";
import { NAV_COOKIE } from "@/lib/auth/constants";
import { resolveActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  House,
  Wallet,
  ChartCandlestick,
  Newspaper,
  Users,
  Gift,
  LifeBuoy,
  UserRound,
};

function saveExpanded(keys: string[]) {
  document.cookie = `${NAV_COOKIE}=${encodeURIComponent(keys.join(","))}; path=/; max-age=31536000; samesite=lax`;
}

function showNewBadge(feature?: string): boolean {
  return !!NEW_BADGE && NEW_BADGE.feature === feature && Date.parse(NEW_BADGE.expiresAt) > Date.now();
}

export interface SideNavProps {
  groups: NavGroup[];
  /** Expanded groups remembered from the nav cookie (read on the server, so no flash). */
  initialExpanded: string[];
  onNavigate?: () => void;
}

/** The 8-group navigation. Used in the desktop sidebar and the mobile drawer. */
export function SideNav({ groups, initialExpanded, onNavigate }: SideNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const active = resolveActive(pathname, groups);
  const [expanded, setExpanded] = useState<string[]>(initialExpanded);

  function toggle(key: string) {
    const next = expanded.includes(key) ? expanded.filter((k) => k !== key) : [...expanded, key];
    setExpanded(next);
    saveExpanded(next);
  }

  return (
    <nav aria-label={t("primary")} className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="rounded-sm font-display text-lg font-bold tracking-tight text-text-1 focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          {BRAND}
        </Link>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const Icon = ICONS[group.icon] ?? House;
          const isActiveGroup = active?.group.key === group.key;

          // Single-item groups (Home) render as a direct link.
          if (group.items.length === 1 && group.items[0]!.href === "/") {
            const item = group.items[0]!;
            const current = active?.item.href === item.href;
            return (
              <li key={group.key}>
                <Link
                  href="/"
                  onClick={onNavigate}
                  aria-current={current ? "page" : undefined}
                  className={navRow(current)}
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  {t(group.key)}
                </Link>
              </li>
            );
          }

          // The group holding the active page is always open.
          const open = isActiveGroup || expanded.includes(group.key);
          const listId = `nav-${group.key}`;
          return (
            <li key={group.key}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                disabled={isActiveGroup}
                onClick={() => toggle(group.key)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-md px-3 font-display text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-focus-ring disabled:cursor-default",
                  isActiveGroup ? "text-text-1" : "text-text-2 hover:bg-surface-2 hover:text-text-1",
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className="flex-1 text-left">{t(group.key)}</span>
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 text-text-3 transition-transform", open && "rotate-180")}
                />
              </button>
              <ul id={listId} hidden={!open} className="mt-1 mb-2 space-y-0.5">
                {group.items.map((item) => {
                  const current = active?.item.href === item.href;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href as never}
                        onClick={onNavigate}
                        aria-current={current ? "page" : undefined}
                        className={cn(navRow(current), "pl-11")}
                      >
                        <span className="flex-1">{t(item.key)}</span>
                        {showNewBadge(item.feature) && <Badge variant="brand">{t("new")}</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      {LINKS.partnerPortal && (
        <div className="border-t border-border p-3">
          <a
            href={LINKS.partnerPortal}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-3 rounded-md px-3 text-sm text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            <ExternalLink aria-hidden className="size-4" />
            {t("partnerPortal")}
          </a>
        </div>
      )}
    </nav>
  );
}

/** Active = soft cyan background + cyan indicator bar + text weight (not colour alone). */
function navRow(current: boolean) {
  return cn(
    "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
    "focus-visible:outline-2 focus-visible:outline-focus-ring",
    current
      ? "bg-primary-soft font-medium text-text-1 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary-text"
      : "text-text-2 hover:bg-surface-2 hover:text-text-1",
  );
}
