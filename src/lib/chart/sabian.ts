/**
 * Sabian degree convention — the single documented function that maps an
 * ecliptic longitude to a Sabian degree (1–30) and a global zodiac index
 * (1–360).
 *
 * Convention (default): "degree-to-next". A position within a degree
 * corresponds to the NEXT numbered Sabian degree:
 *
 *   14°32′ Aries → Aries 15        (position is inside the 14th degree, so the
 *                                   Sabian image "Aries 15" applies)
 *
 * Boundary behavior (documented and configurable):
 *   - A position at EXACTLY 0°00′00″ of a sign maps to that sign's degree 1
 *     (the leading edge of the first degree — the "leading edge" convention).
 *   - 0°00′01″ maps to degree 1 as well (inside the first degree).
 *   - 29°59′59″ maps to degree 30.
 *   - Global index wraps: exactly 0° Aries is global 360 (which equals Aries 1
 *     via the 360 ≡ 1 boundary). 0°01′ Aries is global 1.
 *
 * The alternative "trailing-edge" convention (exact boundary maps to the
 * previous degree, 0°00′00″ → degree 30 of the previous sign) is available via
 * the `boundary` option for comparison and tests.
 */

import type { Sign } from "@/lib/types";
import { SIGNS } from "@/lib/types";
import { normalizeDegrees } from "@/lib/chart/celestial";

export type BoundaryConvention = "leading" | "trailing";

export interface SabianMapping {
  /** Sabian degree within the sign: 1–30. */
  degree: number;
  /** Sign the degree belongs to. */
  sign: Sign;
  /** Global zodiac index 1–360. 360 ≡ exactly 0° Aries. */
  globalIndex: number;
  /** Sign number 1–12 (1 = Aries … 12 = Pisces). */
  signNumber: number;
  /** Raw normalized longitude this mapping was derived from. */
  longitude: number;
  /** Exact DMS display of the input longitude. */
  positionText: string;
}

export function sabianMappingForLongitude(
  longitudeDeg: number,
  boundary: BoundaryConvention = "leading"
): SabianMapping {
  const norm = normalizeDegrees(longitudeDeg);
  const signIndex = Math.floor(norm / 30) % 12;
  const inSign = norm - signIndex * 30;

  let degree: number;
  if (boundary === "leading") {
    // Leading edge: [0, 30) within a sign maps 1..30. Exactly 0 → degree 1.
    degree = Math.floor(inSign) + 1;
  } else {
    // Trailing edge: (0, 30] within a sign maps 1..30. Exactly 0 → degree 30 of the
    // previous sign, handled by the wrap below.
    degree = Math.floor(inSign - 1e-9) + 1;
  }
  if (degree < 1 && boundary === "trailing") {
    // Wrapped 0° → previous sign's degree 30: global index 360.
    const prevSignIndex = (signIndex + 11) % 12;
    return {
      degree: 30,
      sign: SIGNS[prevSignIndex],
      globalIndex: 360,
      signNumber: prevSignIndex + 1,
      longitude: norm,
      positionText: formatPositionForMapping(norm),
    };
  }

  const clampDegree = Math.min(30, Math.max(1, degree));
  const globalIndex = signIndex * 30 + clampDegree;
  return {
    degree: clampDegree,
    sign: SIGNS[signIndex],
    globalIndex,
    signNumber: signIndex + 1,
    longitude: norm,
    positionText: formatPositionForMapping(norm),
  };
}

function formatPositionForMapping(norm: number): string {
  const signIndex = Math.floor(norm / 30) % 12;
  const inSign = norm - signIndex * 30;
  const degree = Math.floor(inSign);
  const minute = Math.floor((inSign - degree) * 60);
  const second = Math.floor((((inSign - degree) * 60) - minute) * 60);
  return `${degree}°${String(minute).padStart(2, "0")}′${String(second).padStart(2, "0")}″ ${SIGNS[signIndex]}`;
}
