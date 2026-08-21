/**
 * ChartCalculationProvider — deterministic natal-chart computation.
 *
 * The ephemeris engine (astronomy-engine, MIT) is isolated behind this
 * interface so it can be replaced or commercially licensed without touching
 * the rest of the application. All planetary longitudes are computed with
 * astronomy-engine's VSOP87-based geocentric ephemeris; the Ascendant,
 * Midheaven, and Placidus houses are computed with the classical formulas in
 * `celestial.ts` and `houses.ts`.
 *
 * NORTH NODE: computed as the instantaneous OSCULATING ascending node — the
 * ecliptic longitude of the ascending node of the Moon's osculating orbit at
 * the birth instant, derived from the geocentric position and velocity
 * vectors. This is the instantaneous documented node at the exact moment of
 * birth, never the descending node, and never the longitude at some nearby
 * node-crossing event (the old implementation used the nearest event, which
 * could select the descending node — that is removed).
 *
 * License note: astronomy-engine is MIT-licensed (Don Cross). See
 * `docs/architecture.md` and the third-party notices in the README.
 */

/* Server-only module: never imported from client components.
 * The guard is applied via a server-only dependency at the service layer;
 * this module itself stays importable by unit tests and scripts. */

import {
  Body,
  Ecliptic,
  GeoVector,
  EclipticGeoMoon,
  GeoMoonState,
  MakeTime,
  RotateVector,
  Rotation_EQJ_ECL,
  type AstroTime,
} from "astronomy-engine";

import { normalizeDegrees, trueObliquity, deltaT, localSiderealTimeDegrees, toDMS } from "@/lib/chart/celestial";
import { sabianMappingForLongitude } from "@/lib/chart/sabian";
import { computeHouseCusps } from "@/lib/chart/houses";
import { houseSystem, nodeNames, type NodeName } from "@/lib/config";
import type { ChartData, Placement } from "@/lib/types";

export const EPHEMERIS_LICENSE =
  "astronomy-engine v2 — MIT License (Don Cross). https://github.com/cosinekitty/astronomy";

export interface ChartInput {
  /** Exact UTC instant. */
  utc: Date;
  /** True birth location. */
  latitude: number;
  longitude: number;
  /** Whether the birth time is exact. */
  timeKnown: boolean;
  /** Local calendar date (YYYY-MM-DD) used when time is unknown. */
  localDateOnly?: string;
  /** Disclosure text for the time notation used when unknown. */
  timeNotation?: string;
}

export interface ChartCalculationProvider {
  calculate(input: ChartInput): ChartData;
}

const PLANET_BODIES: { key: string; body: Body }[] = [
  { key: "sun", body: Body.Sun },
  { key: "mercury", body: Body.Mercury },
  { key: "venus", body: Body.Venus },
  { key: "mars", body: Body.Mars },
  { key: "jupiter", body: Body.Jupiter },
  { key: "saturn", body: Body.Saturn },
  { key: "uranus", body: Body.Uranus },
  { key: "neptune", body: Body.Neptune },
  { key: "pluto", body: Body.Pluto },
];

function planetLongitude(body: Body, time: AstroTime): number {
  const geo = Ecliptic(GeoVector(body, time, true));
  return normalizeDegrees(geo.elon);
}

function moonLongitude(time: AstroTime): number {
  const moon = EclipticGeoMoon(time);
  return normalizeDegrees(moon.lon);
}

/**
 * North Node longitude at the birth instant — the instantaneous OSCULATING
 * ascending node.
 *
 * The ascending node of the Moon's osculating orbit is the ecliptic
 * longitude where the Moon crosses the ecliptic from south to north. Using
 * the geocentric state vectors (position r, velocity v):
 *
 *   h = r × v                      (angular momentum, perpendicular to the
 *                                   Moon's orbital plane)
 *   n = k̂ × h                      (node vector; k̂ = ecliptic pole)
 *   λ_node = atan2(n.y, n.x)       in the ecliptic frame
 *
 * The state vectors from astronomy-engine are in the J2000 equatorial frame,
 * so they are rotated into the J2000 ecliptic frame (Rotation_EQJ_ECL) before
 * the cross products. This yields the true (osculating) node at the exact
 * birth instant — never the descending node, and never a value sampled from
 * a nearby node-crossing event.
 */
export function northNodeLongitude(utc: Date): number {
  const state = GeoMoonState(utc);
  const rot = Rotation_EQJ_ECL();
  const r = RotateVector(rot, { x: state.x, y: state.y, z: state.z });
  const v = RotateVector(rot, { x: state.vx, y: state.vy, z: state.vz });
  // h = r × v
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  // n = k̂ × h with k̂ = (0, 0, 1) in the ecliptic frame → n = (−hy, hx, 0)
  const nx = -hy;
  const ny = hx;
  let lon = (Math.atan2(ny, nx) * 180) / Math.PI;
  return normalizeDegrees(lon);
}

function makePlacement(key: string, name: string, glyph: string, longitude: number): Placement {
  const norm = normalizeDegrees(longitude);
  const mapping = sabianMappingForLongitude(norm);
  // Degree within the sign: the [0, 30) portion of the normalized longitude.
  const signIndex = Math.floor(norm / 30) % 12;
  const withinSign = norm - signIndex * 30;
  const { degree, minute, second } = toDMS(withinSign);
  return {
    key,
    name,
    glyph,
    longitude: norm,
    sign: mapping.sign,
    degree,
    minute,
    second,
    sabianDegree: mapping.degree,
    globalIndex: mapping.globalIndex,
  };
}

/**
 * Whether the Moon changes sign during the local calendar day (UTC day) —
 * used to mark the Moon as potentially uncertain when the birth time is unknown.
 */
export function moonChangesSignDuringUtcDay(utcMidnight: Date): boolean {
  const step = 30 * 60 * 1000;
  const start = utcMidnight.getTime();
  const end = start + 86400000;
  let prev = Math.floor(moonLongitude(MakeTime(new Date(start))) / 30);
  for (let t = start + step; t <= end; t += step) {
    const cur = Math.floor(moonLongitude(MakeTime(new Date(t))) / 30);
    if (cur !== prev) return true;
    prev = cur;
  }
  return false;
}

export class AstronomyEngineChartProvider implements ChartCalculationProvider {
  calculate(input: ChartInput): ChartData {
    const { utc, latitude, longitude, timeKnown } = input;

    const dt = deltaT(utc.getUTCFullYear());
    const obliquity = trueObliquity(utc, dt);
    const lst = localSiderealTimeDegrees(utc, longitude, dt);

    const time = MakeTime(utc);

    const sunLon = planetLongitude(Body.Sun, time);
    const moonLon = moonLongitude(time);

    const placements: Placement[] = [];
    const add = (key: string, name: NodeName, glyph: string, lon: number) =>
      placements.push(makePlacement(key, name, glyph, lon));

    add("sun", nodeNames.SUN, "☉", sunLon);
    add("moon", nodeNames.MOON, "☽", moonLon);
    for (const { key, body } of PLANET_BODIES) {
      if (body === Body.Sun) continue;
      add(key, nodeNames[key.toUpperCase() as keyof typeof nodeNames] ?? key, glyphFor(key), planetLongitude(body, time));
    }
    add("north_node", nodeNames.NORTH_NODE, "☊", northNodeLongitude(utc));

    // Ascendant/Midheaven: only calculated when the birth time is exact.
    // For unknown times they are never computed or displayed as facts.
    let houses;
    let houseSystemUsed: string = houseSystem.label;
    if (timeKnown) {
      const ascendant = findAscendant(lst, latitude, obliquity);
      add("ascendant", nodeNames.ASCENDANT, "↑", ascendant);
      const midheaven = findMidheaven(lst, obliquity);
      add("midheaven", nodeNames.MIDHEAVEN, "MC", midheaven);
      const result = computeHouseCusps(ascendant, midheaven, lst, latitude, obliquity);
      houses = result.cusps;
      houseSystemUsed = result.system;
    }

    const moonUncertain =
      !timeKnown && moonChangesSignDuringUtcDay(new Date(utc.getTime() - utc.getTimezoneOffset() * 60000));

    return {
      utcIso: utc.toISOString(),
      timeKnown,
      localDateOnly: input.localDateOnly,
      timeNotation: input.timeNotation,
      placements,
      houses,
      timeUncertaintyNote: timeKnown
        ? undefined
        : "Birth time unknown: Ascendant, Midheaven, and houses require an accurate birth time and are not calculated. Date-anchored placements use solar midnight as a disclosed reference instant.",
      moonUncertain,
      ephemerisConfig: {
        ephemeris: "astronomy-engine v2 (VSOP87-based, MIT)",
        ephemerisLicense: EPHEMERIS_LICENSE,
        zodiac: "tropical",
        houseSystem: houseSystemUsed,
        obliquity: "IAU 2006 mean obliquity + nutation (true obliquity of date)",
        deltaT: "Espenak–Meeus ΔT polynomials (NASA Eclipse)",
      },
    };
  }
}

function glyphFor(key: string): string {
  const glyphs: Record<string, string> = {
    mercury: "☿",
    venus: "♀",
    mars: "♂",
    jupiter: "♃",
    saturn: "♄",
    uranus: "♅",
    neptune: "♆",
    pluto: "♇",
  };
  return glyphs[key] ?? "•";
}

/**
 * Find the ecliptic longitude rising on the eastern horizon for an observer
 * at `latitude` with local sidereal time `lst`.
 *
 * A point of the ecliptic at longitude λ has altitude 0 when
 *   sin(alt) = sin φ · sin δ(λ) + cos φ · cos δ(λ) · cos H(λ) = 0.
 *
 * There are two such points: the rising point (eastern horizon) and the
 * setting point (western horizon). The rising point is the one whose hour
 * angle H = LST − RA(λ) lies in (180°, 360°) — i.e. the point is east of the
 * meridian, about to cross the horizon. We scan the ecliptic for both zero
 * crossings and select the rising one, then refine with bisection.
 */
export function findAscendant(
  lst: number,
  latitude: number,
  obliquity: number
): number {
  const eps = obliquity * (Math.PI / 180);
  const phi = latitude * (Math.PI / 180);
  const lstRad = lst * (Math.PI / 180);

  const altitude = (lon: number): number => {
    const l = lon * (Math.PI / 180);
    const sinDec = Math.sin(eps) * Math.sin(l);
    const ra = Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l));
    const H = lstRad - ra;
    return (
      Math.sin(phi) * sinDec + Math.cos(phi) * Math.cos(Math.asin(sinDec)) * Math.cos(H)
    );
  };

  // Find all zero crossings (rising and setting), select the rising one.
  const crossings: number[] = [];
  let prevAlt = altitude(0);
  for (let lon = 0.5; lon < 360; lon += 0.5) {
    const curAlt = altitude(lon);
    if ((prevAlt < 0 && curAlt >= 0) || (prevAlt > 0 && curAlt <= 0)) {
      crossings.push(lon - 0.5);
    }
    prevAlt = curAlt;
  }

  if (crossings.length === 0) {
    // Fallback: classical Ascendant formula.
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lstRad), Math.cos(lstRad));
    return normalizeDegrees(ra * (180 / Math.PI) + 90);
  }

  // Bisect each crossing, then pick the rising one (H in (180°, 360°)).
  let best: number | null = null;
  let bestScore = Infinity;
  for (const c of crossings) {
    let lo = c;
    let hi = c + 0.5;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (altitude(mid) < 0) lo = mid;
      else hi = mid;
    }
    const lon = (lo + hi) / 2;
    const l = lon * (Math.PI / 180);
    const ra = Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l));
    let H = (lstRad - ra) * (180 / Math.PI);
    H = ((H % 360) + 360) % 360;
    const score = H > 180 ? Math.min(H - 180, 360 - H) : Infinity;
    if (score < bestScore) {
      bestScore = score;
      best = lon;
    }
  }
  return normalizeDegrees(best ?? 0);
}

/** Midheaven: the ecliptic longitude λ whose right ascension equals LST. */
export function findMidheaven(lst: number, obliquity: number): number {
  const eps = obliquity * (Math.PI / 180);
  const lstRad = lst * (Math.PI / 180);
  // RA(λ) = LST  ⇔  tan(λ) = tan(LST)/cos(ε)  (from the standard transform,
  // RA = atan2(cos ε·sin λ, cos λ) = LST).
  const mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(eps));
  return normalizeDegrees(mc * (180 / Math.PI));
}

export function createChartProvider(): ChartCalculationProvider {
  return new AstronomyEngineChartProvider();
}
