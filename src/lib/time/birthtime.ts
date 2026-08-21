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
 *
 * DST integrity:
 *  - Gap times (spring-forward: a wall-clock time that never existed) are
 *    detected and rejected — never silently shifted.
 *  - Overlap times (fall-back: a wall-clock time that occurred twice) are
 *    detected as ambiguous; the caller must disambiguate by choosing an
 *    explicit offset, or we return the FIRST (daylight) occurrence with a
 *    clearly disclosed choice.
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
  /** "gap" (never existed), "overlap" (occurred twice), or "unique". */
  dstKind: "gap" | "overlap" | "unique";
  /** For overlaps: the two candidate UTC instants (offset-disambiguated). */
  overlapChoices?: { utcIso: string; utcOffsetMinutes: number; offsetLabel: string; label: string }[];
  /** The offset choice made for an overlap (daylight or standard). */
  overlapChosenLabel?: string;
}

const BirthLocalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be HH:MM (24-hour)"),
});

/**
 * Strict calendar-date validation: rejects impossible dates (e.g. Feb 30)
 * by round-tripping through UTC — never relying on the server's local zone.
 */
export function isValidCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  if (y < 1600 || y > 2400) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function parseBirthLocal(input: { date: string; time: string }): {
  date: string;
  hour: number;
  minute: number;
} {
  const parsed = BirthLocalSchema.parse(input);
  if (!isValidCalendarDate(parsed.date)) {
    throw new Error(`Invalid calendar date: ${parsed.date}`);
  }
  const [hour, minute] = parsed.time.split(":").map(Number);
  return { date: parsed.date, hour, minute };
}

/**
 * Classify a local wall-clock time in a zone as unique, a DST gap (never
 * existed), or a DST overlap (occurred twice).
 *
 * Gap detection: parse strictly, convert to UTC, then round-trip back to
 * local; if the local wall time differs, the wall time never existed.
 *
 * Overlap detection: on the fall-back day the same wall clock time maps to
 * two UTC instants (one with the daylight offset, one with the standard
 * offset). We test both offsets explicitly: for each of the two candidate
 * offsets that bracket the transition, build the UTC instant and check that
 * it round-trips to the same local wall time. If two distinct instants
 * qualify, the wall time is ambiguous.
 */
export function classifyLocalTime(input: {
  date: string;
  time: string;
  timezone: string;
}): { kind: "gap" | "overlap" | "unique"; firstUtc?: string; secondUtc?: string } {
  const { date, time, timezone } = input;
  const zone = moment.tz.zone(timezone);
  if (!zone) throw new Error(`Unknown IANA time zone: ${timezone}`);

  // Gap check via round-trip.
  const local = moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", true, timezone);
  if (!local.isValid()) return { kind: "gap" };
  const utcGuess = local.clone().utc();
  const roundTrip = moment(utcGuess.toISOString()).tz(timezone).format("YYYY-MM-DD HH:mm");
  if (roundTrip !== `${date} ${time}`) return { kind: "gap" };

  // Overlap check: try the two offsets that could apply on this date.
  // moment-timezone exposes the transition via the zone's offsets at the
  // surrounding instants.
  const candidates: string[] = [];
  const seen = new Set<string>();
  const tryOffset = (offsetMinutes: number) => {
    const asUtc = moment
      .utc(`${date} ${time}`, "YYYY-MM-DD HH:mm")
      .subtract(offsetMinutes, "minutes")
      .toISOString();
    const back = moment(asUtc).tz(timezone).format("YYYY-MM-DD HH:mm");
    if (back === `${date} ${time}` && !seen.has(asUtc)) {
      seen.add(asUtc);
      candidates.push(asUtc);
    }
  };

  // Candidate offsets: the local parse's offset and one hour each side
  // (DST shifts are 1h in these zones), plus the zone's offsets that day.
  const baseOffset = local.utcOffset();
  const offsets = new Set<number>([baseOffset, baseOffset - 60, baseOffset + 60]);
  // Also include the zone's actual offsets for the surrounding 36h window.
  const probe = moment(utcGuess.toISOString());
  for (const t of [probe.clone().subtract(18, "hours"), probe.clone(), probe.clone().add(18, "hours")]) {
    const off = moment(t.toISOString()).tz(timezone).utcOffset();
    offsets.add(off);
  }
  for (const off of offsets) tryOffset(off);

  if (candidates.length > 1) {
    return { kind: "overlap", firstUtc: candidates[0], secondUtc: candidates[1] };
  }
  return { kind: "unique" };
}

/**
 * Convert a local birth wall-clock time to UTC using the HISTORICAL zone
 * offset, with explicit DST gap/overlap handling.
 *
 * - Gap: throws (the wall time never existed in that zone on that date).
 * - Overlap: returns the FIRST (daylight-saving) occurrence by default, with
 *   both candidates exposed via `overlapChoices` and the choice disclosed via
 *   `overlapChosenLabel`. The caller may force the standard-time occurrence
 *   by passing `overlapOffsetChoice: "standard"`.
 * - Unique: the single occurrence.
 */
export function localToUtc(
  input: {
    date: string;
    time: string;
    timezone: string;
    overlapOffsetChoice?: "daylight" | "standard";
  }
): ResolvedTime {
  const { date, time, timezone } = input;
  const zone = moment.tz.zone(timezone);
  if (!zone) {
    throw new Error(`Unknown IANA time zone: ${timezone}`);
  }
  if (!isValidCalendarDate(date)) {
    throw new Error(`Invalid calendar date: ${date}`);
  }

  const classified = classifyLocalTime({ date, time, timezone });
  if (classified.kind === "gap") {
    throw new Error(
      `The local time ${date} ${time} never existed in ${timezone} (DST spring-forward gap). ` +
        "Please choose a different time."
    );
  }

  const local = moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", true, timezone);
  if (!local.isValid()) {
    throw new Error(`Invalid local time ${date} ${time} for zone ${timezone}`);
  }

  if (classified.kind === "overlap" && classified.firstUtc && classified.secondUtc) {
    // Two candidate instants. Default: the first occurrence (daylight).
    const daylight = classified.firstUtc;
    const standard = classified.secondUtc;
    const chosen = input.overlapOffsetChoice === "standard" ? standard : daylight;
    const chosenOffset = moment(chosen).tz(timezone).utcOffset();
    return {
      utcIso: chosen,
      utcOffsetMinutes: chosenOffset,
      offsetLabel: formatOffset(chosenOffset),
      timezone,
      zoneKnown: true,
      dstKind: "overlap",
      overlapChoices: [
        { utcIso: daylight, utcOffsetMinutes: moment(daylight).tz(timezone).utcOffset(), offsetLabel: formatOffset(moment(daylight).tz(timezone).utcOffset()), label: "Daylight-saving occurrence (first)" },
        { utcIso: standard, utcOffsetMinutes: moment(standard).tz(timezone).utcOffset(), offsetLabel: formatOffset(moment(standard).tz(timezone).utcOffset()), label: "Standard-time occurrence (second)" },
      ],
      overlapChosenLabel:
        chosen === daylight ? "Daylight-saving occurrence (first)" : "Standard-time occurrence (second)",
    };
  }

  const utc = local.clone().utc();
  const offsetMinutes = local.utcOffset();
  return {
    utcIso: utc.toISOString(),
    utcOffsetMinutes: offsetMinutes,
    offsetLabel: formatOffset(offsetMinutes),
    timezone,
    zoneKnown: true,
    dstKind: "unique",
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

/**
 * Local calendar day boundaries in UTC for a given zone/date — used to scan
 * the Moon's motion over the ACTUAL local day, independent of the server's
 * timezone. Returns [startUtcIso, endUtcIso].
 */
export function localDayBoundsUtc(date: string, timezone: string): [string, string] {
  const start = unknownTimeUtc({ date, timezone });
  const end = localToUtc({ date, time: "23:59", timezone, overlapOffsetChoice: "standard" });
  return [start.utcIso, end.utcIso];
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
