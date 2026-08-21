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
    expect(Object.keys(reading.artwork!)).toEqual(["sun", "moon", "ascendant"]);
    expect(reading.artwork!.sun.source).toBe("placeholder");
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
    expect(reading.artwork!.ascendant.source).toBe("placeholder");
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
});
