/**
 * Provider status — a single source of truth for the state of every provider,
 * derived from ACTUAL configuration and wiring, never hard-coded.
 *
 * Taxonomy (what a status actually means):
 *  - local-verified        Deterministic, production-grade local implementation
 *                          that is independently verified (gold-master / tests).
 *                          NOT "incomplete" just because it isn't an external API.
 *  - demo-fixture          Incomplete demonstration content (the 120-symbol demo).
 *  - mock                  Deterministic mock provider standing in for a live one.
 *  - configured-untested   Live credentials/URL present, but no controlled live
 *                          call has been verified in this environment.
 *  - configured-unsupported Configuration present, but no runtime implementation
 *                          exists yet (e.g. PostgreSQL DATABASE_URL).
 *  - tested-live           A controlled live call has passed verification.
 *  - unavailable           Required, but not configured at all.
 *
 * Used by the beta readiness dashboard, the "Demonstration Reading" label, and
 * docs/provider-matrix.md.
 */

import { env } from "@/lib/config";
import { getActiveDatasetKind, getSymbolDataset, isDemoDataset } from "@/lib/sabian/index";

export type ProviderKind =
  | "local-verified"
  | "demo-fixture"
  | "mock"
  | "configured-untested"
  | "configured-unsupported"
  | "tested-live"
  | "unavailable";

export interface ProviderStatus {
  /** Interface name (e.g. "ChartCalculationProvider"). */
  interfaceName: string;
  /** Current implementation name. */
  implementation: string;
  kind: ProviderKind;
  /** Environment variables that select/configure the provider. */
  envVars: string[];
  /** What data (if any) is sent to an external service. */
  externalData: string;
  /** Human note about what would make this production-ready. */
  readinessNote: string;
}

function chartStatus(): ProviderStatus {
  // Local deterministic ephemeris; gold-master verified against Swiss
  // Ephemeris. Production-grade local code, not an incomplete fixture.
  return {
    interfaceName: "ChartCalculationProvider",
    implementation: "AstronomyEngineChartProvider (astronomy-engine, MIT)",
    kind: "local-verified",
    envVars: [],
    externalData: "None — all calculation is local and deterministic.",
    readinessNote: "Verified by the Swiss-Ephemeris gold-master suite.",
  };
}

function geocodingStatus(): ProviderStatus {
  // Selection and readiness use the SAME requirement: a configured API URL.
  const liveConfigured = Boolean(env.GEOCODING_API_URL);
  if (liveConfigured) {
    return {
      interfaceName: "PlaceSearchProvider",
      implementation: `LivePlaceSearchProvider (${env.GEOCODING_PROVIDER ?? "generic geocoding API"})`,
      kind: "configured-untested",
      envVars: ["GEOCODING_API_URL", "GEOCODING_API_KEY", "GEOCODING_PROVIDER"],
      externalData: "Free-text place query only; results are returned as server-signed place tokens.",
      readinessNote: "Live geocoding configured but not yet verified with a controlled live call.",
    };
  }
  return {
    interfaceName: "PlaceSearchProvider",
    implementation: "LocalPlaceSearchProvider (deterministic place index)",
    kind: "local-verified",
    envVars: ["GEOCODING_API_URL"],
    externalData: "None in local mode. A live provider would send only the free-text query.",
    readinessNote: "Deterministic fixture index; a live provider can be enabled via GEOCODING_API_URL.",
  };
}

function timezoneStatus(): ProviderStatus {
  // moment-timezone embeds the IANA database locally; no external call. This is
  // production-grade local code, not an incomplete fixture.
  return {
    interfaceName: "TimeZoneResolver (lib/time/birthtime.ts)",
    implementation: "moment-timezone with bundled IANA tz database",
    kind: "local-verified",
    envVars: [],
    externalData: "None — the IANA database is bundled locally.",
    readinessNote: "Historical offsets resolved from the bundled IANA database.",
  };
}

function sabianStatus(): ProviderStatus {
  // Inspect the ACTIVE dataset at runtime rather than assuming the demo.
  const dataset = getSymbolDataset();
  const count = dataset.length;
  const demo = isDemoDataset();
  const datasetKind = getActiveDatasetKind();
  if (demo) {
    return {
      interfaceName: "DegreeImageDataset (lib/sabian)",
      implementation: `demo fixture (${count}/360 fictional placeholders)`,
      kind: "demo-fixture",
      envVars: [],
      externalData: "None — content is local.",
      readinessNote: "Incomplete demo content; an authorized 360-symbol dataset must be imported.",
    };
  }
  if (datasetKind === "project-owned-original") {
    const allReviewed =
      count === 360 && dataset.every((s) => s.editorialReviewStatus === "reviewed");
    return {
      interfaceName: "DegreeImageDataset (lib/sabian)",
      implementation: `project-owned original degree imagery (${count}/360)`,
      kind: count === 360 ? "local-verified" : "demo-fixture",
      envVars: ["SABIAN_DATASET_PATH"],
      externalData: "None — content is local.",
      readinessNote:
        count === 360
          ? allReviewed
            ? "Project-owned original degree-image corpus loaded and human-editorial review is recorded."
            : "Project-owned original degree-image corpus loaded and passes automated checks, but has not been marked as human-editorially reviewed."
          : "Project-owned dataset is short of the full 360 degree images.",
    };
  }
  return {
    interfaceName: "DegreeImageDataset (lib/sabian)",
    implementation: `imported dataset (${count}/360 degree images)`,
    kind: count === 360 ? "local-verified" : "demo-fixture",
    envVars: ["SABIAN_DATASET_PATH"],
    externalData: "None — content is local.",
    readinessNote:
      count === 360
        ? "Full dataset loaded and validated."
        : "Imported dataset is still short of the full 360 symbols.",
  };
}

function storyStatus(): ProviderStatus {
  if (env.TEXT_PROVIDER === "mock") {
    return {
      interfaceName: "InterpretationProvider",
      implementation: "MockInterpretationProvider (deterministic demo)",
      kind: "mock",
      envVars: ["TEXT_PROVIDER", "TEXT_API_KEY", "TEXT_MODEL"],
      externalData: "None.",
      readinessNote: "Deterministic mock; set TEXT_PROVIDER + TEXT_API_KEY to go live.",
    };
  }
  if (!env.TEXT_API_KEY) {
    return {
      interfaceName: "InterpretationProvider",
      implementation: `LiveInterpretationProvider (${env.TEXT_PROVIDER})`,
      kind: "unavailable",
      envVars: ["TEXT_PROVIDER", "TEXT_API_KEY", "TEXT_MODEL"],
      externalData: "None until configured.",
      readinessNote: "Live provider selected but TEXT_API_KEY is missing.",
    };
  }
  return {
    interfaceName: "InterpretationProvider",
    implementation: `LiveInterpretationProvider (${env.TEXT_PROVIDER})`,
    kind: "configured-untested",
    envVars: ["TEXT_PROVIDER", "TEXT_API_KEY", "TEXT_MODEL"],
    externalData: "Validated chart JSON + symbol records (never the raw birthplace beyond the resolved place).",
    readinessNote: "Configured but not yet verified with a controlled live call.",
  };
}

function imageStatus(): ProviderStatus {
  if (env.IMAGE_PROVIDER === "mock") {
    return {
      interfaceName: "ImageGenerationProvider",
      implementation: "MockImageGenerationProvider (deterministic SVG)",
      kind: "mock",
      envVars: ["IMAGE_PROVIDER", "IMAGE_API_KEY", "IMAGE_MODEL"],
      externalData: "None.",
      readinessNote: "Deterministic mock; set IMAGE_PROVIDER + IMAGE_API_KEY to go live.",
    };
  }
  if (!env.IMAGE_API_KEY) {
    return {
      interfaceName: "ImageGenerationProvider",
      implementation: `LiveImageGenerationProvider (${env.IMAGE_PROVIDER})`,
      kind: "unavailable",
      envVars: ["IMAGE_PROVIDER", "IMAGE_API_KEY", "IMAGE_MODEL"],
      externalData: "None until configured.",
      readinessNote: "Live provider selected but IMAGE_API_KEY is missing.",
    };
  }
  return {
    interfaceName: "ImageGenerationProvider",
    implementation: `LiveImageGenerationProvider (${env.IMAGE_PROVIDER})`,
    kind: "configured-untested",
    envVars: ["IMAGE_PROVIDER", "IMAGE_API_KEY", "IMAGE_MODEL"],
    externalData: "Sanitized visual prompt only; never the visitor's name or birthplace.",
    readinessNote: "Configured but not yet verified with a controlled live call.",
  };
}

export interface DatabaseStatus {
  kind: ProviderKind;
  backend: "sqlite" | "postgres";
  readinessNote: string;
}

function dbStatus(): DatabaseStatus {
  const url = env.DATABASE_URL;
  const isPostgres = url.startsWith("postgres");
  if (isPostgres) {
    // Runtime support exists, but configuration alone is never proof that the
    // schema, TLS, credentials, backups, or retention job work in production.
    return {
      kind: "configured-untested",
      backend: "postgres",
      readinessNote:
        "PostgreSQL runtime is implemented and parameterized; run `DATABASE_URL=... npm run smoke:postgres -- --apply` for a controlled schema/CRUD/cleanup verification.",
    };
  }
  return {
    kind: "local-verified",
    backend: "sqlite",
    readinessNote: "Local SQLite (node:sqlite) is implemented and integration-tested.",
  };
}

export interface ProviderMatrix {
  astrology: ProviderStatus;
  geocoding: ProviderStatus;
  timezone: ProviderStatus;
  sabian: ProviderStatus;
  story: ProviderStatus;
  image: ProviderStatus;
  database: DatabaseStatus;
  /**
   * Capabilities that genuinely block a closed beta. Local-verified chart,
   * timezone, and SQLite are NOT listed — they are production-grade local code.
   */
  incomplete: string[];
  /** True when any required capability is demo/mock/unavailable/unverified. */
  isDemonstration: boolean;
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
  if (sabian.kind === "demo-fixture") incomplete.push("sabian-content");
  if (story.kind !== "tested-live") incomplete.push("story");
  if (image.kind !== "tested-live") incomplete.push("artwork");
  if (geocoding.kind === "configured-untested") incomplete.push("geocoding-live-verification");
  if (database.kind !== "tested-live" && database.backend === "postgres") incomplete.push("database-live-verification");

  const isDemonstration = incomplete.length > 0;

  return { astrology, geocoding, timezone, sabian, story, image, database, incomplete, isDemonstration };
}

/**
 * Explicit, individually-inspectable beta-readiness capability checks. The
 * readiness verdict is derived from these — never hard-coded.
 */
export interface ReadinessChecks {
  chartVerified: boolean;
  timezoneVerified: boolean;
  symbolContentReady: boolean;
  storyLiveVerified: boolean;
  imageLiveVerified: boolean;
  geocodingOperational: boolean;
  databaseProductionVerified: boolean;
}

export function getReadinessChecks(): ReadinessChecks {
  const m = getProviderMatrix();
  const symbolDataset = getSymbolDataset();
  const symbolCount = symbolDataset.length;
  const allSymbolsReviewed =
    symbolCount === 360 && symbolDataset.every((s) => s.editorialReviewStatus === "reviewed");
  return {
    chartVerified: m.astrology.kind === "local-verified",
    timezoneVerified: m.timezone.kind === "local-verified",
    symbolContentReady: m.sabian.kind === "local-verified" && symbolCount === 360 && allSymbolsReviewed,
    storyLiveVerified: m.story.kind === "tested-live",
    imageLiveVerified: m.image.kind === "tested-live",
    geocodingOperational:
      m.geocoding.kind === "local-verified" || m.geocoding.kind === "tested-live",
    databaseProductionVerified: m.database.kind === "tested-live",
  };
}

/** Derived verdict: safe for a closed private beta only if every check passes. */
export function isSafeForPrivateBeta(): boolean {
  const c = getReadinessChecks();
  return Object.values(c).every(Boolean);
}
