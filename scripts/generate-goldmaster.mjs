/**
 * Gold-master fixture generator — INDEPENDENT Swiss Ephemeris reference.
 *
 * Uses the Swiss Ephemeris WebAssembly port (swisseph-wasm, GPL-3.0-or-later)
 * as a DEV-ONLY validation dependency. The Swiss Ephemeris is the de-facto
 * industry reference (used by Astro.com, AstroSeek, etc.). It is licensed
 * AGPL/GPL — see docs/goldmaster.md for the licensing note and the commercial
 * license decision point.
 *
 * This script generates docs/goldmaster/fixtures.json containing SE reference
 * values for a spread of charts. The values are committed so tests compare
 * against the gold standard WITHOUT needing the WASM module at test time
 * (keeping the GPL dependency out of the shipped application).
 *
 * Usage: node scripts/generate-goldmaster.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Chart definitions covering the required spread:
 * hemispheres, latitudes, eras, DST edges, zodiac boundaries, unknown time.
 */
const CHARTS = [
  {
    id: "north-modern-london",
    label: "Northern Hemisphere, modern date (London, 1990-06-15 14:30 BST)",
    date: "1990-06-15T13:30:00.000Z",
    lat: 51.5074,
    lon: -0.1278,
    timeKnown: true,
  },
  {
    id: "north-historical-wadowice",
    label: "Northern Hemisphere, historical date (Wadowice, 1920-05-18 17:30 CET+1h)",
    date: "1920-05-18T15:30:00.000Z",
    lat: 49.8833,
    lon: 19.5,
    timeKnown: true,
  },
  {
    id: "south-sydney",
    label: "Southern Hemisphere (Sydney, 1985-03-14 09:15 AEDT)",
    date: "1985-03-13T22:15:00.000Z",
    lat: -33.8688,
    lon: 151.2093,
    timeKnown: true,
  },
  {
    id: "south-auckland",
    label: "Southern Hemisphere (Auckland, 2001-11-05 06:00 NZDT)",
    date: "2001-11-04T17:00:00.000Z",
    lat: -36.8485,
    lon: 174.7633,
    timeKnown: true,
  },
  {
    id: "equator-singapore",
    label: "Equatorial (Singapore, 2010-07-20 12:00 SGT)",
    date: "2010-07-20T04:00:00.000Z",
    lat: 1.3521,
    lon: 103.8198,
    timeKnown: true,
  },
  {
    id: "equator-quito",
    label: "Equatorial (Quito, 1975-01-01 00:10 ECT)",
    date: "1975-01-01T05:10:00.000Z",
    lat: -0.1807,
    lon: -78.4678,
    timeKnown: true,
  },
  {
    id: "high-lat-reykjavik",
    label: "High latitude, Placidus calculable (Reykjavík, 1980-06-21 10:00 GMT)",
    date: "1980-06-21T10:00:00.000Z",
    lat: 64.1466,
    lon: -21.9426,
    timeKnown: true,
  },
  {
    id: "high-lat-helsinki",
    label: "High latitude (Helsinki, 1995-12-15 03:30 EET)",
    date: "1995-12-15T01:30:00.000Z",
    lat: 60.1699,
    lon: 24.9384,
    timeKnown: true,
  },
  {
    id: "dst-spring-gap-ny",
    label: "DST spring-forward gap avoided (New York, 2024-03-10 03:05 EDT)",
    date: "2024-03-10T07:05:00.000Z",
    lat: 40.7128,
    lon: -74.006,
    timeKnown: true,
  },
  {
    id: "dst-autumn-overlap-ny",
    label: "DST autumn overlap, daylight choice (New York, 2024-11-03 01:30 EDT)",
    date: "2024-11-03T05:30:00.000Z",
    lat: 40.7128,
    lon: -74.006,
    timeKnown: true,
  },
  {
    id: "boundary-before-taurus",
    label: "Placement just before a zodiac boundary (Sun ~29° Aries)",
    date: "1994-04-20T12:00:00.000Z",
    lat: 48.8566,
    lon: 2.3522,
    timeKnown: true,
  },
  {
    id: "boundary-after-taurus",
    label: "Placement just after a zodiac boundary (Sun ~0-1° Taurus)",
    date: "1994-04-20T14:00:00.000Z",
    lat: 48.8566,
    lon: 2.3522,
    timeKnown: true,
  },
  {
    id: "house-cusp-boundary",
    label: "Placement near a house cusp (targeted)",
    date: "1978-08-08T08:15:00.000Z",
    lat: 34.0522,
    lon: -118.2437,
    timeKnown: true,
  },
  {
    id: "unknown-time-tokyo",
    label: "Unknown birth time (Tokyo, 1988-02-29)",
    date: "1988-02-28T15:00:00.000Z",
    lat: 35.6762,
    lon: 139.6503,
    timeKnown: false,
  },
];

// Swiss Ephemeris constants
const SEFLG_SPEED = 0x100;
const SE_SUN = 0, SE_MOON = 1, SE_MERCURY = 2, SE_VENUS = 3, SE_MARS = 4;
const SE_JUPITER = 5, SE_SATURN = 6, SE_URANUS = 7, SE_NEPTUNE = 8, SE_PLUTO = 9;
const SE_MEAN_NODE = 10, SE_TRUE_NODE = 11;
const SE_ASC = 0, SE_MC = 1;

const PLANETS = [
  ["sun", SE_SUN], ["moon", SE_MOON], ["mercury", SE_MERCURY], ["venus", SE_VENUS],
  ["mars", SE_MARS], ["jupiter", SE_JUPITER], ["saturn", SE_SATURN],
  ["uranus", SE_URANUS], ["neptune", SE_NEPTUNE], ["pluto", SE_PLUTO],
];

function toDms(deg) {
  const d = ((deg % 360) + 360) % 360;
  const sign = Math.floor(d / 30);
  const inSign = d - sign * 30;
  const degree = Math.floor(inSign);
  const minute = Math.floor((inSign - degree) * 60);
  const second = Math.floor(((inSign - degree) * 60 - minute) * 60 + 1e-9);
  return { sign, degree, minute, second, longitude: d };
}

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function sabianOf(deg) {
  // Degree-to-next convention (leading edge): position within degree -> next degree.
  const norm = ((deg % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const inSign = norm - signIndex * 30;
  const sabianDegree = Math.floor(inSign) + 1;
  const globalIndex = signIndex * 30 + sabianDegree;
  return { sabianDegree, globalIndex, sign: SIGNS[signIndex] };
}

async function generate() {
  const { default: SwissEphModule } = await import("swisseph-wasm");
  const se = new SwissEphModule();
  await se.initSwissEph?.();

  const fixtures = [];
  for (const chart of CHARTS) {
    const utc = new Date(chart.date);
    const jd = se.julday(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600, 1);

    const placements = [];
    for (const [name, planet] of PLANETS) {
      const r = se.calc_ut(jd, planet, SEFLG_SPEED);
      placements.push({ key: name, ...toDms(r[0]) });
    }
    for (const [name, planet] of [["mean_node", SE_MEAN_NODE], ["true_node", SE_TRUE_NODE]]) {
      const r = se.calc_ut(jd, planet, SEFLG_SPEED);
      placements.push({ key: name, ...toDms(r[0]) });
    }

    let houses = null;
    let ascmc = null;
    if (chart.timeKnown) {
      // swe_sidtime returns sidereal time at GREENWICH in hours. The ARMC at
      // the birthplace is sidtime*15 + east_longitude.
      const armc = se.sidtime(jd) * 15 + chart.lon;
      const h = se.houses_armc_ex2(armc, chart.lat, 23.4375, "P");
      houses = Object.fromEntries(
        Object.entries(h.cusps).map(([k, v]) => [k, ((v % 360) + 360) % 360])
      );
      ascmc = {
        ascendant: ((h.ascmc[SE_ASC] % 360) + 360) % 360,
        mc: ((h.ascmc[SE_MC] % 360) + 360) % 360,
        armc,
      };
    }

    const withSabian = (p) => ({
      ...p,
      signName: SIGNS[p.sign],
      sabian: sabianOf(p.longitude),
    });

    fixtures.push({
      id: chart.id,
      label: chart.label,
      utcIso: chart.date,
      lat: chart.lat,
      lon: chart.lon,
      timeKnown: chart.timeKnown,
      jd,
      placements: placements.map(withSabian),
      houses,
      ascmc,
      note: chart.id === "dst-autumn-overlap-ny" ? "overlap resolved to the daylight (EDT) occurrence 05:30Z" : undefined,
    });
    console.log(`generated ${chart.id}`);
  }

  const out = join(__dirname, "..", "docs", "goldmaster");
  mkdirSync(out, { recursive: true });
  const payload = {
    generator: "swisseph-wasm (Swiss Ephemeris 2.10.03)",
    generatedAt: new Date().toISOString(),
    conventions: {
      zodiac: "tropical",
      houses: "Placidus (hsys P)",
      node: "mean_node and true_node both recorded",
      sabian: "degree-to-next (leading edge)",
    },
    fixtures,
  };
  writeFileSync(join(out, "fixtures.json"), JSON.stringify(payload, null, 2));
  console.log("Wrote", fixtures.length, "fixtures to docs/goldmaster/fixtures.json");
}

generate().catch((e) => {
  console.error("Generation failed:", e);
  process.exit(1);
});
