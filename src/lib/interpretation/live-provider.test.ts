import { describe, expect, it } from "vitest";
import { LiveInterpretationProvider } from "@/lib/interpretation/live-provider";
import { InterpretationSchema, type InterpretationInput } from "@/lib/interpretation/contract";

function sampleInput(): InterpretationInput {
  return {
    displayName: "Test Person",
    timeKnown: true,
    place: { displayName: "London", country: "UK", timezone: "Europe/London", latitude: 51.5, longitude: -0.12 },
    birthDate: "1990-06-15",
    birthTime: "14:30",
    placements: [
      { key: "sun", name: "Sun", sign: "Gemini", degree: 24, minute: 11, second: 0, sabianDegree: 25, globalIndex: 85 },
      { key: "moon", name: "Moon", sign: "Pisces", degree: 16, minute: 11, second: 0, sabianDegree: 17, globalIndex: 347 },
      { key: "ascendant", name: "Ascendant", sign: "Cancer", degree: 1, minute: 42, second: 0, sabianDegree: 2, globalIndex: 92 },
    ],
    symbols: [
      { globalIndex: 85, sign: "Gemini", degree: 25, title: "The Test Messenger", symbolText: "A messenger raises a lantern.", keywords: ["demo"], lightExpression: "", shadowExpression: "", reflectionQuestion: "" },
    ],
  };
}

function validOutput() {
  return {
    summary: "A reflective reading with enough words to pass the minimum length requirements.",
    coreThemes: ["emergence", "threshold", "recognition"],
    sun: {
      title: "Demo image for Gemini 25",
      placement: "Gemini 24°11′ — Sabian 25",
      symbol: "Demo image for Gemini 25 (Gemini 25)",
      interpretation: "The image invites a contemplative pause about conscious purpose and how it unfolds over time.",
      light: "Clarity of intent.",
      shadow: "Restless doubt.",
      reflectionQuestion: "Where is this image at work?",
    },
    moon: {
      title: "Demo image for Pisces 17",
      placement: "Pisces 16°11′ — Sabian 17",
      symbol: "Demo image for Pisces 17",
      interpretation: "The image speaks to emotional nature and the tides that move beneath the surface of the day.",
      light: "Gentle persistence.",
      shadow: "Over-identification.",
      reflectionQuestion: "What restores you?",
    },
    ascendant: {
      available: true,
      title: "Demo image for Cancer 2",
      placement: "Cancer 1°42′ — Sabian 2",
      symbol: "Demo image for Cancer 2",
      interpretation: "The threshold image describes how the world is first met and the doorway through which one steps.",
      light: "An open hand.",
      shadow: "Rigidity and fear.",
      reflectionQuestion: "Does the doorway still fit?",
    },
    planets: [
      {
        planet: "Mercury",
        sabianDegree: 6,
        sign: "Gemini",
        keywords: ["reflection", "threshold"],
        interpretation: "Mercury rests in Gemini 5° at the 6th degree; the image may suggest how this part of the nature seeks expression.",
        relationship: "Mercury adds a counterweight to the overall story.",
      },
    ],
    tensions: ["A tension between stillness and motion runs through the reading."],
    story: [
      { title: "The First Image", body: "A long opening chapter body that easily exceeds the twenty character minimum for this field." },
      { title: "The Inner Chamber", body: "A second chapter body that explores the emotional chamber and its tides with care and length." },
      { title: "The Mask and the Threshold", body: "A third chapter about thresholds and the doorways through which the world is met and known." },
      { title: "Allies and Gifts", body: "A fourth chapter introducing the quieter voices and the gifts they carry through the story." },
      { title: "The Central Tension", body: "A fifth chapter on the knot at the center of the story and the rhythm it generates over time." },
      { title: "The Road Ahead", body: "A sixth chapter about directions rather than destinations and the choices that remain the reader's." },
      { title: "A Closing Reflection", body: "A final chapter returning to the first image and closing the loop with gentleness and care." },
    ],
    journalPrompts: ["What image lingered longest?", "Where is the Sun theme alive?", "What would your symbols' place look like?"],
    groundingExercise: "A grounding exercise with enough words to satisfy the minimum length requirement for this field.",
    affirmation: "I am allowed to be an unfolding story.",
    imagePrompts: {
      sun: "A symbolic celestial painting of the Sun image with deep indigo and antique gold, no text.",
      moon: "A symbolic celestial painting of the Moon image with lunar silver, no text.",
      ascendant: "A threshold scene with celestial geometry, no text.",
    },
    safetyDisclaimer: "This reading is a reflective and entertainment exercise, not medical, legal, financial, or mental-health advice.",
  };
}

function fakeFetch(response: unknown, status = 200, delayMs = 0) {
  return async (_url: string, init: RequestInit) => {
    const signal = init.signal as AbortSignal | undefined;
    if (delayMs > 0) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, delayMs);
        signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(response),
      json: async () => response,
    } as unknown as Response;
  };
}

describe("LiveInterpretationProvider (Task 5)", () => {
  it("throws clearly when no API key is configured", async () => {
    const provider = new LiveInterpretationProvider({ provider: 'anthropic', apiKey: undefined, fetchImpl: fakeFetch({}) });
    await expect(provider.generate(sampleInput())).rejects.toThrow(/TEXT_API_KEY/);
  });

  it("validates a valid provider response into a typed output", async () => {
    const provider = new LiveInterpretationProvider({ provider: 'anthropic',
      apiKey: "test-key",
      fetchImpl: fakeFetch({ content: [{ text: JSON.stringify(validOutput()) }] }),
    });
    const out = await provider.generate(sampleInput());
    const parsed = InterpretationSchema.safeParse(out);
    expect(parsed.success).toBe(true);
    expect(out.story).toHaveLength(7);
    expect(out.story[0].title).toBe("The First Image");
  });

  it("rejects an invalid (unparseable) provider response", async () => {
    const provider = new LiveInterpretationProvider({ provider: 'anthropic',
      apiKey: "test-key",
      fetchImpl: fakeFetch({ content: [{ text: "not json at all" }] }),
    });
    await expect(provider.generate(sampleInput())).rejects.toThrow();
  });

  it("times out when the provider exceeds the timeout", async () => {
    const provider = new LiveInterpretationProvider({ provider: 'anthropic',
      apiKey: "test-key",
      timeoutMs: 50,
      fetchImpl: fakeFetch({ content: [{ text: JSON.stringify(validOutput()) }] }, 200, 500),
    });
    await expect(provider.generate(sampleInput())).rejects.toThrow(/timed out/i);
  });

  it("throws on non-OK HTTP status", async () => {
    const provider = new LiveInterpretationProvider({ provider: 'anthropic',
      apiKey: "test-key",
      fetchImpl: fakeFetch({ error: "rate limited" }, 429),
    });
    await expect(provider.generate(sampleInput())).rejects.toThrow(/HTTP 429/);
  });

  it("the prompt embeds an idempotency fingerprint (same input → same fingerprint)", async () => {
    // Verify via the deterministic fingerprint appearing in the request body.
    let sentBody = "";
    const provider = new LiveInterpretationProvider({ provider: 'anthropic',
      apiKey: "test-key",
      fetchImpl: async (_url, init) => {
        sentBody = String(init.body);
        return fakeFetch({ content: [{ text: JSON.stringify(validOutput()) }] })("", init);
      },
    });
    await provider.generate(sampleInput());
    expect(sentBody).toMatch(/Calculation fingerprint \(idempotency\): sb-/);
    expect(sentBody).toContain("A messenger raises a lantern.");
  });
});
