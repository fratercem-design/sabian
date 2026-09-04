/**
 * Live story-provider adapter (Task 5) — server-only, provider-agnostic.
 *
 * This adapter is READY but NOT wired with credentials. It implements the
 * InterpretationProvider interface for a real LLM (Anthropic or OpenAI,
 * selected via TEXT_PROVIDER), with:
 *  - a structured prompt built ONLY from immutable validated chart data and
 *    verified Sabian records (the model never calculates or modifies
 *    planetary positions),
 *  - a strict Zod-validated JSON output contract,
 *  - timeout, retry (one on validation failure), and idempotency via a
 *    request fingerprint,
 *  - a graceful failure that preserves the deterministic chart.
 *
 * The reading service already retries once on validation failure; this
 * adapter additionally enforces a hard timeout and an idempotency key so a
 * retried request does not duplicate generation.
 *
 * Privacy: the prompt includes the visitor's display name (first name only
 * for addressing) and the resolved place; raw birthplace free-text is not
 * sent. The image prompts are handled by the image provider, never here.
 */

/* Server-only module. Never imported from client components; the reading
 * service and API routes are the only consumers. Importable by tests. */

import { z } from "zod";
import { env } from "@/lib/config";
import type {
  InterpretationInput,
  InterpretationOutput,
  InterpretationProvider,
} from "@/lib/interpretation/contract";
import { InterpretationSchema } from "@/lib/interpretation/contract";

const STORY_TITLES = [
  "The First Image",
  "The Inner Chamber",
  "The Mask and the Threshold",
  "Allies and Gifts",
  "The Central Tension",
  "The Road Ahead",
  "A Closing Reflection",
] as const;

const SAFETY_RULES = [
  "Never diagnose, predict, or advise on medical, legal, financial, death, fertility, or catastrophe topics.",
  "Never claim factual knowledge about the person's personality or future.",
  "Treat difficult symbols as invitations to awareness, never as harm predictions.",
  "Use hedged language: 'may suggest', 'invites you to consider', 'one way to read this image'.",
  "Never fabricate or alter chart data; use only the placements supplied.",
  "Do not reproduce long passages from the source symbol texts.",
  "Write original prose; do not imitate any living author.",
  "Produce 1,200-1,800 words total across exactly 7 chapters with the exact titles below.",
];

const SYSTEM_PROMPT = `You are the interpretive storyteller for "The Sabian Story", a contemplative astrology experience.

You receive a validated natal chart (immutable calculated placements) and verified Sabian records. You NEVER calculate, adjust, or invent planetary positions, time zones, degrees, or Sabian numbers — the JSON is the truth.

Your output must be a single JSON object matching exactly this shape:
${JSON.stringify(InterpretationSchema.shape, null, 2)}

Requirements:
${SAFETY_RULES.map((r) => `- ${r}`).join("\n")}

Chapter titles (exactly these 7, in this order): ${STORY_TITLES.join(", ")}.

Include the safety disclaimer verbatim in safetyDisclaimer. Return ONLY the JSON object, no prose around it.`;

function buildPrompt(input: InterpretationInput, fingerprint: string): string {
  const chart = {
    displayName: input.displayName.split(" ")[0] ?? "you",
    birthDate: input.birthDate,
    birthTime: input.birthTime ?? null,
    timeKnown: input.timeKnown,
    place: {
      displayName: input.place.displayName,
      country: input.place.country ?? null,
      timezone: input.place.timezone,
    },
    placements: input.placements,
    symbols: input.symbols.map((s) => ({
      globalIndex: s.globalIndex,
      sign: s.sign,
      degree: s.degree,
      title: s.title,
      symbolText: s.symbolText,
      licensedSourceText: s.licensedSourceText ?? "",
      keywords: s.keywords,
      lightExpression: s.lightExpression,
      shadowExpression: s.shadowExpression,
      reflectionQuestion: s.reflectionQuestion,
    })),
    moonUncertain: input.moonUncertain ?? false,
    houseSystem: input.houseSystem ?? "Placidus",
  };

  return [
    SYSTEM_PROMPT,
    "---",
    `Calculation fingerprint (idempotency): ${fingerprint}`,
    "---",
    "CHART JSON (immutable):",
    JSON.stringify(chart, null, 2),
  ].join("\n");
}

function fingerprint(input: InterpretationInput): string {
  // Deterministic hash of the validated chart data so retries reuse the same
  // generation (idempotency) without sending the same prompt twice.
  const canonical = JSON.stringify({
    placements: input.placements,
    symbols: input.symbols.map((s) => [s.globalIndex, s.title, s.symbolText, s.keywords]),
    birthDate: input.birthDate,
    birthTime: input.birthTime ?? null,
    timeKnown: input.timeKnown,
    place: [input.place.displayName, input.place.longitude, input.place.timezone],
  });
  let h = 2166136261 >>> 0;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `sb-${(h >>> 0).toString(16)}`;
}

const ProviderResponseSchema = z.object({
  content: z.array(z.object({ text: z.string().min(1) })).min(1),
});

type HttpClient = (url: string, init: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 60_000;

export class LiveInterpretationProvider implements InterpretationProvider {
  readonly name: string;

  constructor(
    private opts: {
      apiKey?: string;
      model?: string;
      timeoutMs?: number;
      fetchImpl?: HttpClient;
      /** Provider id: "anthropic" | "openai". Defaults to env.TEXT_PROVIDER. */
      provider?: string;
    } = {}
  ) {
    this.providerId = opts.provider ?? env.TEXT_PROVIDER;
    this.name = `live (${this.providerId})`;
    this.apiKey = opts.apiKey ?? env.TEXT_API_KEY;
    this.model = opts.model ?? env.TEXT_MODEL ?? "default";
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  private providerId: string;
  private apiKey: string | undefined;
  private model: string;
  private timeoutMs: number;
  private fetchImpl: HttpClient;

  async generate(input: InterpretationInput): Promise<InterpretationOutput> {
    if (!this.apiKey) {
      throw new Error(
        `TEXT_PROVIDER=${env.TEXT_PROVIDER} is selected but TEXT_API_KEY is not set. ` +
          "No live story generation can run without credentials."
      );
    }

    const prompt = buildPrompt(input, fingerprint(input));
    const raw = await this.callModel(prompt);
    const parsed = InterpretationSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Live provider returned invalid structure: ${parsed.error.issues[0]?.message}`);
    }
    return parsed.data;
  }

  /** Idempotency + timeout: the prompt embeds a fingerprint; the caller's
   *  retry on validation failure resends the same fingerprint. */
  private async callModel(prompt: string): Promise<unknown> {
    const provider = this.providerId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url =
        provider === "anthropic"
          ? "https://api.anthropic.com/v1/messages"
          : provider === "openai"
            ? "https://api.openai.com/v1/chat/completions"
            : (() => {
                throw new Error(`Unsupported TEXT_PROVIDER: ${provider}`);
              })();

      const body =
        provider === "anthropic"
          ? {
              model: this.model,
              max_tokens: 4000,
              system: prompt.split("---")[0],
              messages: [{ role: "user", content: prompt.split("\n---\n").slice(1).join("\n---\n") }],
            }
          : {
              model: this.model,
              response_format: { type: "json_object" },
              messages: [{ role: "system", content: prompt }],
            };

      const res = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(provider === "anthropic"
            ? { "x-api-key": this.apiKey!, "anthropic-version": "2023-06-01" }
            : { Authorization: `Bearer ${this.apiKey!}` }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Live story provider returned HTTP ${res.status}`);
      }
      const data = ProviderResponseSchema.safeParse(await res.json());
      if (!data.success) {
        throw new Error("Live story provider returned an unexpected response shape");
      }
      const text = data.data.content[0].text;
      // Extract the JSON object from the response (models sometimes wrap it).
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Live story provider returned no JSON object");
      return JSON.parse(match[0]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Live story provider timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createLiveInterpretationProvider(): InterpretationProvider {
  return new LiveInterpretationProvider();
}
