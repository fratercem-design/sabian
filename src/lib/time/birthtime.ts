/**
 * Birthplace time-zone resolution and local→UTC conversion.
 *
 * The rule for a natal chart: convert the LOCAL birth wall-clock time at the
 * BIRTHPLACE on the BIRTH DATE using the HISTORICAL UTC offset that applied
 * in that time zone on that date — never the person's current offset, and
 * never today's rules.
 *
 * moment-timezone ships the full IANA tz database, which includes historical
 * LMT (local mean time) offsets, DST transitions, and zone redefinitions back
 * to the 19th century. That gives us the correct historical offset for
 * virtually any birthplace/date in the database (license: MIT).
 */

import moment from "moment-timezone";
import { z } from "zod";
import type { PlaceResult } from "@/lib/types";

export interface ResolvedTime {
  /** The exact UTC instant (ISO 8601). */
  utcIso: string;
  /** Historical UTC offset in minutes at the birthplace on the birth date. */
  utcOffsetMinutes: number;
  /** Offset label for display, e.g. "+02:00 (CEST, historical)". */
  offsetLabel: string;
  /** IANA time-zone identifier. */
  timezone: string;
  /** Whether the zone database has an entry for this place/date. */
  zoneKnown: boolean;
}

const BirthLocalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be HH:MM (24-hour)"),
});

export function parseBirthLocal(input: { date: string; time: string }): {
  date: string;
  hour: number;
  minute: number;
} {
  const parsed = BirthLocalSchema.parse(input);
  const [hour, minute] = parsed.time.split(":").map(Number);
  return { date: parsed.date, hour, minute };
}

/**
 * Convert a local birth wall-clock time to UTC using the HISTORICAL zone
 * offset. moment-timezone's `.tz()` with the IANA zone resolves the offset
 * that was actually in effect on that date (including DST and historical
 * redefinitions). We use a fully specified local time string so the library
 * cannot apply "today's" rules.
 */
export function localToUtc(input: { date: string; time: string; timezone: string }): ResolvedTime {
  const { date, time, timezone } = input;
  const zone = moment.tz.zone(timezone);
  if (!zone) {
    throw new Error(`Unknown IANA time zone: ${timezone}`);
  }
  const local = moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", true, timezone);
  if (!local.isValid()) {
    throw new Error(`Invalid local time ${date} ${time} for zone ${timezone}`);
  }
  const utc = local.clone().utc();
  const offsetMinutes = local.utcOffset();
  return {
    utcIso: utc.toISOString(),
    utcOffsetMinutes: offsetMinutes,
    offsetLabel: formatOffset(offsetMinutes),
    timezone,
    zoneKnown: true,
  };
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Validate that a timezone identifier is a real IANA zone.
 */
export function isValidTimezone(timezone: string): boolean {
  return moment.tz.zone(timezone) !== null;
}

/**
 * UTC instant used when the birth time is UNKNOWN: solar midnight of the
 * local calendar date, converted with the historical offset. This is a
 * disclosed reference instant — date-anchored placements (Sun, planets,
 * Moon) are computed from it, while Ascendant/Midheaven/houses are never
 * derived from it. Never presented as the actual birth time.
 */
export function unknownTimeUtc(input: { date: string; timezone: string }): ResolvedTime {
  return localToUtc({ date: input.date, time: "00:00", timezone: input.timezone });
}

export function localDateOnlyForTimezone(utcIso: string, timezone: string): string {
  return moment(utcIso).tz(timezone).format("YYYY-MM-DD");
}

/** Lightweight server-side place index used by the deterministic PlaceSearchProvider. */
export interface IndexedPlace extends PlaceResult {
  /** Precomputed searchable strings (lowercased). */
  search: string;
  /** Population rank for ordering (larger = more prominent). */
  rank: number;
}

export function indexPlaces(places: PlaceResult[]): IndexedPlace[] {
  return places.map((p, i) => ({
    ...p,
    search: [p.displayName, p.region, p.country].filter(Boolean).join(" ").toLowerCase(),
    rank: places.length - i,
  }));
}

export { moment };
