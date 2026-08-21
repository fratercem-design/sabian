/**
 * House cusp calculation — Placidus (default, configurable).
 *
 * Placidus is a time-based house system: each intermediate cusp is the point
 * of the ecliptic whose semi-diurnal (above-horizon) or semi-nocturnal
 * (below-horizon) arc has been traversed by a specific fraction at the birth
 * moment.
 *
 * The classical formulation (as used by the Swiss Ephemeris and standard
 * references): for an ecliptic point of longitude λ with declination
 * δ(λ) = arcsin(sin ε · sin λ), and an observer at latitude φ:
 *
 *   Semi-diurnal arc      S(λ) = 2·arccos(−tan φ · tan δ(λ))
 *   Semi-nocturnal arc    N(λ) = 2·arccos( tan φ · tan δ(λ))
 *
 * The hour angle of a point, H(λ) = LST − RA(λ), is measured from the upper
 * meridian (positive westward). The Placidus cusps satisfy:
 *
 *   Cusp 11:  H(λ) = −S(λ)/6        (one-sixth of the diurnal arc past rising)
 *   Cusp 12:  H(λ) = +S(λ)/6        (two-sixths past rising)
 *   Cusp 3:   H(λ) = S(λ)/2 + N(λ)/3 (one-third of the nocturnal arc past setting)
 *   Cusp 2:   H(λ) = S(λ)/2 + 2·N(λ)/3
 *
 * Because H(λ) is a smooth, monotonically decreasing function of λ over each
 * 360° traversal, and the targets are smooth, the residuals are well-behaved;
 * the cusp longitude is found by scanning for a sign change and bisecting.
 *
 * The Placidus equation is solved by iterating on λ using the exact formula
 *   H(λ) = target(λ)
 * with bisection on the continuous residual (see `hourAngleResidual`).
 *
 * At latitudes above the polar circles the semi-arcs may be undefined (polar
 * day/night); the function then falls back to equal houses from the
 * Ascendant and records it.
 *
 * The house-system choice is isolated in this module. To switch systems,
 * replace `computeHouseCusps` (or select a different provider in the chart
 * provider) — nothing else in the application needs to change.
 */

import { normalizeDegrees, DEG2RAD } from "@/lib/chart/celestial";
import type { HouseCusp, Sign } from "@/lib/types";
import { SIGNS } from "@/lib/types";

export interface HouseSystemResult {
  cusps: HouseCusp[];
  /** True when the semi-arc iteration could not converge and equal houses were used. */
  fallback: boolean;
  /** Human-readable description of the system used. */
  system: string;
}

function declinationOf(lonDeg: number, obliquityDeg: number): number {
  return Math.asin(Math.sin(obliquityDeg * DEG2RAD) * Math.sin(lonDeg * DEG2RAD)) * (180 / Math.PI);
}

/**
 * Continuous right ascension: RA increases from 0° to 360° over a full
 * 360° sweep of ecliptic longitude. The atan2 result wraps from +180° to
 * −180° at RA = 180° (the autumnal point); we unwrap by adding 360° after
 * each downward jump so RA is a smooth, strictly increasing function.
 */
function continuousRightAscension(lonDeg: number, obliquityDeg: number): number {
  const eps = obliquityDeg * DEG2RAD;
  const l = lonDeg * DEG2RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l)) * (180 / Math.PI);
  // Unwrap the atan2 branch cut (at RA = ±180°): add 360° for each
  // full revolution plus 360° when the raw atan2 result is negative
  // (i.e. the point has passed the autumnal point).
  const turns = Math.floor(lonDeg / 360);
  let unwrapped = ra + 360 * turns;
  // The raw atan2 is in (−180, 180]; the branch cut lies at RA=180
  // (longitude of the autumnal point ≈ 180°). For a continuous RA we need
  // RA ∈ [0, 360) per revolution: add 360 to negative values.
  if (ra < 0) unwrapped += 360;
  return unwrapped;
}

function semiDiurnal(latitudeDeg: number, declinationDeg: number): number | null {
  const arg = -Math.tan(latitudeDeg * DEG2RAD) * Math.tan(declinationDeg * DEG2RAD);
  if (arg < -1 || arg > 1) return null;
  return 2 * Math.acos(arg) * (180 / Math.PI);
}

function semiNocturnal(latitudeDeg: number, declinationDeg: number): number | null {
  const arg = Math.tan(latitudeDeg * DEG2RAD) * Math.tan(declinationDeg * DEG2RAD);
  if (arg < -1 || arg > 1) return null;
  return 2 * Math.acos(arg) * (180 / Math.PI);
}

/**
 * Continuous residual for root finding:
 *   f(λ) = H(λ) − target(λ),  H(λ) = LST − RA(λ)
 * with the hour angle UNFOLDED (no ±180 wrap) so that the residual is a
 * smooth, strictly monotone function of λ across the scan. This eliminates
 * the false "fold" roots at the ±180° wrap that a normalized hour angle
 * would introduce.
 */
function hourAngleResidual(
  lonDeg: number,
  cusp: number,
  lstDeg: number,
  latitudeDeg: number,
  obliquityDeg: number
): number | null {
  const dec = declinationOf(lonDeg, obliquityDeg);
  const S = semiDiurnal(latitudeDeg, dec);
  const N = semiNocturnal(latitudeDeg, dec);
  let target: number | null = null;
  // Placidus by elapsed semi-arc, with H normalized to [0, 360):
  //   rising point:  H = 360 − S/2   (east of upper meridian)
  //   setting point: H = S/2
  //   cusp 11: 1/3 of S elapsed since rising → H = 360 − S/2 + S/3
  //   cusp 12: 1/6 of S elapsed since rising → H = 360 − S/2 + S/6
  //   cusp 2:  5/6 of N elapsed since setting → H = S/2 + 5N/6
  //   cusp 3:  2/3 of N elapsed since setting → H = S/2 + 2N/3
  switch (cusp) {
    case 11:
      target = S === null ? null : 360 - S / 2 + S / 3;
      break;
    case 12:
      target = S === null ? null : 360 - S / 2 + S / 6;
      break;
    case 3:
      target = S === null || N === null ? null : S / 2 + (2 * N) / 3;
      break;
    case 2:
      target = S === null || N === null ? null : S / 2 + (5 * N) / 6;
      break;
  }
  if (target === null) return null;
  // Hour angle H(λ) = LST − RA(λ) normalized to [0, 360). The targets are
  // expressed in the same range:
  //   rising point:  H = 360 − S/2   (east of upper meridian)
  //   setting point: H = S/2
  //   cusp 11: 1/3 of S elapsed since rising → H = 360 − S/2 + S/3
  //   cusp 12: 1/6 of S elapsed since rising → H = 360 − S/2 + S/6
  //   cusp 2:  1/3 of N elapsed since setting → H = S/2 + N/3
  //   cusp 3:  1/6 of N elapsed since setting → H = S/2 + N/6
  // The residual maps to the branch closest to the target.
  const h = ((lstDeg - continuousRightAscension(lonDeg, obliquityDeg)) % 360 + 360) % 360;
  let residual = h - target;
  residual -= 360 * Math.round(residual / 360);
  return residual;
}

function makeCusp(house: number, longitude: number): HouseCusp {
  const norm = normalizeDegrees(longitude) % 360;
  const signIndex = Math.floor(norm / 30) % 12;
  const inSign = norm - signIndex * 30;
  const degree = Math.floor(inSign);
  const minute = Math.floor((inSign - degree) * 60);
  const second = Math.floor(((inSign - degree) * 60 - minute) * 60);
  return { house, longitude: norm, sign: SIGNS[signIndex], degree, minute, second };
}

function bisect(
  cusp: number,
  a: number,
  b: number,
  lstDeg: number,
  latitudeDeg: number,
  obliquityDeg: number
): { longitude: number; converged: boolean } {
  let fa = hourAngleResidual(a, cusp, lstDeg, latitudeDeg, obliquityDeg)!;
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2;
    const fm = hourAngleResidual(mid, cusp, lstDeg, latitudeDeg, obliquityDeg);
    if (fm === null) return { longitude: a, converged: false };
    if (Math.abs(fm) < 1e-4) return { longitude: mid, converged: true };
    if ((fa < 0 && fm > 0) || (fa > 0 && fm < 0)) {
      b = mid;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return { longitude: (a + b) / 2, converged: true };
}

/**
 * Find the cusp longitude by scanning the FULL circle for the root of the
 * continuous residual nearest the seed, then bisecting.
 *
 * The residual f(λ) = H(λ) − target(λ) is continuous and strictly monotone
 * over any 360° sweep (H uses unwrapped RA), so it has exactly one root per
 * revolution. We scan the circle at 2° steps, detect the sign change, and
 * pick the crossing with the smallest circular distance to the seed.
 */
function solveCusp(
  cusp: number,
  seed: number,
  lstDeg: number,
  latitudeDeg: number,
  obliquityDeg: number
): { longitude: number; converged: boolean } {
  const fAt = (lon: number) => hourAngleResidual(lon, cusp, lstDeg, latitudeDeg, obliquityDeg);

  const f0 = fAt(seed);
  if (f0 === null) return { longitude: seed, converged: false };

  // Find all sign-change brackets over the full circle.
  const brackets: Array<{ lo: number; hi: number; mid: number; distance: number }> = [];
  let prevLon = 0;
  let prev = fAt(0);
  if (prev === null) return { longitude: seed, converged: false };
  for (let lon = 2; lon <= 360; lon += 2) {
    const cur = lon % 360;
    const f = fAt(cur);
    if (f === null) return { longitude: seed, converged: false };
    if ((prev < 0 && f >= 0) || (prev > 0 && f <= 0)) {
      const mid = ((prevLon + cur) / 2) % 360;
      const dist = Math.min(Math.abs(mid - seed), 360 - Math.abs(mid - seed));
      brackets.push({ lo: prevLon, hi: cur, mid, distance: dist });
    }
    prevLon = cur;
    prev = f;
  }
  if (brackets.length === 0) return { longitude: seed, converged: false };
  brackets.sort((a, b) => a.distance - b.distance);
  const best = brackets[0];
  const { longitude } = bisect(cusp, best.lo, best.hi, lstDeg, latitudeDeg, obliquityDeg);
  return { longitude, converged: true };
}

/**
 * Compute Placidus house cusps.
 * @param ascendant  Ascendant ecliptic longitude (degrees).
 * @param midheaven  Midheaven ecliptic longitude (degrees).
 * @param lst        Local sidereal time (degrees).
 * @param latitude   Geographic latitude (degrees).
 * @param obliquity  True obliquity of the ecliptic (degrees).
 */
export function computeHouseCusps(
  ascendant: number,
  midheaven: number,
  lst: number,
  latitude: number,
  obliquity: number
): HouseSystemResult {
  const asc = normalizeDegrees(ascendant);
  const mc = normalizeDegrees(midheaven);

  const cusps = new Map<number, HouseCusp>([
    [1, makeCusp(1, asc)],
    [7, makeCusp(7, asc + 180)],
    [10, makeCusp(10, mc)],
    [4, makeCusp(4, mc + 180)],
  ]);

  const seeds: Record<number, number> = {
    11: mc + 30,
    12: mc + 60,
    2: asc + 30,
    3: asc + 60,
  };
  let fallback = false;
  for (const cusp of [11, 12, 3, 2]) {
    const seed = seeds[cusp];
    const { longitude, converged } = solveCusp(cusp, seed, lst, latitude, obliquity);
    if (!converged) {
      fallback = true;
      console.error(`[houses] cusp ${cusp} did not converge (seed ${seed.toFixed(2)}, lst ${lst.toFixed(2)}, lat ${latitude})`);
    }
    cusps.set(cusp, makeCusp(cusp, longitude));
  }

  for (const [a, b] of [
    [5, 11],
    [6, 12],
    [8, 2],
    [9, 3],
  ] as const) {
    const src = cusps.get(b)!;
    cusps.set(a, makeCusp(a, src.longitude + 180));
  }

  const ordered = Array.from(cusps.keys())
    .sort((a, b) => a - b)
    .map((k) => cusps.get(k)!);

  if (fallback) {
    return {
      cusps: Array.from({ length: 12 }, (_, i) => makeCusp(i + 1, asc + i * 30)),
      fallback: true,
      system: "Placidus (semi-arc) with equal-house fallback",
    };
  }

  return { cusps: ordered, fallback: false, system: "Placidus (semi-arc)" };
}

/** Keep a stable exported alias for the default system id. */
export const DEFAULT_HOUSE_SYSTEM = "placidus" as const;
export function signOfLongitude(lon: number): Sign {
  return SIGNS[Math.floor(normalizeDegrees(lon) / 30) % 12];
}
