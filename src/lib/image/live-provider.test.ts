import { describe, expect, it, beforeEach } from "vitest";
import { LiveImageGenerationProvider, buildImagePrompt } from "@/lib/image/live-provider";
import { hashPrompt } from "@/lib/art/art-cache";

const SHARED = /no readable text, no logos, no watermarks/i;

function fakeFetch(response: unknown, status = 200, delayMs = 0, failOnce = false) {
  let calls = 0;
  return async (_url: string, init: RequestInit) => {
    calls++;
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
    if (failOnce && calls === 1) {
      return { ok: false, status: 500, text: async () => "boom" } as unknown as Response;
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(response),
      json: async () => response,
    } as unknown as Response;
  };
}

describe("buildImagePrompt (Task 6)", () => {
  it("includes the shared style and never personal data", () => {
    const prompt = buildImagePrompt("sun", ["a rising spark", "gold rays"], "Demo image for Aries 1");
    expect(prompt).toMatch(SHARED);
    expect(prompt).not.toMatch(/Avery|London|1990|51\.5/);
    expect(prompt).toMatch(/inspired by: a rising spark, gold rays/);
  });

  it("soul portrait uses a combined Sun-Moon emblem", () => {
    const prompt = buildImagePrompt("soul-portrait", ["tides", "light"], "x");
    expect(prompt).toMatch(/Sun and Moon together/);
  });
});

describe("LiveImageGenerationProvider (Task 6)", () => {
  beforeEach(() => {
    // Reset the shared art cache dir to a temp location for isolation.
    process.env.ART_CACHE_DIR = `${process.cwd()}/.tmp-test/live-image-cache`;
  });

  function generate(
    provider: LiveImageGenerationProvider,
    kind: "sun" | "moon" | "ascendant" | "soul-portrait",
    motifs: string[],
    title: string
  ) {
    const prompt = buildImagePrompt(kind, motifs, title);
    const cacheKey = hashPrompt(prompt, provider.name);
    return provider.generate(prompt, cacheKey, "test-seed");
  }

  it("throws clearly when no API key is configured", async () => {
    const provider = new LiveImageGenerationProvider({
      provider: "openai",
      apiKey: undefined,
      fetchImpl: fakeFetch({}),
    });
    await expect(generate(provider, "sun", ["motif"], "title")).rejects.toThrow(/IMAGE_API_KEY/);
  });

  it("generates and caches an artwork with provenance", async () => {
    const provider = new LiveImageGenerationProvider({
      provider: "openai",
      apiKey: "k",
      fetchImpl: fakeFetch({ data: [{ url: "https://img.example/x.png" }] }),
    });
    const art = await generate(provider, "sun", ["gold rays"], "Demo image for Aries 1");
    expect(art.source).toBe("generated");
    expect(art.imageUrl).toBe("https://img.example/x.png");
    expect(art.provenance?.provider).toBe("openai");
    expect(art.provenance?.status).toBe("generated");
    expect(art.provenance?.createdAt).toBeTruthy();
    expect(art.prompt).toMatch(SHARED);
    // Second call must hit the cache (same prompt hash) — no second HTTP call.
    const again = await generate(provider, "sun", ["gold rays"], "Demo image for Aries 1");
    expect(again.imageUrl).toBe(art.imageUrl);
  });

  it("retries ONE failed image without regenerating siblings", async () => {
    const fetchImpl = fakeFetch({ data: [{ url: "https://img.example/y.png" }] }, 200, 0, true);
    const provider = new LiveImageGenerationProvider({ provider: "openai", apiKey: "k", fetchImpl });
    const art = await generate(provider, "moon", ["silver"], "Demo image for Taurus 1");
    expect(art.imageUrl).toBe("https://img.example/y.png");
    expect(art.provenance?.status).toBe("generated");
  });

  it("times out when the provider exceeds the timeout", async () => {
    const provider = new LiveImageGenerationProvider({
      provider: "openai",
      apiKey: "k",
      timeoutMs: 50,
      fetchImpl: fakeFetch({ data: [{ url: "x" }] }, 200, 500),
    });
    await expect(generate(provider, "ascendant", ["door"], "t")).rejects.toThrow(/timed out/i);
  });

  it("throws on non-OK HTTP status", async () => {
    const provider = new LiveImageGenerationProvider({
      provider: "openai",
      apiKey: "k",
      fetchImpl: fakeFetch({ error: "nope" }, 400),
    });
    await expect(generate(provider, "sun", ["x"], "t")).rejects.toThrow(/HTTP 400/);
  });
});
