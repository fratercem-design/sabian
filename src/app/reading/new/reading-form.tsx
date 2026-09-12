"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PlaceCombobox, type PlaceOption } from "@/components/reading/place-combobox";
import { Stepper, type StepDescriptor } from "@/components/reading/stepper";
import { ValidationSummary, type ValidationIssue } from "@/components/reading/validation-summary";
import { TechnicalReview, type ReviewData } from "@/components/reading/technical-review";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: StepDescriptor[] = [
  { n: 1, label: "Name", purpose: "How this reading should address you. Not used in any calculation." },
  { n: 2, label: "Birth date", purpose: "Anchors the positions of the Sun, Moon, and planets." },
  { n: 3, label: "Birth time", purpose: "Tell us how exact the recorded time is. We never assume one." },
  { n: 4, label: "Birthplace", purpose: "Resolves coordinates and the time zone that applied there on that date." },
  { n: 5, label: "Review", purpose: "Check the record, then decide whether to create the reading." },
];

const FIELD_ID = {
  name: "displayName",
  date: "birthDate",
  time: "birthTime",
  timeCertainty: "timeKnownYes",
  placeDisclosure: "placeDisclosureAck",
  place: "birthplace",
  processingConsent: "processingConsent",
} as const;

const INPUT_CLASS =
  "w-full min-h-[44px] rounded-lg border border-gold/25 bg-midnight-900 px-4 py-3 " +
  "text-parchment-100 placeholder:text-silver-mist focus:border-gold focus:outline-none";

const CHECKBOX_CLASS = "mt-0.5 h-5 w-5 shrink-0 accent-gold";

export default function ReadingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  /**
   * Birth-time certainty has NO default. `null` means the person has not yet
   * said whether the time is known; the form refuses to advance until they do,
   * and no placeholder time is ever stored or submitted.
   */
  const [timeKnown, setTimeKnown] = useState<boolean | null>(null);
  const [time, setTime] = useState("");

  /** Acknowledgement of the location-provider disclosure. Gates /api/places. */
  const [placeDisclosureAck, setPlaceDisclosureAck] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  /**
   * Consent to PROCESSING the birth details. Affirmed on the birthplace step,
   * which is strictly before /api/reading/review is ever called.
   */
  const [processingConsent, setProcessingConsent] = useState(false);

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [showIssues, setShowIssues] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const headingRef = useRef<HTMLElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  // Move focus to the current step heading after a step change, so keyboard
  // and screen-reader users land in the new content rather than at the top.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // Focus the error summary only after a failed attempt to advance or submit.
  useEffect(() => {
    if (showIssues && issues.length > 0) summaryRef.current?.focus();
  }, [showIssues, issues]);

  /**
   * Deterministic pre-submission review.
   *
   * INVARIANT: this request carries the full birth record, so it is issued
   * only when `processingConsent` is true. The consent checkbox lives on the
   * birthplace step and gates advancing to review, so by construction no
   * birth details reach /api/reading/review before the person has agreed.
   */
  useEffect(() => {
    if (step !== 5) return;
    if (!processingConsent) return;
    if (!selectedPlace || !date || timeKnown === null) return;
    if (timeKnown && !time) return;

    const controller = new AbortController();
    fetch("/api/reading/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        date,
        timeKnown,
        placeId: selectedPlace.id,
        ...(timeKnown && time ? { time } : {}),
      }),
    })
      .then(async (res) => {
        const raw = await res.text();
        if (controller.signal.aborted) return;
        if (!raw) {
          setReview(null);
          setReviewError("Could not resolve this birth time.");
          return;
        }
        let data: { error?: string } & ReviewData;
        try {
          data = JSON.parse(raw) as { error?: string } & ReviewData;
        } catch {
          setReview(null);
          setReviewError("Could not resolve this birth time.");
          return;
        }
        if (!res.ok) {
          setReview(null);
          setReviewError(data.error ?? "Could not resolve this birth time.");
          return;
        }
        setReview(data);
        setReviewError(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setReview(null);
        setReviewError("Could not resolve this birth time.");
      });

    return () => controller.abort();
  }, [step, processingConsent, date, time, timeKnown, selectedPlace]);

  const validateStep = useCallback((): ValidationIssue[] => {
    const found: ValidationIssue[] = [];
    if (step === 1 && !name.trim()) {
      found.push({ fieldId: FIELD_ID.name, message: "Enter a name or nickname for this reading." });
    }
    if (step === 2) {
      if (!date) {
        found.push({ fieldId: FIELD_ID.date, message: "Choose your birth date." });
      } else {
        const parsed = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
          found.push({ fieldId: FIELD_ID.date, message: "Choose a real calendar date in the past." });
        }
      }
    }
    if (step === 3) {
      if (timeKnown === null) {
        found.push({
          fieldId: FIELD_ID.timeCertainty,
          message: "Choose whether your birth time is known. We will not assume one.",
        });
      } else if (timeKnown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        found.push({
          fieldId: FIELD_ID.time,
          message: "Enter the recorded birth time in 24-hour HH:MM format.",
        });
      }
    }
    if (step === 4) {
      if (!placeDisclosureAck) {
        found.push({
          fieldId: FIELD_ID.placeDisclosure,
          message: "Acknowledge the place-search disclosure before searching.",
        });
      }
      if (!selectedPlace) {
        found.push({ fieldId: FIELD_ID.place, message: "Choose a birthplace from the search results." });
      }
      if (!processingConsent) {
        found.push({
          fieldId: FIELD_ID.processingConsent,
          message: "Consent to processing your birth details before we resolve them.",
        });
      }
    }
    if (step === 5 && reviewError) found.push({ message: reviewError });
    return found;
  }, [step, name, date, timeKnown, time, placeDisclosureAck, selectedPlace, processingConsent, reviewError]);

  const next = () => {
    const found = validateStep();
    if (found.length) {
      setIssues(found);
      setShowIssues(true);
      return;
    }
    setIssues([]);
    setShowIssues(false);
    setStep((s) => Math.min(5, s + 1) as Step);
  };

  const back = () => {
    setIssues([]);
    setShowIssues(false);
    setStep((s) => Math.max(1, s - 1) as Step);
  };

  const submit = async () => {
    const found = validateStep();
    if (found.length) {
      setIssues(found);
      setShowIssues(true);
      return;
    }
    if (!selectedPlace || timeKnown === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          birthDate: date,
          // Never a placeholder: when the time is unknown, no time is sent.
          birthTime: timeKnown ? time : undefined,
          timeKnown,
          overlapOffsetChoice:
            timeKnown && review?.dstKind === "overlap" && review.overlapChosenLabel?.match(/Standard/i)
              ? "standard"
              : "daylight",
          placeId: selectedPlace.id,
          consent: true,
        }),
      });
      const raw = await res.text();
      if (!res.ok || !raw) {
        throw new Error(
          raw
            ? `Server error ${res.status}: ${raw}`
            : `Server returned empty response (status ${res.status}).`
        );
      }
      let data: { reading?: { id: string }; error?: string };
      try {
        data = JSON.parse(raw) as { reading?: { id: string }; error?: string };
      } catch {
        throw new Error(`Server returned non-JSON response (status ${res.status}).`);
      }
      if (!data.reading) throw new Error(data.error ?? "Could not create your reading.");
      router.push(`/reading/${data.reading.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const stepHeading = (text: string) => (
    <legend
      ref={(node) => {
        if (node) headingRef.current = node;
      }}
      tabIndex={-1}
      className="font-display text-2xl font-medium text-parchment-100 focus-visible:outline-gold md:text-3xl"
    >
      {text}
    </legend>
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Stepper steps={STEPS} current={step} />

      {showIssues && <ValidationSummary ref={summaryRef} issues={issues} />}

      {submitError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-ember/60 bg-ember/10 p-4 text-[15px] text-parchment-200"
        >
          {submitError}
        </div>
      )}

      <div className="rounded-3xl border border-gold/20 bg-midnight-800/50 p-6 shadow-card md:p-10">
        {step === 1 && (
          <fieldset>
            {stepHeading("What should this reading call you?")}
            <p className="mt-3 text-[15px] leading-relaxed text-silver-moon">
              A nickname is perfectly welcome. The display name personalises the reading and is not
              used in any calculation.
            </p>
            <label htmlFor={FIELD_ID.name} className="mt-6 block text-sm font-medium text-gold-300">
              Name or nickname
            </label>
            <input
              id={FIELD_ID.name}
              type="text"
              className={`${INPUT_CLASS} mt-2`}
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alex"
              autoComplete="nickname"
            />
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            {stepHeading("When were you born?")}
            <p className="mt-3 text-[15px] leading-relaxed text-silver-moon">
              Your birth date anchors the positions of the Sun, Moon, and planets.
            </p>
            <label htmlFor={FIELD_ID.date} className="mt-6 block text-sm font-medium text-gold-300">
              Birth date
            </label>
            <input
              id={FIELD_ID.date}
              type="date"
              className={`${INPUT_CLASS} mt-2`}
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              aria-describedby={`${FIELD_ID.date}-hint`}
              onChange={(event) => setDate(event.target.value)}
            />
            <p id={`${FIELD_ID.date}-hint`} className="mt-2 text-[13px] text-silver-moon">
              Year, month, and day. Any calendar date in the past.
            </p>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset>
            {stepHeading("How exact is the recorded time?")}
            <p className="mt-3 text-[15px] leading-relaxed text-silver-moon">
              There is no default here, and nothing is assumed. An exact time lets us calculate the
              Ascendant, Midheaven, and houses. Without one we omit them rather than invent them.
            </p>
            <div className="mt-6 space-y-3" role="radiogroup" aria-label="Birth time certainty">
              <label
                className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-parchment-200 transition ${
                  timeKnown === true ? "border-gold bg-gold/10" : "border-gold/20 hover:border-gold/50"
                }`}
              >
                <input
                  id={FIELD_ID.timeCertainty}
                  type="radio"
                  name="timeKnown"
                  checked={timeKnown === true}
                  onChange={() => setTimeKnown(true)}
                  className="mt-1 h-5 w-5 shrink-0 accent-gold"
                />
                <span>
                  <span className="block font-medium text-parchment-100">I know my birth time</span>
                  <span className="block text-[13px] text-silver-moon">
                    Use the recorded hour and minute.
                  </span>
                </span>
              </label>

              {timeKnown === true && (
                <div className="pl-4">
                  <label htmlFor={FIELD_ID.time} className="block text-sm font-medium text-gold-300">
                    Recorded time
                  </label>
                  <input
                    id={FIELD_ID.time}
                    type="time"
                    className={`${INPUT_CLASS} mt-2 max-w-xs`}
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </div>
              )}

              <label
                className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-parchment-200 transition ${
                  timeKnown === false ? "border-gold bg-gold/10" : "border-gold/20 hover:border-gold/50"
                }`}
              >
                <input
                  id="timeKnownNo"
                  type="radio"
                  name="timeKnown"
                  checked={timeKnown === false}
                  onChange={() => {
                    setTimeKnown(false);
                    setTime("");
                  }}
                  className="mt-1 h-5 w-5 shrink-0 accent-gold"
                />
                <span>
                  <span className="block font-medium text-parchment-100">I don&apos;t know it</span>
                  <span className="block text-[13px] text-silver-moon">
                    Angles and houses will be omitted rather than invented.
                  </span>
                </span>
              </label>

              {timeKnown === false && (
                <p className="rounded-xl border border-gold/20 bg-midnight-900/60 px-4 py-3 text-[15px] leading-relaxed text-silver-moon">
                  This is a complete reading, not a lesser one. The Sun, Moon, and planetary
                  placements stay reliable; only the Ascendant, Midheaven, and houses are left out,
                  because those genuinely depend on the hour.
                </p>
              )}
            </div>
          </fieldset>
        )}

        {step === 4 && (
          <fieldset>
            {stepHeading("Where were you born?")}

            {/* Just-in-time disclosure, rendered and acknowledged BEFORE the
                first /api/places request can be issued. */}
            <div className="mt-6 rounded-2xl border border-gold/25 bg-midnight-900/60 p-5">
              <p className="text-sm font-semibold text-gold-300">Before you search</p>
              <p id="place-disclosure-copy" className="mt-2 text-[15px] leading-relaxed text-silver-moon">
                To find the correct timezone and coordinates, your place search is processed by our
                location service. It is not used for advertising. Only the text you type is sent —
                never your name, birth date, or birth time.
              </p>
              <label
                htmlFor={FIELD_ID.placeDisclosure}
                className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-3 py-1 text-[15px] text-parchment-200"
              >
                <input
                  id={FIELD_ID.placeDisclosure}
                  type="checkbox"
                  checked={placeDisclosureAck}
                  onChange={(event) => {
                    setPlaceDisclosureAck(event.target.checked);
                    if (!event.target.checked) setSelectedPlace(null);
                  }}
                  className={CHECKBOX_CLASS}
                />
                <span>I understand and want to search.</span>
              </label>
            </div>

            <div className="mt-6">
              <PlaceCombobox
                id={FIELD_ID.place}
                label="Birthplace"
                disabled={!placeDisclosureAck}
                selected={selectedPlace}
                onSelect={setSelectedPlace}
                describedBy="place-disclosure-copy"
              />
            </div>

            {/* Processing consent. This gates Continue, and therefore gates the
                /api/reading/review request that carries the full record. */}
            <label
              htmlFor={FIELD_ID.processingConsent}
              className="mt-8 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-gold/25 bg-midnight-900/60 p-5 text-[15px] leading-relaxed text-parchment-200"
            >
              <input
                id={FIELD_ID.processingConsent}
                type="checkbox"
                checked={processingConsent}
                onChange={(event) => setProcessingConsent(event.target.checked)}
                className={CHECKBOX_CLASS}
              />
              <span>
                I consent to processing my birth date, time, and place to calculate my chart and
                resolve the exact time zone. Nothing is stored yet — the next step shows what was
                resolved, and you decide whether to create the reading.
              </span>
            </label>
          </fieldset>
        )}

        {step === 5 && (
          <fieldset>
            {stepHeading("Review your birth record")}
            <p className="mt-3 text-[15px] leading-relaxed text-silver-moon">
              This is what we resolved from what you told us. Nothing has been stored.
            </p>

            <dl className="mt-6 space-y-3 rounded-2xl border border-gold/20 bg-midnight-900/60 p-5 text-[15px]">
              <div className="flex justify-between gap-4">
                <dt className="text-silver-moon">Name</dt>
                <dd className="text-right font-medium text-parchment-100">{name.trim()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-silver-moon">Birth date</dt>
                <dd className="text-right font-medium text-parchment-100">{date}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-silver-moon">Birth time</dt>
                <dd className="text-right font-medium text-parchment-100">
                  {timeKnown ? `${time} (local)` : "Unknown — time-independent placements only"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-silver-moon">Birthplace</dt>
                <dd className="text-right font-medium text-parchment-100">
                  {selectedPlace?.displayName}
                  {selectedPlace &&
                    [selectedPlace.region, selectedPlace.country].filter(Boolean).length > 0 && (
                      <span className="block text-[13px] font-normal text-silver-moon">
                        {[selectedPlace.region, selectedPlace.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-silver-moon">Time zone</dt>
                <dd className="text-right font-medium text-parchment-100">
                  {review?.place.timezone ?? selectedPlace?.timezone}
                </dd>
              </div>
            </dl>

            {!review && !reviewError && (
              <p className="mt-4 text-[15px] text-silver-moon" role="status">
                Resolving the exact time zone…
              </p>
            )}

            {reviewError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-ember/60 bg-ember/10 p-4 text-[15px] text-parchment-200"
              >
                {reviewError}
              </div>
            )}

            {review && <TechnicalReview review={review} />}
          </fieldset>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" onClick={back} className={step === 1 ? "invisible" : ""}>
            Back
          </Button>
          {step < 5 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={submitting || !review}>
              {submitting ? "Creating your reading…" : "Create My Reading"}
            </Button>
          )}
        </div>

        {step === 5 && (
          <p className="mt-5 text-[13px] leading-relaxed text-silver-moon">
            Creating the reading stores this record under a private, high-entropy identifier for the
            retention period described in the{" "}
            <Link
              href="/privacy"
              className="inline-block min-h-[24px] py-0.5 text-gold-300 underline underline-offset-4 hover:text-gold-400"
            >
              privacy statement
            </Link>
            . There is a visible Delete reading action on every reading page, and deleting it
            removes the stored birth data immediately.
          </p>
        )}
      </div>
    </div>
  );
}
