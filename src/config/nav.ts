import type { FeatureKey } from "./features";

/**
 * The 8 navigation groups (brief §4). Labels are next-intl message keys
 * under `nav.*`. Icons are lucide-react component names, resolved by SideNav.
 */
export interface NavItem {
  key: string;
  href: string;
  feature?: FeatureKey;
}

export interface NavGroup {
  key: string;
  icon: string;
  items: NavItem[];
  feature?: FeatureKey;
}

export const NAV: NavGroup[] = [
  { key: "home", icon: "House", items: [{ key: "overview", href: "/" }] },
  {
    key: "funds",
    icon: "Wallet",
    feature: "funds",
    items: [
      { key: "deposit", href: "/funds/deposit" },
      { key: "withdraw", href: "/funds/withdraw" },
      { key: "transfer", href: "/funds/transfer" },
      { key: "transactions", href: "/funds/transactions" },
    ],
  },
  {
    key: "trading",
    icon: "ChartCandlestick",
    feature: "trading",
    items: [
      { key: "accounts", href: "/trading/accounts" },
      { key: "positions", href: "/trading/positions" },
      { key: "platforms", href: "/trading/platforms" },
      { key: "openAccount", href: "/trading/accounts/new" },
    ],
  },
  {
    key: "insights",
    icon: "Newspaper",
    items: [
      { key: "news", href: "/insights/news", feature: "insightsNews" },
      { key: "signals", href: "/insights/signals", feature: "insightsSignals" },
      { key: "analysis", href: "/insights/analysis", feature: "insightsAnalysis" },
      { key: "calculator", href: "/insights/calculator", feature: "insightsCalculator" },
    ],
  },
  {
    key: "invest",
    icon: "Users",
    items: [
      { key: "social", href: "/invest/social", feature: "investSocial" },
      { key: "pamm", href: "/invest/pamm", feature: "investPamm" },
    ],
  },
  {
    key: "rewards",
    icon: "Gift",
    items: [
      { key: "referrals", href: "/rewards/referrals", feature: "rewardsReferrals" },
      { key: "tradingRewards", href: "/rewards/trading", feature: "rewardsTrading" },
    ],
  },
  {
    key: "help",
    icon: "LifeBuoy",
    feature: "help",
    items: [
      { key: "helpCentre", href: "/help" },
      { key: "tickets", href: "/help/tickets" },
    ],
  },
  {
    key: "account",
    icon: "UserRound",
    feature: "account",
    items: [
      { key: "profile", href: "/account/profile" },
      { key: "verification", href: "/account/verification" },
      { key: "security", href: "/account/security" },
      { key: "paymentMethods", href: "/account/payment-methods" },
      { key: "preferences", href: "/account/preferences" },
    ],
  },
];
