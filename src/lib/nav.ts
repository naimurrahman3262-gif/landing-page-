import { NAV, type NavGroup, type NavItem } from "@/config/nav";
import { FEATURES } from "@/config/features";

/** Nav with disabled modules removed (and groups left empty removed). */
export function visibleNav(features: Record<string, boolean> = FEATURES): NavGroup[] {
  return NAV.filter((g) => !g.feature || features[g.feature])
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.feature || features[i.feature]) }))
    .filter((g) => g.items.length > 0);
}

/**
 * G3: the active item is derived from the URL. Longest matching href wins, so
 * /trading/accounts/new → "Open account" and /trading/accounts/137481 → "Accounts".
 * "/" only matches exactly.
 */
export function resolveActive(
  pathname: string,
  groups: NavGroup[] = NAV,
): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const match =
        item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (match && (!best || item.href.length > best.item.href.length)) best = { group, item };
    }
  }
  return best;
}
