export interface ReviewData {
  place: {
    displayName: string;
    region?: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  utcIso: string | null;
  referenceUtcIso?: string;
  utcOffsetMinutes: number;
  offsetLabel: string;
  dstKind: "gap" | "overlap" | "unique";
  overlapChoices?:
    | { utcIso: string; utcOffsetMinutes: number; offsetLabel: string; label: string }[]
    | null;
  overlapChosenLabel?: string | null;
  timeKnown: boolean;
  timeNotation: string | null;
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-silver-moon">{term}</dt>
      <dd className="text-right font-medium text-parchment-100">{children}</dd>
    </div>
  );
}

/**
 * Progressive disclosure for the deterministic resolution evidence.
 *
 * The review step shows a human-readable summary; coordinates, the historical
 * UTC offset, the resolved UTC instant and provider provenance live here,
 * closed by default. Nothing is hidden — it is simply not the first thing a
 * person has to read.
 */
export function TechnicalReview({ review }: { review: ReviewData }) {
  return (
    <details className="mt-6 rounded-2xl border border-gold/25 bg-midnight-900/60">
      <summary className="flex min-h-[44px] cursor-pointer items-center px-5 py-3 text-sm font-medium text-gold-300">
        Technical details
      </summary>
      <div className="border-t border-gold/15 px-5 py-4 text-[15px]">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">
          Resolved before submission
        </p>
        <dl className="mt-3 space-y-2" aria-label="Resolved birth time details">
          <Row term="Canonical place">
            {review.place.displayName}
            <span className="block text-[13px] font-normal text-silver-moon">
              {[review.place.region, review.place.country].filter(Boolean).join(", ")}
            </span>
          </Row>
          <Row term="Coordinates">
            {review.place.latitude.toFixed(4)}°, {review.place.longitude.toFixed(4)}°
          </Row>
          <Row term="IANA time zone">{review.place.timezone}</Row>
          <Row term="Historical UTC offset">{review.offsetLabel}</Row>
          {review.timeKnown ? (
            <Row term="Resolved UTC instant">{review.utcIso}</Row>
          ) : (
            <>
              <Row term="Actual UTC birth instant">
                <span className="text-ember">Not known — no time was supplied</span>
              </Row>
              <Row term="Disclosed reference instant">{review.referenceUtcIso}</Row>
              <p className="text-[13px] leading-relaxed text-silver-moon">
                {review.timeNotation}. This reference instant is used only for date-anchored
                placements; the Ascendant, Midheaven, and houses are never derived from it.
              </p>
            </>
          )}
          {review.dstKind === "overlap" && review.overlapChosenLabel && (
            <p className="rounded-lg bg-gold/10 p-2 text-[13px] leading-relaxed text-gold-300">
              This local time occurred twice (daylight-saving fall-back). Using the{" "}
              {review.overlapChosenLabel}.
            </p>
          )}
        </dl>
        <p className="mt-4 border-t border-gold/15 pt-3 text-[13px] leading-relaxed text-silver-moon">
          Provenance: the birthplace, its coordinates and the historical time zone were resolved on
          the server from your selection. Chart calculation is always local and deterministic — no
          external provider performs the arithmetic.
        </p>
      </div>
    </details>
  );
}
