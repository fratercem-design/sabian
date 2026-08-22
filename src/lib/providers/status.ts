/**
 * Provider status — a single source of truth for which providers are
 * fixture/mock/live, derived from ACTUAL configuration and wiring, never
 * hard-coded.
 *
 * Used by:
 *  - the beta readiness screen (development only)
 *  - the reading page "Demonstration Reading" label
 *  - docs/provider-matrix.md
 */

import { env, isTestingMode } from "@/lib/config";

export type ProviderKind = "fixture" | "mock" | "live" | "unavailable";

export interface ProviderStatus {
  /** Interface name (e.g. "ChartCalculationProvider"). */
  interfaceName: string;
  /** Current implementation name (e.g. "AstronomyEngineChartProvider"). */
  implementation: string;
  /** fixture | mock | live | unavailable */
  kind: ProviderKind;
  /** Environment variables that select/configure the provider. */
  envVars: string[];
  /** What data (if any) is sent to an external service. */
  externalData: string;
  /** Whether a live (non-mock) path has been exercised. */
  testedLive: boolean;
}

function chartStatus(): ProviderStatus {
  // Chart calculation is always local and deterministic; the ephemeris is a
  // local library, not an external service.
  return {
    interfaceName: "ChartCalculationProvider",
    implementation: "AstronomyEngineChartProvider (astronomy-engine, MIT)",
    kind: "fixture",
    envVars: [],
    externalData: "None — all calculation is local and deterministic.",
    testedLive: false,
  };
}

function geocodingStatus(): ProviderStatus {
  const isLive = Boolean(env.GEOCODING_API_URL && env.GEOCODING_API_KEY);
  return {
    interfaceName: "PlaceSearchProvider",
    implementation: isLive
      ? `LivePlaceSearchProvider (${env.GEOCODING_API_URL})`
      : "LocalPlaceSearchProvider (static place index)",
    kind: isLive ? "live" : "fixture",
    envVars: ["GEOCODING_API_URL", "GEOCODING_API_KEY"],
    externalData: isLive
      ? "Free-text query only sent to external geocoding API."
      : "None in fixture mode. A live provider would send only the free-text query.",
    testedLive: false,
  };
}

function timezoneStatus(): ProviderStatus {
  // moment-timezone embeds the IANA database locally; no external call.
  return {
    interfaceName: "TimeZoneResolver (lib/time/birthtime.ts)",
    implementation: "moment-timezone with bundled IANA tz database",
    kind: "fixture",
    envVars: [],
    externalData: "None — the IANA database is bundled locally.",
    testedLive: false,
  };
}

function sabianStatus(): ProviderStatus {
  // The demo dataset is 120 fictional placeholders; the import pipeline
  // exists but no authorized 360-record dataset is loaded.
  return {
    interfaceName: "SabianDataset (lib/sabian)",
    implementation: "demo fixture (120 fictional placeholders / 360)",
    kind: "fixture",
    envVars: [],
    externalData: "None — content is local.",
    testedLive: false,
  };
}

function storyStatus(): ProviderStatus {
  const kind: ProviderKind =
    env.TEXT_PROVIDER === "mock" ? "mock" : env.TEXT_API_KEY ? "live" : "unavailable";
  return {
    interfaceName: "InterpretationProvider",
    implementation:
      env.TEXT_PROVIDER === "mock"
        ? "MockInterpretationProvider (deterministic demo)"
        : `LiveInterpretationProvider (${env.TEXT_PROVIDER})`,
    kind,
    envVars: ["TEXT_PROVIDER", "TEXT_API_KEY", "TEXT_MODEL"],
    externalData: kind === "live" ? "Validated chart JSON + symbol records (no raw birthplace beyond the resolved place)." : "None.",
    testedLive: false,
  };
}

function imageStatus(): ProviderStatus {
  const kind: ProviderKind =
    env.IMAGE_PROVIDER === "mock" ? "mock" : env.IMAGE_API_KEY ? "live" : "unavailable";
  return {
    interfaceName: "ImageGenerationProvider",
    implementation:
      env.IMAGE_PROVIDER === "mock"
        ? "MockImageGenerationProvider (deterministic SVG)"
        : `LiveImageGenerationProvider (${env.IMAGE_PROVIDER})`,
    kind,
    envVars: ["IMAGE_PROVIDER", "IMAGE_API_KEY", "IMAGE_MODEL"],
    externalData: kind === "live" ? "Sanitized visual prompt only (symbol motifs + style); never the visitor's name or birthplace." : "None.",
    testedLive: false,
  };
}

function dbStatus(): { kind: "sqlite" | "postgres"; url: string } {
  const url = env.DATABASE_URL;
  if (url.startsWith("postgres") || url.startsWith("postgresql")) {
    return { kind: "postgres", url };
  }
  return { kind: "sqlite", url };
}

export interface ProviderMatrix {
  astrology: ProviderStatus;
  geocoding: ProviderStatus;
  timezone: ProviderStatus;
  sabian: ProviderStatus;
  story: ProviderStatus;
  image: ProviderStatus;
  database: { kind: "sqlite" | "postgres"; url: string };
  /** True when ANY provider needed for a complete reading is fixture/mock/incomplete. */
  isDemonstration: boolean;
  /** Which capabilities are incomplete, for the label. */
  incomplete: string[];
}

export function getProviderMatrix(): ProviderMatrix {
  const astrology = chartStatus();
  const geocoding = geocodingStatus();
  const timezone = timezoneStatus();
  const sabian = sabianStatus();
  const story = storyStatus();
  const image = imageStatus();
  const database = dbStatus();

  const incomplete: string[] = [];
  if (astrology.kind !== "live") incomplete.push("astrology");
  if (geocoding.kind !== "live") incomplete.push("geocoding");
  if (timezone.kind !== "live") incomplete.push("timezone");
  if (sabian.kind !== "live") incomplete.push("sabian-content");
  if (story.kind !== "live") incomplete.push("story");
  if (image.kind !== "live") incomplete.push("artwork");

  // A reading is a demonstration whenever ANY required provider is
  // fixture/mock/incomplete — including the incomplete Sabian dataset.
  const isDemonstration =
    incomplete.length > 0 || sabian.kind === "fixture" || !isTestingMode;

  return {
    astrology,
    geocoding,
    timezone,
    sabian,
    story,
    image,
    database,
    isDemonstration,
    incomplete,
  };
}
