export type ClientTier = "bronze" | "silver" | "gold" | "platinum";

export interface TierConfig {
  key: ClientTier;
  thresholdOrders: number;
  platformFee: number;
  emoji: string;
  color: string;
  i18nKey: string;
}

export const CLIENT_TIERS: Record<ClientTier, TierConfig> = {
  bronze: {
    key: "bronze",
    thresholdOrders: 0,
    platformFee: 5.0,
    emoji: "",
    color: "#CD7F32",
    i18nKey: "profile.bronzeClient",
  },
  silver: {
    key: "silver",
    thresholdOrders: 15,
    platformFee: 3.5,
    emoji: "\u{1F948}",
    color: "#C0C0C0",
    i18nKey: "profile.silverClient",
  },
  gold: {
    key: "gold",
    thresholdOrders: 40,
    platformFee: 2.0,
    emoji: "\u2B50",
    color: "#D4AF37",
    i18nKey: "profile.goldClient",
  },
  platinum: {
    key: "platinum",
    thresholdOrders: 80,
    platformFee: 0.0,
    emoji: "\u{1F48E}",
    color: "#E5E4E2",
    i18nKey: "profile.platinumClient",
  },
} as const;

const TIERS_ASCENDING: ClientTier[] = ["bronze", "silver", "gold", "platinum"];

export function getNextTier(currentTier: ClientTier): ClientTier | null {
  const idx = TIERS_ASCENDING.indexOf(currentTier);
  return idx >= 0 && idx < TIERS_ASCENDING.length - 1
    ? TIERS_ASCENDING[idx + 1]
    : null;
}

export function getOrdersToNextTier(
  currentTier: ClientTier,
  completedOrders: number
): number | null {
  const next = getNextTier(currentTier);
  if (!next) return null;
  return Math.max(0, CLIENT_TIERS[next].thresholdOrders - completedOrders);
}

/** Foreground for tier badge on light backgrounds (metallic hexes are too low-contrast on white). */
export function getTierBadgeForeground(tier: ClientTier, isDark: boolean): string {
  if (isDark) return CLIENT_TIERS[tier].color;
  switch (tier) {
    case "platinum":
      return "#4338CA";
    case "silver":
      return "#475569";
    case "gold":
      return "#92400E";
    case "bronze":
    default:
      return "#92400E";
  }
}
