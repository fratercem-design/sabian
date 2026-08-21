import { NextResponse } from "next/server";
import { z } from "zod";
import { createPlaceSearchProvider } from "@/lib/places/provider";
import { localToUtc, unknownTimeUtc, isValidCalendarDate } from "@/lib/time/birthtime";

export const runtime = "nodejs";

/**
 * GET /api/reading/review?date=&time=&timeKnown=&placeId=
 *
 * Deterministic pre-submission review: resolves the selected place, the
 * historical UTC offset, and the resulting UTC instant WITHOUT creating a
 * reading. The birth form shows this on the review step before generation.
 */
const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timeKnown: z.enum(["true", "false"]),
  placeId: z.string().min(1),
  overlapOffsetChoice: z.enum(["daylight", "standard"]).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    date: url.searchParams.get("date"),
    time: url.searchParams.get("time") ?? undefined,
    timeKnown: url.searchParams.get("timeKnown"),
    placeId: url.searchParams.get("placeId"),
    overlapOffsetChoice: url.searchParams.get("overlapOffsetChoice") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid review request", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 }
    );
  }

  if (!isValidCalendarDate(parsed.data.date)) {
    return NextResponse.json({ error: `Not a real calendar date: ${parsed.data.date}` }, { status: 400 });
  }
  if (parsed.data.timeKnown === "true" && !parsed.data.time) {
    return NextResponse.json({ error: "A birth time is required when the time is known" }, { status: 400 });
  }

  const provider = createPlaceSearchProvider();
  const place = await provider.getById(parsed.data.placeId);
  if (!place) {
    return NextResponse.json({ error: "Selected birthplace could not be resolved" }, { status: 400 });
  }

  try {
    if (parsed.data.timeKnown === "true") {
      const resolved = localToUtc({
        date: parsed.data.date,
        time: parsed.data.time!,
        timezone: place.timezone,
        overlapOffsetChoice: parsed.data.overlapOffsetChoice,
      });
      return NextResponse.json({
        place: {
          displayName: place.displayName,
          region: place.region,
          country: place.country,
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone,
        },
        utcIso: resolved.utcIso,
        utcOffsetMinutes: resolved.utcOffsetMinutes,
        offsetLabel: resolved.offsetLabel,
        dstKind: resolved.dstKind,
        overlapChoices: resolved.overlapChoices ?? null,
        overlapChosenLabel: resolved.overlapChosenLabel ?? null,
        timeKnown: true,
        timeNotation: null,
      });
    }
    const resolved = unknownTimeUtc({ date: parsed.data.date, timezone: place.timezone });
    return NextResponse.json({
      place: {
        displayName: place.displayName,
        region: place.region,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
      },
      // No actual UTC birth instant is known — the reference instant is
      // disclosed separately and never presented as the birth time.
      utcIso: null,
      referenceUtcIso: resolved.utcIso,
      utcOffsetMinutes: resolved.utcOffsetMinutes,
      offsetLabel: resolved.offsetLabel,
      dstKind: resolved.dstKind,
      timeKnown: false,
      timeNotation: "Solar midnight of the local calendar date (disclosed reference instant)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resolve this birth time";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
