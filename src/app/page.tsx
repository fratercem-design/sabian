import Link from "next/link";
import { brand } from "@/lib/config";
import { Button, Eyebrow, Section, TestingBadge } from "@/components/ui";
import { CelestialWheel } from "@/components/celestial-wheel";

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 pt-16 text-center md:pt-24">
          <TestingBadge />
          <h1 className="mt-8 font-display text-4xl font-medium leading-tight text-parchment-100 md:text-6xl">
            {brand.name}
          </h1>
          <p className="mt-4 max-w-xl font-display text-lg italic text-gold-300 md:text-xl">
            {brand.tagline}
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-silver-moon md:text-lg">
            {brand.heroStatement}
          </p>
          <div className="mt-10">
            <Button href="/reading/new" id="begin-reading">
              Begin Your Reading
            </Button>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-silver-mist">
            Your birth date, time, and place are processed to calculate your chart and are never
            shared with analytics. You can delete your reading at any time.
          </p>
        </div>

        <div className="pointer-events-none mx-auto flex max-w-6xl items-center justify-center pb-16 opacity-90">
          <CelestialWheel size={420} />
        </div>
      </header>

      {/* What are the Sabian Symbols */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>360 Original Degree Images</Eyebrow>
          <h2 className="font-display text-3xl font-medium text-parchment-100 md:text-4xl">
            Every degree of the zodiac holds an image
          </h2>
          <p className="mt-6 leading-relaxed text-silver-moon">
            The zodiac is a circle of 360 degrees, and the Sabian tradition attaches one symbolic
            image to each degree. This testing preview uses a project-owned original set of 360
            degree images rather than wording from a historical book or website. Your birth chart
            places planets and points among these degrees, and this experience reads the exact
            original images selected by your sky as invitations to reflection, never as verdicts.
          </p>
        </div>
      </Section>

      {/* How it works */}
      <Section className="bg-midnight-800/40">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="font-display text-3xl font-medium text-parchment-100 md:text-4xl">
              Three steps to your story
            </h2>
          </div>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {brand.howItWorks.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-gold/15 bg-midnight-900/60 p-6 shadow-card">
                <span className="font-display text-5xl text-gold/30" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-xl font-medium text-gold-300">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-silver-moon">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Sample preview */}
      <Section>
        <div className="mx-auto max-w-3xl rounded-3xl border border-gold/20 bg-parchment-100 p-8 text-midnight-900 shadow-card md:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-600">
            A glimpse of what you&apos;ll receive
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium md:text-4xl">
            A reading in images
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_2fr]">
            <div
              aria-hidden="true"
              className="flex min-h-40 items-center justify-center rounded-2xl border border-gold/30 bg-midnight-900"
            >
              <svg viewBox="0 0 120 120" className="h-32 w-32" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#C9A227" strokeWidth="1" />
                <circle cx="60" cy="60" r="34" fill="none" stroke="#A9B4C4" strokeWidth="0.8" />
                <circle cx="60" cy="60" r="7" fill="#E3C766" />
                <path d="M60 26 L60 94 M26 60 L94 60" stroke="#8A7CA8" strokeWidth="0.8" opacity="0.6" />
              </svg>
            </div>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                <strong className="text-gold-600">Your Sun</strong> at <em>Taurus 27°</em>, the
                original degree image of <em>“A mechanic beside a still lake lifts a curtain”</em> — a quality of steady,
                deepening purpose.
              </p>
              <p>
                <strong className="text-gold-600">Your Moon</strong> at <em>Gemini 3°</em>, an image
                of <em>“A stranger beside a still lake counts the stars”</em> — curiosity that
                gathers many voices before it speaks.
              </p>
              <p className="border-t border-gold/20 pt-4 italic">
                Every reading weaves these images into a seven-chapter story, with original artwork
                for each of your principal symbols.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Final CTA + privacy */}
      <Section className="border-t border-gold/15">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-medium text-parchment-100 md:text-4xl">
            Your sky has a story in it
          </h2>
          <p className="mt-5 leading-relaxed text-silver-moon">
            Calculated with a documented ephemeris. Interpreted with care. Offered as reflection,
            not as fate.
          </p>
          <div className="mt-8">
            <Button href="/reading/new" id="begin-reading-bottom">
              Begin Your Reading
            </Button>
          </div>
          <p className="mt-6 text-sm text-silver-mist">
            No account needed. Readings are private, deletable, and never shared.{" "}
            <Link href="/privacy" className="text-gold-300 underline underline-offset-4 hover:text-gold-400">
              Read the privacy statement
            </Link>
            .
          </p>
        </div>
      </Section>
    </main>
  );
}
