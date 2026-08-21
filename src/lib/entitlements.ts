/**
 * Entitlement layer — prepared for future monetization.
 *
 * In testing mode every feature is unlocked regardless of tier. When
 * MONETIZATION_ENABLED becomes true, tier checks would be enforced here —
 * no prices, checkout, or payment logic exists in this phase.
 */

import { isMonetizationEnabled, isTestingMode } from "@/lib/config";
import type { EntitlementTier } from "@/lib/types";

export const TIER_ORDER: EntitlementTier[] = ["free", "complete", "art-edition", "account"];

export interface Entitlement {
  tier: EntitlementTier;
  features: {
    corePlacements: boolean;
    fullPlanetaryChorus: boolean;
    completeStory: boolean;
    highResolutionArtwork: boolean;
    downloadableReport: boolean;
    savedReadings: boolean;
    comparisonHistory: boolean;
  };
}

const FREE_FEATURES = {
  corePlacements: true,
  fullPlanetaryChorus: false,
  completeStory: false,
  highResolutionArtwork: false,
  downloadableReport: false,
  savedReadings: false,
  comparisonHistory: false,
};

const TIER_FEATURES: Record<EntitlementTier, Entitlement["features"]> = {
  free: FREE_FEATURES,
  complete: { ...FREE_FEATURES, fullPlanetaryChorus: true, completeStory: true },
  "art-edition": {
    ...FREE_FEATURES,
    fullPlanetaryChorus: true,
    completeStory: true,
    highResolutionArtwork: true,
    downloadableReport: true,
  },
  account: {
    ...FREE_FEATURES,
    fullPlanetaryChorus: true,
    completeStory: true,
    savedReadings: true,
    comparisonHistory: true,
  },
};

/**
 * Current entitlement. While monetization is disabled, the account tier's
 * features are granted (fully unlocked) so the product is usable end-to-end.
 */
export function getEntitlement(): Entitlement {
  if (!isMonetizationEnabled || isTestingMode) {
    return { tier: "account", features: TIER_FEATURES.account };
  }
  // Default tier when monetization is enabled but no payment provider is wired.
  return { tier: "free", features: TIER_FEATURES.free };
}
