import type { Metadata } from "next";
import { Eyebrow, Section } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What you enter, when it is processed, what is stored and for how long, which providers may receive which fields, and how to delete a reading.",
  alternates: { canonical: "/privacy" },
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
            <p className="mt-3 text-sm text-silver-moon">Last updated September 10, 2026.</p>
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
              reading. The private URL contains only a high-entropy reading identifier. Your name
              and raw birth details do not appear in that URL.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>No account is required, and none is created.</li>
              <li>Birth data is never sent to analytics.</li>
              <li>Birth data is not written to logs.</li>
              <li>A reading is created only after you explicitly submit the reviewed details; you can delete it at any time.</li>
              <li>Older readings are removed automatically by the retention policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-medium text-gold-300">What external providers receive</h2>
            <p className="mt-3">
              Provider use depends on the mode shown in the reading. In demo mode, place search,
              chart calculation, text generation, and artwork use deterministic fixtures. When
              live providers are enabled, each receives only the minimum required:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong className="text-gold-300">Geocoding:</strong> the free-text birthplace query, nothing else.</li>
              <li><strong className="text-gold-300">Chart calculation:</strong> none — this is always local and deterministic.</li>
              <li><strong className="text-gold-300">Text generation:</strong> validated chart placements, symbol texts, and the display name you supplied for addressing the story.</li>
              <li><strong className="text-gold-300">Image generation:</strong> a visual prompt derived from the symbol and style. Your name and raw birthplace are never sent.</li>
            </ul>
          </section>

          <section id="mobile-app">
            <h2 className="font-display text-2xl font-medium text-gold-300">The mobile app</h2>
            <p className="mt-3">
              The iPhone, iPad, and Android app bundles the reading interface on your device and
              connects to this service over encrypted HTTPS. It does not request access to your
              current location, contacts, camera, microphone, photos, health data, advertising
              identifier, or cross-app tracking. The only locally remembered value is the opaque
              identifier of a reading you explicitly save, so the app can offer a return path.
            </p>
          </section>

          <section id="delete">
            <h2 className="font-display text-2xl font-medium text-gold-300">Your control</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Every reading page has a visible <strong className="text-gold-300">Delete Reading</strong> action that removes it immediately.</li>
              <li>You can stop at any step of the form; a reading is not created until you submit the reviewed details.</li>
              <li>No account is created, so there is no account profile to close. Deleting the reading removes its associated stored birth data.</li>
              <li>If you do not save a reading, the service still removes it under the automatic retention policy.</li>
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
