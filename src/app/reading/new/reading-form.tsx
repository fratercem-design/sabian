"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface PlaceOption {
  id: string;
  displayName: string;
  region?: string;
  country?: string;
  timezone: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Name" },
  { n: 2, label: "Birth date" },
  { n: 3, label: "Birth time" },
  { n: 4, label: "Birthplace" },
  { n: 5, label: "Review" },
];

export default function ReadingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [timeKnown, setTimeKnown] = useState(true);
  const [time, setTime] = useState("12:00");
  const [placeQuery, setPlaceQuery] = useState("");
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step !== 4) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!placeQuery.trim()) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(placeQuery.trim())}`);
        const data = (await res.json()) as { results: PlaceOption[] };
        setPlaces(data.results ?? []);
      } catch {
        setPlaces([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [placeQuery, step]);

  const validateStep = useCallback((): string[] => {
    const errs: string[] = [];
    if (step === 1 && !name.trim()) errs.push("Please tell us what to call you — a nickname is welcome.");
    if (step === 2) {
      if (!date) errs.push("Please choose your birth date.");
      else {
        const d = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(d.getTime()) || d > new Date()) errs.push("Please choose a valid date in the past.");
      }
    }
    if (step === 3) {
      if (timeKnown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errs.push("Please enter a valid time in 24-hour HH:MM format.");
    }
    if (step === 4 && !selectedPlace) errs.push("Please select a birthplace from the search results.");
    if (step === 5 && !consent) errs.push("Please consent to processing your birth information to continue.");
    return errs;
  }, [step, name, date, timeKnown, time, selectedPlace, consent]);

  const next = () => {
    const errs = validateStep();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setStep((s) => Math.min(5, s + 1) as Step);
  };

  const back = () => {
    setErrors([]);
    setStep((s) => Math.max(1, s - 1) as Step);
  };

  const submit = async () => {
    const errs = validateStep();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          birthDate: date,
          birthTime: timeKnown ? time : undefined,
          timeKnown,
          placeId: selectedPlace!.id,
          consent: true,
        }),
      });
      const data = (await res.json()) as { reading?: { id: string }; error?: string };
      if (!res.ok || !data.reading) {
        throw new Error(data.error ?? "Could not create your reading.");
      }
      router.push(`/reading/${data.reading.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gold/25 bg-midnight-900 px-4 py-3 text-parchment-100 placeholder:text-silver-mist focus:border-gold focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Step indicator */}
      <ol className="mb-10 flex items-center justify-between" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                step >= s.n ? "border-gold bg-gold/15 text-gold-300" : "border-silver-mist/40 text-silver-mist"
              }`}
              aria-current={step === s.n ? "step" : undefined}
            >
              {s.n}
            </span>
            <span className={`hidden text-sm sm:inline ${step >= s.n ? "text-parchment-200" : "text-silver-mist"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-gold/25 sm:w-10" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {/* Error summary */}
      {errors.length > 0 && (
        <div role="alert" className="mb-6 rounded-xl border border-ember/50 bg-ember/10 p-4">
          <h2 className="text-sm font-semibold text-ember">Please check the following:</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-parchment-200">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <div role="alert" className="mb-6 rounded-xl border border-ember/50 bg-ember/10 p-4 text-sm text-parchment-200">
          {submitError}
        </div>
      )}

      <div className="rounded-3xl border border-gold/20 bg-midnight-800/50 p-6 shadow-card md:p-10">
        {step === 1 && (
          <fieldset>
            <legend className="font-display text-2xl font-medium text-parchment-100">What shall we call you?</legend>
            <p className="mt-2 text-sm text-silver-moon">A nickname is perfectly welcome — this is how your story will address you.</p>
            <label htmlFor="name" className="mt-6 block text-sm font-medium text-gold-300">
              Display name
            </label>
            <input
              id="name"
              type="text"
              className={`${inputCls} mt-2`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoComplete="nickname"
            />
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend className="font-display text-2xl font-medium text-parchment-100">When were you born?</legend>
            <p className="mt-2 text-sm text-silver-moon">Your birth date anchors the positions of the Sun, Moon, and planets.</p>
            <label htmlFor="birthDate" className="mt-6 block text-sm font-medium text-gold-300">
              Birth date
            </label>
            <input
              id="birthDate"
              type="date"
              className={`${inputCls} mt-2`}
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </fieldset>
        )}

        {step === 3 && (
          <fieldset>
            <legend className="font-display text-2xl font-medium text-parchment-100">Your birth time</legend>
            <p className="mt-2 text-sm text-silver-moon">
              An exact time lets us calculate the Ascendant, Midheaven, and houses. Without it, we
              respectfully omit them.
            </p>
            <div className="mt-6 space-y-4">
              <label className="flex items-center gap-3 text-parchment-200">
                <input
                  type="radio"
                  name="timeKnown"
                  checked={timeKnown}
                  onChange={() => setTimeKnown(true)}
                  className="h-4 w-4 accent-gold"
                />
                I know my birth time
              </label>
              {timeKnown && (
                <div className="pl-7">
                  <label htmlFor="birthTime" className="block text-sm font-medium text-gold-300">
                    Exact local birth time
                  </label>
                  <input
                    id="birthTime"
                    type="time"
                    className={`${inputCls} mt-2 max-w-xs`}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              )}
              <label className="flex items-center gap-3 text-parchment-200">
                <input
                  type="radio"
                  name="timeKnown"
                  checked={!timeKnown}
                  onChange={() => setTimeKnown(false)}
                  className="h-4 w-4 accent-gold"
                />
                I don&apos;t know my exact birth time
              </label>
              {!timeKnown && (
                <p className="pl-7 text-sm text-silver-mist">
                  We will calculate only the placements that do not depend on the time of day, and
                  explain what an exact time would add.
                </p>
              )}
            </div>
          </fieldset>
        )}

        {step === 4 && (
          <fieldset>
            <legend className="font-display text-2xl font-medium text-parchment-100">Where were you born?</legend>
            <p className="mt-2 text-sm text-silver-moon">
              We resolve your birthplace to coordinates and the historical time zone that applied
              there on your birth date.
            </p>
            <label htmlFor="placeQuery" className="mt-6 block text-sm font-medium text-gold-300">
              Search for your birthplace
            </label>
            <input
              id="placeQuery"
              type="search"
              className={`${inputCls} mt-2`}
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Type a city, e.g. London"
              autoComplete="off"
            />
            {searching && <p className="mt-3 text-sm text-silver-mist">Searching…</p>}
            {places.length > 0 && (
              <ul className="mt-4 space-y-2" aria-label="Place search results">
                {places.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlace(p)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        selectedPlace?.id === p.id
                          ? "border-gold bg-gold/10"
                          : "border-gold/20 bg-midnight-900 hover:border-gold/50"
                      }`}
                    >
                      <span className="block font-medium text-parchment-100">{p.displayName}</span>
                      <span className="block text-sm text-silver-mist">
                        {[p.region, p.country].filter(Boolean).join(", ")} · {p.timezone}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {places.length === 0 && placeQuery.trim() && !searching && (
              <p className="mt-3 text-sm text-silver-mist">
                No matching places in the demo index. Try &ldquo;London&rdquo;, &ldquo;New York&rdquo;, or &ldquo;Tokyo&rdquo;.
              </p>
            )}
          </fieldset>
        )}

        {step === 5 && (
          <fieldset>
            <legend className="font-display text-2xl font-medium text-parchment-100">Review your birth record</legend>
            <dl className="mt-6 space-y-3 rounded-2xl border border-gold/20 bg-midnight-900/60 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-silver-mist">Name</dt>
                <dd className="text-right font-medium text-parchment-100">{name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-silver-mist">Birth date</dt>
                <dd className="text-right font-medium text-parchment-100">{date}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-silver-mist">Birth time</dt>
                <dd className="text-right font-medium text-parchment-100">
                  {timeKnown ? `${time} (local)` : "Unknown — time-independent placements only"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-silver-mist">Birthplace</dt>
                <dd className="text-right font-medium text-parchment-100">
                  {selectedPlace?.displayName}
                  {selectedPlace && (
                    <span className="block text-xs font-normal text-silver-mist">
                      {selectedPlace.timezone}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            <label className="mt-6 flex items-start gap-3 text-sm text-parchment-200">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span>
                I consent to this experience processing my birth date, time, and place to calculate
                my chart and generate a reading. I understand it is for reflection and
                entertainment, and that I can delete my reading at any time.
              </span>
            </label>
          </fieldset>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={back} className={step === 1 ? "invisible" : ""}>
            Back
          </Button>
          {step < 5 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Creating your reading…" : "Generate My Reading"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
