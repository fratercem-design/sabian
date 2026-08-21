/**
 * House cusp calculation — Placidus (default, configurable).
 *
 * Implementation follows the Swiss Ephemeris / LibEphemeris Placidus
 * algorithm (see "House System Algorithms and Mathematical Formulas",
 * LibEphemeris docs; equivalently the classical Placidus definition):
 *
 *   SA = 90° + AD                      (diurnal semi-arc)
 *   AD = arcsin(tan φ · tan δ)         (ascensional difference)
 *   tan δ = sin(RA) · tan ε            (declination from right ascension)
 *
 *   cusp 11: RA = ARMC + SA/3
 *   cusp 12: RA = ARMC + 2·SA/3
 *   cusp 2:  RA = ARMC + 180° − 2·(90°−AD)/3
 *   cusp 3:  RA = ARMC + 180° − (90°−AD)/3
 *
 * Each cusp is found by fixed-point iteration: starting from a seed right
 * ascension, compute the declination of the ecliptic point at that RA, the
 * ascensional difference and semi-arc, then the next RA from the formula;
 * repeat until the change is below the tolerance.
 *
 * Cusps 1, 4, 7, 10 are the Ascendant, IC, Descendant, and MC directly;
 * cusps 5, 6, 8, 9 are the opposites of 11, 12, 2, 3.
 *
 * At latitudes above the polar circles the semi-arcs are undefined (AD
 * undefined); the function then falls back to equal houses from the
 * Ascendant and records it.
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

/** Ecliptic longitude whose right ascension equals `ra` (degrees, [0, 360)). */
function longitudeFromRightAscension(raDeg: number, obliquityDeg: number): number {
  const eps = obliquityDeg * DEG2RAD;
  const a = raDeg * DEG2RAD;
  const lon = Math.atan2(Math.sin(a), Math.cos(a) * Math.cos(eps)) * (180 / Math.PI);
  return normalizeDegrees(lon);
}

/** Ascensional difference for a point of the ecliptic at longitude `lon`. */
function ascensionalDifference(lonDeg: number, latitudeDeg: number, obliquityDeg: number): number | null {
  const l = lonDeg * DEG2RAD;
  const e = obliquityDeg * DEG2RAD;
  const p = latitudeDeg * DEG2RAD;
  const dec = Math.asin(Math.sin(e) * Math.sin(l));
  const arg = Math.tan(p) * Math.tan(dec);
  if (arg < -1 || arg > 1) return null;
  return Math.asin(arg) * (180 / Math.PI);
}

/**
 * Fixed-point iteration for a Placidus cusp, per the LibEphemeris/Swiss
 * Ephemeris algorithm:
 *   RA ← ARMC + offset(δ(RA))   with δ from the ecliptic point at RA.
 */
function iterateCusp(
  cusp: number,
  seedRa: number,
  ramc: number,
  latitudeDeg: number,
  obliquityDeg: number
): { ra: number; converged: boolean } {
  let ra = seedRa;
  for (let i = 0; i < 80; i++) {
    const lon = longitudeFromRightAscension(ra, obliquityDeg);
    const ad = ascensionalDifference(lon, latitudeDeg, obliquityDeg);
    if (ad === null) return { ra, converged: false };
    let offset: number;
    switch (cusp) {
      case 11:
        offset = (90 + ad) / 3;
        break;
      case 12:
        offset = (2 * (90 + ad)) / 3;
        break;
      case 2:
        offset = 180 - (2 * (90 - ad)) / 3;
        break;
      case 3:
        offset = 180 - (90 - ad) / 3;
        break;
      default:
        return { ra, converged: false };
    }
    const next = ramc + offset;
    let delta = next - ra;
    delta -= 360 * Math.round(delta / 360);
    if (Math.abs(delta) < 1e-5) return { ra: ((next % 360) + 360) % 360, converged: true };
    ra = next;
  }
  return { ra, converged: false };
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

/**
 * Compute Placidus house cusps.
 * @param ascendant  Ascendant ecliptic longitude (degrees).
 * @param midheaven  Midheaven ecliptic longitude (degrees).
 * @param ramc       Right ascension of the Midheaven (degrees) — the local
 *                   sidereal time of the place, since RA(MC) = LST.
 * @param latitude   Geographic latitude (degrees).
 * @param obliquity  True obliquity of the ecliptic (degrees).
 */
export function computeHouseCusps(
  ascendant: number,
  midheaven: number,
  ramc: number,
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

  // Seeds in RA space: cusp 11 ≈ ARMC + 30°, cusp 12 ≈ ARMC + 60°,
  // cusp 2 ≈ ARMC + 120°, cusp 3 ≈ ARMC + 150°.
  const seedsRa: Record<number, number> = {
    11: ramc + 30,
    12: ramc + 60,
    2: ramc + 120,
    3: ramc + 150,
  };
  let fallback = false;
  for (const cusp of [11, 12, 2, 3]) {
    const { ra, converged } = iterateCusp(cusp, seedsRa[cusp], ramc, latitude, obliquity);
    if (!converged) {
      fallback = true;
      console.error(`[houses] cusp ${cusp} did not converge (ramc ${ramc.toFixed(2)}, lat ${latitude})`);
    }
    const lon = longitudeFromRightAscension(ra, obliquity);
    cusps.set(cusp, makeCusp(cusp, lon));
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
