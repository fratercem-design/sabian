/**
 * Live image-provider adapter (Task 6) — server-only, provider-agnostic.
 *
 * READY but NOT wired with credentials. Implements the same
 * ImageGenerationProvider interface as the mock (generate(prompt, cacheKey,
 * seed)) so the reading service can switch providers without changing the
 * orchestration:
 *  - the service builds sanitized prompts for Sun, Moon, Ascendant (when the
 *    birth time is known) and a combined Soul Portrait via buildImagePrompt,
 *  - prompts contain ONLY structured, verified visual motifs + the shared
 *    style — never the visitor's name, birthplace, or any birth information
 *    beyond the symbolic material,
 *  - one failed image is retried WITHOUT regenerating the whole reading,
 *  - prompt-hash caching (the cache key is a hash of the prompt + provider,
 *    no personal data),
 *  - provenance metadata (exact prompt, provider, model, status, time,
 *    asset id) attached to every artwork.
 *
 * The mock provider remains the default and is used by automated tests.
 */

/* Server-only module. Never imported from client components. */

import { env } from "@/lib/config";
import { createArtCache } from "@/lib/art/art-cache";
import { SHARED_VISUAL_STYLE, type ImageGenerationProvider } from "@/lib/image/provider";
import type { GeneratedArtwork } from "@/lib/types";

export type ImageKind = "sun" | "moon" | "ascendant" | "soul-portrait";

export interface LiveImageResult {
  imageUrl: string;
  assetId?: string;
}

type HttpClient = (url: string, init: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 1;

/**
 * Build a sanitized image prompt from verified motif data. Only symbolic
 * material and style are included — never the visitor's name or birthplace.
 */
export function buildImagePrompt(kind: ImageKind, motifs: string[], title: string): string {
  const subject =
    kind === "soul-portrait"
      ? "a combined emblem of the Sun and Moon together"
      : kind === "ascendant"
        ? "the threshold motif"
        : `the ${kind} motif`;
  const motifText = motifs.length ? motifs.join(", ") : title;
  return `A symbolic celestial painting of ${subject}, inspired by: ${motifText}. ${SHARED_VISUAL_STYLE}`;
}

export class LiveImageGenerationProvider implements ImageGenerationProvider {
  readonly name: string;

  constructor(
    private opts: {
      apiKey?: string;
      model?: string;
      timeoutMs?: number;
      fetchImpl?: HttpClient;
      provider?: string;
    } = {}
  ) {
    this.providerId = opts.provider ?? env.IMAGE_PROVIDER;
    this.name = `live (${this.providerId})`;
    this.apiKey = opts.apiKey ?? env.IMAGE_API_KEY;
    this.model = opts.model ?? env.IMAGE_MODEL;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
    this.cache = createArtCache();
  }

  private providerId: string;
  private apiKey: string | undefined;
  private model: string | undefined;
  private timeoutMs: number;
  private fetchImpl: HttpClient;
  private cache: ReturnType<typeof createArtCache>;

  /** Generate one artwork with prompt-hash caching and one retry. */
  async generate(prompt: string, cacheKey: string, _seed: string): Promise<GeneratedArtwork> {
    if (!this.apiKey) {
      throw new Error(
        `IMAGE_PROVIDER=${env.IMAGE_PROVIDER} is selected but IMAGE_API_KEY is not set. ` +
          "No live image generation can run without credentials."
      );
    }
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.callImageApi(prompt);
        const artwork: GeneratedArtwork = {
          key: cacheKey,
          imageUrl: result.imageUrl,
          source: "generated",
          altText: "AI-generated symbolic artwork",
          prompt,
          provenance: {
            prompt,
            provider: this.providerId,
            model: this.model,
            status: "generated",
            createdAt: new Date().toISOString(),
            assetId: result.assetId,
          },
        };
        this.cache.set(cacheKey, artwork);
        return artwork;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // One retry for a single failed image (never regenerates the whole reading).
      }
    }
    throw lastError ?? new Error("Live image generation failed");
  }

  private async callImageApi(prompt: string): Promise<LiveImageResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const provider = this.providerId;
      let url: string;
      let body: unknown;
      if (provider === "openai") {
        url = "https://api.openai.com/v1/images/generations";
        body = { model: this.model ?? "gpt-image-1", prompt, n: 1, size: "1024x1024" };
      } else if (provider === "replicate") {
        url = "https://api.replicate.com/v1/predictions";
        body = { version: this.model, input: { prompt } };
      } else {
        throw new Error(`Unsupported IMAGE_PROVIDER: ${provider}`);
      }
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(provider === "openai"
            ? { Authorization: `Bearer ${this.apiKey!}` }
            : { Authorization: `Token ${this.apiKey!}` }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Live image provider HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const data = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }>; output?: string[] };
      const url0 = data.data?.[0]?.url ?? data.data?.[0]?.b64_json;
      const url1 = data.output?.[0];
      const imageUrl = url0 ?? url1 ?? "";
      if (!imageUrl) throw new Error("Live image provider returned no image");
      return { imageUrl, assetId: undefined };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Live image provider timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createLiveImageGenerationProvider(): LiveImageGenerationProvider {
  return new LiveImageGenerationProvider();
}
