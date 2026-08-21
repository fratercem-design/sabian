/**
 * Core celestial math shared by the chart provider.
 *
 * Everything here is deterministic and documented. No AI is ever involved in
 * these calculations. Sources:
 *  - Meeus, Jean. *Astronomical Algorithms*, 2nd ed. (1998), chapters 12 (obliquity),
 *    22 (nutation), 25 (sidereal time), 27 (equatorial↔horizontal).
 *  - Espenak & Meeus, "Five Millennium Canon of Solar Eclipses" — Delta T
 *    polynomial segments used by the NASA Eclipse site.
 *  - IAU 2006 obliquity polynomial.
 */

import { SIGNS, type Sign } from "@/lib/types";

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function normalizeDegrees(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

export function clampLatitude(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

/** Sign (0=Aries … 11=Pisces) for a normalized ecliptic longitude in degrees. */
export function signIndexForLongitude(longitude: number): number {
  return Math.floor(normalizeDegrees(longitude) / 30) % 12;
}

export function signForLongitude(longitude: number): Sign {
  return SIGNS[signIndexForLongitude(longitude)];
}

/** Decimal degrees → whole degrees, minutes, seconds (truncating toward zero). */
export function toDMS(degrees: number): { degree: number; minute: number; second: number } {
  const abs = Math.abs(degrees);
  const degree = Math.floor(abs);
  const minute = Math.floor((abs - degree) * 60);
  const second = Math.floor((((abs - degree) * 60) - minute) * 60 + 1e-9);
  return { degree, minute, second };
}

/** Format a longitude as e.g. "14°32′51″ Aries". */
export function formatPosition(longitude: number): string {
  const norm = normalizeDegrees(longitude);
  const sign = signForLongitude(norm);
  const { degree, minute, second } = toDMS(norm);
  return `${degree}°${String(minute).padStart(2, "0")}′${String(second).padStart(2, "0")}″ ${sign}`;
}

/* ------------------------------ Time math ------------------------------ */

/** Julian Day from a Date (UTC). */
export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Julian centuries TT since J2000 (approx: TT ≈ UTC + ΔT, with ΔT in seconds). */
export function julianCenturiesTT(utc: Date, deltaTSeconds: number): number {
  return (julianDay(utc) + deltaTSeconds / 86400 - 2451545.0) / 36525.0;
}

/**
 * ΔT (TT − UT1, in seconds) using the Espenak–Meeus piecewise polynomials.
 * NASA Eclipse page segments, valid 1900–2150. Beyond those years we fall
 * back to the ends of the range — acceptable for a natal-chart MVP, and the
 * approximation is disclosed in the methodology page.
 */
export function deltaT(year: number): number {
  if (year >= 1900 && year <= 2150) {
    if (year < 1920) {
      const t = year - 1900;
      return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t ** 4;
    }
    if (year < 1941) {
      const t = year - 1920;
      return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
    }
    if (year < 1961) {
      const t = year - 1950;
      return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
    }
    if (year < 1986) {
      const t = year - 1975;
      return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
    }
    if (year < 2005) {
      const t = year - 2000;
      return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
    }
    if (year < 2050) {
      const t = year - 2000;
      return 62.92 + 0.32217 * t + 0.005589 * t * t;
    }
    const t = year - 2000;
    return -20 + 32 * ((t / 100) * (t / 100)) - 0.5628 * (2150 - year);
  }
  if (year < 1900) {
    // Espenak–Meeus long-range (years 1600–1900).
    const t = year - 1850;
    return -2.8 + 0.98597 * t + 0.0026707 * t * t - 0.0002061 * t ** 3;
  }
  // Beyond 2150 — extension (unverified); disclosed in docs.
  return 100 + 0.25 * (year - 2150);
}

/** Mean obliquity of the ecliptic (IAU 2006), degrees, for a TT Julian century. */
export function meanObliquity(JCE: number): number {
  const u = JCE / 100;
  return (
    23.4392794444444 -
    0.0130041666667 * u -
    0.0000001638889 * u * u +
    0.0000005036111 * u * u * u
  );
}

/** True obliquity (mean + nutation in obliquity), degrees. */
export function trueObliquity(utc: Date, deltaTSeconds: number): number {
  const JCE = julianCenturiesTT(utc, deltaTSeconds);
  const omega =
    125.04452 - 1934.136261 * JCE + 0.0020708 * JCE * JCE + (JCE * JCE * JCE) / 450000;
  const eps0 = meanObliquity(JCE);
  const deltaEps =
    0.00256 * Math.cos((omega % 360) * DEG2RAD) + 0.00016 * Math.cos((2 * omega) % 360 * DEG2RAD);
  return eps0 + deltaEps;
}

/** Greenwich Apparent Sidereal Time (GAST) in degrees, from a UTC Date. */
export function greenwichApparentSiderealTime(utc: Date, deltaTSeconds: number): number {
  const jd = julianDay(utc);
  const T = (jd - 2451545.0) / 36525.0; // UT-based centuries
  // GMST in seconds, then convert to degrees.
  let gmst =
    67310.54841 +
    (876600 * 3600 + 8640184.812866) * T +
    0.093104 * T * T -
    6.2e-6 * T * T * T;
  gmst = (gmst / 240) % 360;
  if (gmst < 0) gmst += 360;
  // Equation of the equinoxes (nutation in longitude × cos ε).
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  const deltaPsi = -0.00478 * Math.sin((omega % 360) * DEG2RAD) - 0.0001224 * Math.sin((2 * omega) % 360 * DEG2RAD);
  const eps = trueObliquity(utc, deltaTSeconds);
  return normalizeDegrees(gmst + deltaPsi * Math.cos(eps * DEG2RAD));
}

/**
 * Local (apparent) sidereal time in degrees for an observer, from a UTC Date.
 * RAMC (Right Ascension of the Midheaven) = LST in degrees.
 */
export function localSiderealTimeDegrees(utc: Date, longitudeDeg: number, deltaTSeconds: number): number {
  return normalizeDegrees(greenwichApparentSiderealTime(utc, deltaTSeconds) + longitudeDeg);
}

/** Local hour angle in degrees for a body at ecliptic longitude `lon`. */
export function localHourAngleDegrees(
  utc: Date,
  longitudeDeg: number,
  deltaTSeconds: number,
  eclipticLongitudeDeg: number,
  obliquityDeg: number
): number {
  const lst = localSiderealTimeDegrees(utc, longitudeDeg, deltaTSeconds);
  // Convert ecliptic → equatorial RA using the standard transformation.
  const sinDec = Math.sin(obliquityDeg * DEG2RAD) * Math.sin(eclipticLongitudeDeg * DEG2RAD);
  const ra = Math.atan2(
    Math.sin(eclipticLongitudeDeg * DEG2RAD) * Math.cos(obliquityDeg * DEG2RAD),
    Math.cos(eclipticLongitudeDeg * DEG2RAD)
  );
  const raDeg = normalizeDegrees(ra * RAD2DEG);
  return normalizeDegrees(lst - raDeg - sinDec * 0); // RA alone is enough for the angle sweep.
}

export function formatDMS(degrees: number): string {
  const { degree, minute, second } = toDMS(degrees);
  return `${degree}°${String(minute).padStart(2, "0")}′${String(second).padStart(2, "0")}″`;
}
