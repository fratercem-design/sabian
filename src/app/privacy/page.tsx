import type { Metadata } from "next";
import { Eyebrow, Section } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <header className="border-b border-gold/15">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <Eyebrow>Privacy</Eyebrow>
          <h1 className="font-display text-4xl font-medium text-parchment-100">Your birth data, handled with care</h1>
        </div>
      </header>

      <Section>
        <div className="space-y-10 leading-relaxed text-parchment-200">
          <section>
            <h2 className="font-display text-2xl font-medium text-gold-300">In plain language</h2>
            <p className="mt-3">
              Your birth date, time, and place are personal. {brand.name} treats them that way.
              This page explains what happens to them, who sees them, and how you stay in control.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-medium text-gold-300">What we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>A display name you choose (a nickname is welcome).</li>
              <li>Your birth date.</li>
              <li>Your exact birth time, if you know it.</li>
              <li>Your birthplace, resolved to a city with coordinates and a time zone.</li>
              <li>Your consent choice.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-medium text-gold-300">What we do with it</h2>
            <p className="mt-3">
              Your birth information is used only to calculate your chart and generate your
              reading. The reading itself is stored under a random, non-guessable identifier — not
              your name, and never in a URL.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>No account is required, and none is created.</li>
              <li>Birth data is never sent to analytics.</li>
              <li>Birth data is not written to logs.</li>
              <li>Readings are saved only because you chose to generate one; you can delete it at any time with one click.</li>
              <li>Older readings are removed automatically by the retention policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-medium text-gold-300">What external providers receive</h2>
            <p className="mt-3">
              In demo mode, no external provider is used: place search, chart calculation, text
              generation, and artwork all run locally with deterministic fixtures. When live
              providers are enabled, each receives only the minimum required:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong className="text-gold-300">Geocoding:</strong> the free-text birthplace query, nothing else.</li>
              <li><strong className="text-gold-300">Chart calculation:</strong> none — this is always local and deterministic.</li>
              <li><strong className="text-gold-300">Text generation:</strong> validated chart placements and symbol texts. Your name is included only as a first name for addressing the story.</li>
              <li><strong className="text-gold-300">Image generation:</strong> a visual prompt derived from the symbol and style. Your name and raw birthplace are never sent.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-medium text-gold-300">Your control</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Every reading page has a visible <strong className="text-gold-300">Delete Reading</strong> action that removes it immediately.</li>
              <li>You can stop at any step of the form; nothing is saved until you submit.</li>
              <li>You can clear the demo database at any time with <code className="rounded bg-midnight-800 px-1.5 py-0.5 text-sm">npm run cleanup:readings</code>.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-medium text-gold-300">A note on purpose</h2>
            <p className="mt-3">
              This experience is for reflection and entertainment. It does not diagnose, predict,
              or advise. Please never use it — or any astrology — in place of professional medical,
              legal, or financial guidance.
            </p>
          </section>
        </div>
      </Section>
    </main>
  );
}
