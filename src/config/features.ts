/**
 * Feature flag per module. A disabled module is hidden from the nav and its
 * route renders a "Coming soon" page inside the shell (never a dead end).
 *
 * Launch values are pending open question Q7; everything is enabled in dev
 * so each module can be built and reviewed.
 */
export const FEATURES = {
  home: true,
  funds: true,
  trading: true,
  insightsNews: true,
  insightsSignals: true,
  insightsAnalysis: true,
  insightsCalculator: true,
  investSocial: true,
  investPamm: true,
  rewardsReferrals: true,
  rewardsTrading: false,
  help: true,
  account: true,
} as const satisfies Record<string, boolean>;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}

/** At most one "New" badge at a time, with an expiry. */
export const NEW_BADGE: { feature: FeatureKey; expiresAt: string } | null = null;
