/**
 * ReadingService — the orchestration pipeline.
 *
 * Strict separation is enforced here:
 *   1. resolve place        (lib/places/resolve — shared by search/review/create;
 *                            live results resolve via server-signed place tokens,
 *                            never client-supplied coordinates/timezones)
 *   2. convert time         (historical UTC offset via moment-timezone)
 *   3. calculate chart      (ChartCalculationProvider — deterministic)
 *   4. find symbols         (Sabian dataset lookup — deterministic)
 *   5. compose interpretation (InterpretationProvider — validated by Zod,
 *                              one retry on validation failure)
 *   6. create artwork       (ImageGenerationProvider — name/place never sent)
 *   7. weave story          (part of the interpretation output)
 *
 * Every interpretation must be traceable to the exact calculated placements
 * stored in the reading. Unknown-time readings never derive the Ascendant,
 * Midheaven, or houses; the Moon is flagged if it may shift degree during
 * the local calendar day.
 */

/* Server-side orchestration. Imported only from API routes, server
 * components, and tests/scripts — never from client components. */

import { resolvePlace as resolvePlaceById } from "@/lib/places/resolve";
import { localToUtc, unknownTimeUtc, localDayBoundsUtc } from "@/lib/time/birthtime";
import { createChartProvider, type ChartCalculationProvider } from "@/lib/chart/provider";
import { getSymbolDataset, isDemoDataset } from "@/lib/sabian/index";
import { findSymbolByGlobalIndex } from "@/lib/sabian/model";
import { createInterpretationProvider } from "@/lib/interpretation/mock-provider";
import { createLiveInterpretationProvider } from "@/lib/interpretation/live-provider";
import { selectImageProvider, type ImageGenerationProvider } from "@/lib/image/provider";
import { hashPrompt } from "@/lib/art/art-cache";
import { createReadingRepository, newReadingId, type ReadingRepository } from "@/lib/db/reading-repository";
import { validateInterpretation, type InterpretationInput, type InterpretationOutput, type InterpretationProvider } from "@/lib/interpretation/contract";
import { env, seededRandom } from "@/lib/config";
import type { Reading, PlaceResult, ChartData, GeneratedArtwork } from "@/lib/types";

export type PipelineStage =
  | "resolving-place"
  | "converting-time"
  | "calculating-chart"
  | "finding-symbols"
  | "composing-interpretation"
  | "creating-artwork"
  | "weaving-story"
  | "complete"
  | "failed";

export interface ReadingProgress {
  stage: PipelineStage;
  label: string;
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  "resolving-place": "Resolving birthplace",
  "converting-time": "Converting historical time",
  "calculating-chart": "Calculating the natal chart",
  "finding-symbols": "Finding the relevant Sabian Symbols",
  "composing-interpretation": "Composing the interpretation",
  "creating-artwork": "Creating symbolic artwork",
  "weaving-story": "Weaving the personal story",
  complete: "Complete",
  failed: "Failed",
};

export interface CreateReadingInput {
  displayName: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:MM, required unless unknown
  timeKnown: boolean;
  /** Explicit offset choice for ambiguous (DST overlap) times. */
  overlapOffsetChoice?: "daylight" | "standard";
  placeId: string;
  consent: boolean;
}

export class ReadingService {
  constructor(
    private chart: ChartCalculationProvider = createChartProvider(),
    private interpretation: InterpretationProvider = selectInterpretationProvider(),
    private image: ImageGenerationProvider = selectImageProvider(),
    private repo: ReadingRepository = createReadingRepository()
  ) {}

  private progress?: (stage: PipelineStage) => void;

  onProgress(fn: (stage: PipelineStage) => void): void {
    this.progress = fn;
  }

  private emit(stage: PipelineStage): void {
    this.progress?.(stage);
  }

  async create(input: CreateReadingInput): Promise<Reading> {
    if (!input.consent) {
      throw new Error("Consent to process birth information is required.");
    }

    const place = await this.resolvePlace(input.placeId);

    // Stage 2: historical time conversion.
    this.emit("converting-time");
    const resolved = input.timeKnown
      ? localToUtc({
          date: input.birthDate,
          time: input.birthTime!,
          timezone: place.timezone,
          overlapOffsetChoice: input.overlapOffsetChoice,
        })
      : unknownTimeUtc({ date: input.birthDate, timezone: place.timezone });

    // Stage 3: deterministic chart calculation.
    this.emit("calculating-chart");
    const chart = this.chart.calculate({
      utc: new Date(resolved.utcIso),
      latitude: place.latitude,
      longitude: place.longitude,
      timeKnown: input.timeKnown,
      localDateOnly: input.timeKnown ? undefined : input.birthDate,
      timeNotation: input.timeKnown ? undefined : "Solar midnight of the local calendar date (disclosed reference instant)",
      // Moon uncertainty is scanned over the ACTUAL local calendar day at the
      // birthplace (converted to UTC bounds), independent of the server zone.
      localDayBoundsUtc: input.timeKnown ? undefined : localDayBoundsUtc(input.birthDate, place.timezone),
    });

    // Stage 4: symbol lookup.
    this.emit("finding-symbols");
    const symbols = this.findSymbols(chart);

    // isDemo is derived from the actual providers that ran and the symbol
    // dataset used — not from a global "testing mode" flag. It is true
    // whenever mock text, mock artwork, or the incomplete demo-fixture
    // symbol dataset is used.
    const symbolDatasetIsDemo = isDemoDataset();
    const isDemo =
      this.interpretation.name.includes("mock") ||
      this.image.name.includes("mock") ||
      symbolDatasetIsDemo;

    const reading: Reading = {
      id: newReadingId(),
      createdAt: new Date().toISOString(),
      displayName: input.displayName,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      timeKnown: input.timeKnown,
      timeNotation: chart.timeNotation,
      place,
      chart,
      status: "generating",
      isDemo,
      // Generated readings are NOT saved by default; saving is an explicit,
      // opt-in user action with the retention period disclosed up front.
      saved: false,
      providers: {
        interpretation: this.interpretation.name,
        image: this.image.name,
        symbolDatasetIsDemo,
      },
    };
    await this.repo.create(reading);

    try {
      // Stage 5: interpretation (validated, retried once on failure).
      this.emit("composing-interpretation");
      const interpretationInput = this.buildInterpretationInput(input, place, chart, symbols);
      const interpretation = await this.generateInterpretationWithRetry(interpretationInput);

      // Stage 6: artwork.
      this.emit("creating-artwork");
      const artwork = await this.generateArtwork(reading, interpretation);

      // Stage 7: story is part of the interpretation output.
      this.emit("weaving-story");

      const complete: Reading = { ...reading, interpretation, artwork, status: "ready" };
      await this.repo.update(complete);
      return complete;
    } catch (err) {
      const failed: Reading = {
        ...reading,
        status: "failed",
        error: err instanceof Error ? err.message : "Generation failed",
      };
      await this.repo.update(failed);
      throw err;
    }
  }

  async get(id: string): Promise<Reading | null> {
    return this.repo.getById(id);
  }

  /** Explicit opt-in: mark a generated reading as saved. */
  async saveReading(id: string): Promise<boolean> {
    return this.repo.markSaved(id);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  private async resolvePlace(placeId: string): Promise<PlaceResult> {
    this.emit("resolving-place");
    const place = await resolvePlaceById(placeId);
    if (!place) throw new Error("Selected birthplace could not be resolved.");
    return place;
  }

  private findSymbols(chart: ChartData) {
    const dataset = getSymbolDataset();
    return chart.placements.map((p) => {
      const symbol = findSymbolByGlobalIndex(dataset, p.globalIndex);
      return {
        globalIndex: p.globalIndex,
        sign: p.sign,
        degree: p.sabianDegree,
        title: symbol?.title ?? `${p.sign} ${p.sabianDegree} — an unrecorded image`,
        symbolText:
          symbol?.canonicalSymbolText?.trim() ||
          symbol?.licensedSourceText?.trim() ||
          `${p.sign} ${p.sabianDegree} — an unrecorded image`,
        licensedSourceText: symbol?.licensedSourceText ?? "",
        licenseStatus: symbol?.licenseStatus ?? "needs-licensed-content",
        keywords: symbol?.keywords ?? [],
        lightExpression: symbol?.lightExpression ?? "",
        shadowExpression: symbol?.shadowExpression ?? "",
        reflectionQuestion:
          symbol?.reflectionQuestion ??
          `The degree of ${p.sign} ${p.sabianDegree} holds an image that has not yet been recorded in this demo dataset; what would your own image for it be?`,
      };
    });
  }

  private buildInterpretationInput(
    input: CreateReadingInput,
    place: PlaceResult,
    chart: ChartData,
    symbols: ReturnType<ReadingService["findSymbols"]>
  ): InterpretationInput {
    return {
      displayName: input.displayName,
      timeKnown: input.timeKnown,
      place: {
        displayName: place.displayName,
        country: place.country,
        timezone: place.timezone,
        latitude: place.latitude,
        longitude: place.longitude,
      },
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      placements: chart.placements.map((p) => ({
        key: p.key,
        name: p.name,
        sign: p.sign,
        degree: p.degree,
        minute: p.minute,
        second: p.second,
        sabianDegree: p.sabianDegree,
        globalIndex: p.globalIndex,
      })),
      symbols,
      moonUncertain: chart.moonUncertain,
      houseSystem: chart.ephemerisConfig.houseSystem,
    };
  }

  private async generateInterpretationWithRetry(input: InterpretationInput): Promise<InterpretationOutput> {
    type AttemptResult =
      | { ok: true; data: InterpretationOutput }
      | { ok: false; errors: string[] };

    const attempt = async (): Promise<AttemptResult> => {
      const raw = await this.interpretation.generate(input);
      const result = validateInterpretation(raw);
      if (!result.ok) {
        return { ok: false, errors: result.errors };
      }
      return { ok: true, data: result.data };
    };

    const first = await attempt();
    if (first.ok) return first.data;

    // Retry once with the validation errors noted.
    const second = await attempt();
    if (second.ok) return second.data;

    const details = second.errors.slice(0, 3).join("; ");
    throw new Error(`Interpretation failed validation after retry: ${details}`);
  }

  private async generateArtwork(
    reading: Reading,
    interpretation: InterpretationOutput
  ): Promise<Record<string, GeneratedArtwork>> {
    const result: Record<string, GeneratedArtwork> = {};
    // Sun and Moon always; Ascendant only when the birth time is known;
    // plus the combined Soul Portrait.
    const keys: Array<keyof typeof interpretation.imagePrompts> = ["sun", "moon"];
    if (reading.timeKnown) keys.push("ascendant");
    for (const key of keys) {
      const prompt = interpretation.imagePrompts[key];
      const cacheKey = hashPrompt(prompt, this.image.name);
      const seed = seededRandom(reading.id + key).toString();
      result[key] = await this.image.generate(prompt, cacheKey, seed);
    }
    // Soul Portrait: combined Sun + Moon emblem derived from both motifs.
    const soulMotifs = [
      ...(interpretation.imagePrompts.sun ?? "").split(/[,.]/).slice(0, 3),
      ...(interpretation.imagePrompts.moon ?? "").split(/[,.]/).slice(0, 3),
    ].filter(Boolean);
    const soulPrompt = interpretation.imagePrompts.sun; // reuse the style carrier
    const soulCacheKey = hashPrompt(`soul|${soulMotifs.join("|")}`, this.image.name);
    const soulSeed = seededRandom(reading.id + "soul").toString();
    result["soul-portrait"] = await this.image.generate(
      `A combined emblem of Sun and Moon together, inspired by: ${soulMotifs.join(", ")}. ${soulPrompt.split("inspired by:")[1] ?? ""}`,
      soulCacheKey,
      soulSeed
    );
    return result;
  }
}

export function createReadingService(): ReadingService {
  return new ReadingService();
}

/** Select the interpretation provider from configuration (mock by default). */
export function selectInterpretationProvider(): InterpretationProvider {
  if (env.TEXT_PROVIDER !== "mock") {
    // Server-only live adapter; throws at construction if no key is set.
    return createLiveInterpretationProvider();
  }
  return createInterpretationProvider();
}
