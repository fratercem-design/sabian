import { describe, expect, it } from "vitest";
import {
  PostgresReadingRepository,
  postgresRowToReading,
  type PostgresQueryable,
} from "@/lib/db/postgres-reading-repository";
import type { Reading } from "@/lib/types";

const READING: Reading = {
  id: "opaque-reading-id",
  createdAt: "2026-08-27T10:00:00.000Z",
  displayName: "Test",
  birthDate: "1990-06-15",
  birthTime: "14:30",
  timeKnown: true,
  place: {
    id: "london-uk",
    displayName: "London",
    country: "United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: "Europe/London",
  },
  chart: {
    utcIso: "1990-06-15T13:30:00.000Z",
    timeKnown: true,
    placements: [],
    ephemerisConfig: {
      ephemeris: "fixture",
      ephemerisLicense: "MIT",
      zodiac: "tropical",
      houseSystem: "placidus",
      obliquity: "fixture",
      deltaT: "fixture",
      northNodeConvention: "fixture",
    },
  },
  status: "ready",
  isDemo: true,
  saved: false,
  providers: { interpretation: "mock", image: "mock", symbolDatasetIsDemo: true },
};

class FakeDb implements PostgresQueryable {
  calls: Array<{ text: string; params: unknown[] }> = [];
  responses: Array<{ rows: unknown[]; rowCount: number | null }> = [];

  async query<T>(text: string, params: unknown[] = []) {
    this.calls.push({ text, params });
    return (this.responses.shift() ?? { rows: [], rowCount: 0 }) as {
      rows: T[];
      rowCount: number | null;
    };
  }
}

describe("PostgresReadingRepository", () => {
  it("inserts with numbered parameters and no visitor data interpolated into SQL", async () => {
    const db = new FakeDb();
    const repo = new PostgresReadingRepository(db);
    await repo.create(READING);
    expect(db.calls[0].text).toContain("$17");
    expect(db.calls[0].text).not.toContain(READING.displayName);
    expect(db.calls[0].params).toContain(READING.displayName);
    expect(db.calls[0].params).toContain(JSON.stringify(READING.chart));
  });

  it("maps PostgreSQL dates and JSONB objects back to the domain model", () => {
    const mapped = postgresRowToReading({
      id: READING.id,
      created_at: new Date(READING.createdAt),
      display_name: READING.displayName,
      birth_date: READING.birthDate,
      birth_time: READING.birthTime!,
      time_known: true,
      time_notation: null,
      place_id: READING.place.id,
      place_json: READING.place,
      chart_json: READING.chart,
      interpretation_json: null,
      artwork_json: null,
      providers_json: READING.providers,
      status: "ready",
      error: null,
      is_demo: true,
      saved: false,
    });
    expect(mapped).toEqual(READING);
  });

  it("uses RETURNING to distinguish successful save/delete from a missing id", async () => {
    const db = new FakeDb();
    db.responses.push({ rows: [{ id: READING.id }], rowCount: 1 });
    db.responses.push({ rows: [], rowCount: 0 });
    const repo = new PostgresReadingRepository(db);
    await expect(repo.markSaved(READING.id)).resolves.toBe(true);
    await expect(repo.delete("missing")).resolves.toBe(false);
    expect(db.calls[0].text).toContain("RETURNING id");
    expect(db.calls[1].text).toContain("RETURNING id");
  });

  it("delegates retention cleanup to the schema function", async () => {
    const db = new FakeDb();
    db.responses.push({ rows: [{ deleted_count: "7" }], rowCount: 1 });
    const repo = new PostgresReadingRepository(db);
    await expect(repo.cleanup(90)).resolves.toBe(7);
    expect(db.calls[0].params).toEqual([90]);
  });
});
