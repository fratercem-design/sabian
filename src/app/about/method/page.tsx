import type { Metadata } from "next";
import { Eyebrow, Section } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { zodiac, houseSystem, sabianConvention } from "@/lib/config";
import { EPHEMERIS_LICENSE } from "@/lib/chart/provider";

export const metadata: Metadata = {
  title: "Methodology",
};

export default function MethodPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <header className="border-b border-gold/15">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <Eyebrow>Methodology & Trust</Eyebrow>
          <h1 className="font-display text-4xl font-medium text-parchment-100">How this experience calculates and interprets</h1>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-silver-moon">
            The Sabian Story separates the deterministic from the interpretive, and is transparent
            about both. This page documents exactly what is calculated, how, and where the
            interpretation begins.
          </p>
        </div>
      </header>

      <Section>
        <div className="space-y-12">
          <div>
            <h2 className="font-display text-2xl font-medium text-gold-300">What are degree images?</h2>
            <p className="mt-4 leading-relaxed text-parchment-200">
              The degree-image tradition associates one symbolic picture with each of the 360
              degrees of the zodiac. The best-known example is the Sabian Symbols, first
              published in 1925 by Elsie Wheeler with Marc Edmund Jones and later re-imagined by
              Dane Rudhyar. Each image — “A woman rises from the sea,” “A bridge being built” —
              is a small picture meant for contemplation rather than prediction.
            </p>
            <p className="mt-4 leading-relaxed text-parchment-200">
              This testing preview does not use historical Sabian wording. It uses a
              project-owned original set of 360 degree images inspired by the same 360-degree
              idea. The active wording, titles, and commentary are generated for this project
              and are not claimed to be historical or canonical.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium text-gold-300">The zodiac and conventions used</h2>
            <ul className="mt-4 space-y-3 leading-relaxed text-parchment-200">
              <li><strong className="text-gold-300">Zodiac:</strong> {zodiac.systemLabel}.</li>
              <li><strong className="text-gold-300">House system:</strong> {houseSystem.label} ({houseSystem.documented})</li>
              <li><strong className="text-gold-300">Sabian degree convention:</strong> {sabianConvention.label}. {sabianConvention.rule}</li>
              <li><strong className="text-gold-300">Boundaries:</strong> {sabianConvention.boundaries.exactSignStart} {sabianConvention.boundaries.fraction} {sabianConvention.boundaries.lastInstant} {sabianConvention.boundaries.globalWrap}</li>
              <li><strong className="text-gold-300">Ephemeris:</strong> {EPHEMERIS_LICENSE} — a deterministic, VSOP87-based geocentric ephemeris.</li>
              <li><strong className="text-gold-300">North Node:</strong> the instantaneous osculating ascending node at the birth instant, derived from the Moon’s position and velocity vectors — never the descending node, and never a value sampled from a nearby node-crossing event.</li>
              <li><strong className="text-gold-300">Historical time:</strong> The local birth time is converted to UTC using the IANA time-zone database’s historical offsets for the exact birthplace and date — never a modern or assumed offset. DST gaps are rejected; ambiguous fall-back times expose both offset choices.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium text-gold-300">Deterministic calculation vs. AI interpretation</h2>
            <p className="mt-4 leading-relaxed text-parchment-200">
              Every astronomical fact in a reading — the Sun&rsquo;s longitude, the Moon&rsquo;s degree, the
              Ascendant, the houses, the resulting Sabian degree — is calculated by deterministic
              code from a documented ephemeris. No AI model ever computes a planetary position,
              converts a time zone, or assigns a Sabian number.
            </p>
            <p className="mt-4 leading-relaxed text-parchment-200">
              AI (or, in demo mode, a deterministic mock) is used only for interpretation: reading
              the validated chart JSON and the symbol texts into reflective prose, story chapters,
              prompts, and artwork. It receives only the validated placements and symbol data, and
              its output is validated against a strict schema. The calculated facts are shown
              alongside every interpretation so the two can never be confused.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium text-gold-300">When the birth time is unknown</h2>
            <p className="mt-4 leading-relaxed text-parchment-200">
              The Ascendant, Midheaven, and houses depend on the exact time of birth. When that
              time is not known, this application does not calculate or display them as facts, and
              never substitutes noon or any other assumed time. The Moon may be marked as
              potentially uncertain if it changes sign or Sabian degree during the local calendar
              day. The reading is then reduced to the placements that do not depend on the time of
              day.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium text-gold-300">Limitations and purpose</h2>
            <p className="mt-4 leading-relaxed text-parchment-200">
              This is a testing-phase product. In demo mode the interpretation and artwork come
              from deterministic local fixtures and are clearly labeled as such. The active
              degree-image dataset contains 360 project-owned original phrases. They are not
              presented as historical wording by Elsie Wheeler, Marc Edmund Jones, or Dane
              Rudhyar, nor as an authorized Sabian corpus. The exact active image is shown in
              each reading and passed to the interpretation provider. Nothing in this
              experience is a medical, legal, or financial opinion, and nothing predicts your
              future. Its purpose is reflection and entertainment: a contemplative way to meet
              your own images.
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
