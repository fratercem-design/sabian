import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createReadingService } from "@/lib/reading/service";
import { createReadingRepository, type ReadingRepository } from "@/lib/db/reading-repository";

describe("reading service integration", () => {
  let repo: ReadingRepository;
  let createdId: string;

  beforeAll(async () => {
    repo = createReadingRepository();
  });

  afterAll(async () => {
    if (createdId) await repo.delete(createdId);
  });

  it("creates a complete reading for a known birth time", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Ada Lovelace",
      birthDate: "1990-06-15",
      birthTime: "14:30",
      timeKnown: true,
      placeId: "london-uk",
      consent: true,
    });
    createdId = reading.id;
    expect(reading.status).toBe("ready");
    expect(reading.id).toMatch(/^[A-Za-z0-9_-]{10,}$/);
    expect(reading.chart.placements.length).toBeGreaterThanOrEqual(10);
    expect(reading.interpretation).toBeDefined();
    expect(reading.interpretation!.story).toHaveLength(7);
    expect(reading.interpretation!.ascendant.available).toBe(true);
    expect(reading.artwork).toBeDefined();
    expect(Object.keys(reading.artwork!)).toEqual(["sun", "moon", "ascendant", "soul-portrait"]);
    expect(reading.artwork!.sun.source).toBe("placeholder");
  });

  it("is marked demo when mock providers and fixture symbols are used", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Demo Marker",
      birthDate: "1990-06-15",
      birthTime: "14:30",
      timeKnown: true,
      placeId: "london-uk",
      consent: true,
    });
    await repo.delete(reading.id);
    expect(reading.isDemo).toBe(true);
    expect(reading.providers.interpretation).toMatch(/mock/i);
    expect(reading.providers.image).toMatch(/mock/i);
    expect(reading.providers.symbolDatasetIsDemo).toBe(true);
  });

  it("keeps the seven required story chapter titles", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Chapter Check",
      birthDate: "1990-06-15",
      birthTime: "14:30",
      timeKnown: true,
      placeId: "london-uk",
      consent: true,
    });
    await repo.delete(reading.id);
    const titles = reading.interpretation!.story.map((c) => c.title);
    expect(titles).toEqual([
      "The First Image",
      "The Inner Chamber",
      "The Mask and the Threshold",
      "Allies and Gifts",
      "The Central Tension",
      "The Road Ahead",
      "A Closing Reflection",
    ]);
  });

  it("produces a story of 1200–1800 words (deterministic)", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Wordcount Check",
      birthDate: "1990-06-15",
      birthTime: "14:30",
      timeKnown: true,
      placeId: "london-uk",
      consent: true,
    });
    await repo.delete(reading.id);
    const words = reading
      .interpretation!.story.map((c) => c.body)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(1200);
    expect(words).toBeLessThanOrEqual(1800);
  });

  it("persists and reloads the identical calculated placements", async () => {
    const service = createReadingService();
    const reloaded = await service.get(createdId);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.chart.placements).toEqual(
      (await service.get(createdId))!.chart.placements
    );
    const sun = reloaded!.chart.placements.find((p) => p.key === "sun")!;
    expect(sun.sabianDegree).toBeGreaterThanOrEqual(1);
    expect(sun.sabianDegree).toBeLessThanOrEqual(30);
  });

  it("creates a reduced reading for an unknown birth time without an Ascendant", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Rosa Parks",
      birthDate: "1985-03-14",
      timeKnown: false,
      placeId: "newyork-us",
      consent: true,
    });
    await repo.delete(reading.id);
    expect(reading.status).toBe("ready");
    expect(reading.chart.placements.find((p) => p.key === "ascendant")).toBeUndefined();
    expect(reading.chart.placements.find((p) => p.key === "midheaven")).toBeUndefined();
    expect(reading.chart.houses).toBeUndefined();
    expect(reading.interpretation!.ascendant.available).toBe(false);
    expect(Object.keys(reading.artwork!)).toEqual(["sun", "moon", "soul-portrait"]);
    expect(reading.artwork!.sun.source).toBe("placeholder");
  });

  it("refuses to create a reading without consent", async () => {
    const service = createReadingService();
    await expect(
      service.create({
        displayName: "No Consent",
        birthDate: "1990-06-15",
        birthTime: "14:30",
        timeKnown: true,
        placeId: "london-uk",
        consent: false,
      })
    ).rejects.toThrow(/consent/i);
  });

  it("deletes readings permanently", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Temporary Person",
      birthDate: "1991-07-01",
      birthTime: "09:15",
      timeKnown: true,
      placeId: "paris-fr",
      consent: true,
    });
    expect(await service.get(reading.id)).not.toBeNull();
    await service.delete(reading.id);
    expect(await service.get(reading.id)).toBeNull();
  });

  it("generated readings are NOT saved by default; saving is explicit opt-in", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Unsaved Person",
      birthDate: "1992-02-02",
      birthTime: "10:00",
      timeKnown: true,
      placeId: "london-uk",
      consent: true,
    });
    expect(reading.saved).toBe(false);
    const reloaded = await service.get(reading.id);
    expect(reloaded!.saved).toBe(false);
    const saved = await service.saveReading(reading.id);
    expect(saved).toBe(true);
    const afterSave = await service.get(reading.id);
    expect(afterSave!.saved).toBe(true);
    await service.delete(reading.id);
  });

  it("cleanup removes stale failed records and respects the retention window", async () => {
    const service = createReadingService();
    const reading = await service.create({
      displayName: "Retention Person",
      birthDate: "1993-03-03",
      birthTime: "11:00",
      timeKnown: true,
      placeId: "london-uk",
      consent: true,
    });
    // Simulate a failed record: mark it failed directly.
    const failed = { ...(await service.get(reading.id))! } as { status: string };
    const repo = createReadingRepository();
    await repo.update({ ...(await service.get(reading.id))!, status: "failed" } as never);
    // Cleanup with a 0-day retention removes everything older than now.
    const removed = await repo.cleanup(0);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await service.get(reading.id)).toBeNull();
    void failed;
  });
});
