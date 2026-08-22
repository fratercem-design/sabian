import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createReadingService } from "@/lib/reading/service";
import { getProviderMatrix } from "@/lib/providers/status";
import type { Reading, Placement } from "@/lib/types";
import { DemoArtworkBadge, DemoTextBadge, TestingBadge, Button } from "@/components/ui";
import ReadingClient from "./reading-client";
import SaveDeleteButtons from "./save-delete-buttons";

export const metadata: Metadata = {
  title: "Your Reading",
};

export const dynamic = "force-dynamic";

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createReadingService();
  const reading = await service.get(id);
  if (!reading) notFound();

  return (
    <main className="min-h-screen">
      <ReadingClient initial={reading} initialId={id} />

      {reading.status === "failed" && (
        <section className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="font-display text-3xl text-parchment-100">Your reading could not be completed</h1>
          <p className="mt-4 text-silver-moon">{reading.error ?? "An unexpected error occurred."}</p>
          <p className="mt-4 text-sm text-silver-mist">
            Your calculated chart below is preserved — the deterministic facts remain trustworthy.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button href="/reading/new">Try Again</Button>
            <Button href="/" variant="ghost">Home</Button>
          </div>
          <ChartFacts reading={reading} />
        </section>
      )}

      {reading.status === "ready" && reading.interpretation && (
        <ReadyReading reading={reading} />
      )}
    </main>
  );
}

function ReadyReading({ reading }: { reading: Reading }) {
  const interp = reading.interpretation!;
  const sun = reading.chart.placements.find((p) => p.key === "sun");
  const moon = reading.chart.placements.find((p) => p.key === "moon");
  const asc = reading.chart.placements.find((p) => p.key === "ascendant");

  return (
    <div>
      <header className="border-b border-gold/15 bg-midnight-900/60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <div>
            <TestingBadge />
            <h1 className="mt-3 font-display text-3xl font-medium text-parchment-100 md:text-4xl">
              {reading.displayName}&rsquo;s Sabian Story
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button href="/reading/new" variant="ghost" className="px-4 py-2 text-sm">
              Start Another Reading
            </Button>
            <SaveDeleteButtons id={reading.id} initiallySaved={reading.saved} />
          </div>
        </div>
        <p className="mx-auto max-w-4xl px-5 pb-6 text-xs leading-relaxed text-silver-mist">
          This reading is not saved unless you choose to save it. Saved readings are retained
          for a limited period (configurable; currently 90 days) and can be deleted at any time.
        </p>
      </header>

      {/* Celestial Signature */}
      <section className="border-b border-gold/15" aria-labelledby="signature">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-[1fr_1.4fr] md:items-center">
          <NatalWheel chart={reading.chart} />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">Your Celestial Signature</p>
            <h2 id="signature" className="mt-2 font-display text-2xl font-medium text-parchment-100 md:text-3xl">
              {formatDate(reading.birthDate)}
              {reading.timeKnown && reading.birthTime ? ` at ${reading.birthTime}` : ""}
            </h2>
            <p className="mt-2 text-silver-moon">{reading.place.displayName} · {reading.place.timezone}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-gold/15 bg-midnight-900/60 p-4">
                <dt className="text-silver-mist">Sun</dt>
                <dd className="mt-1 font-display text-lg text-parchment-100">{sun ? formatPlacement(sun) : "—"}</dd>
              </div>
              <div className="rounded-xl border border-gold/15 bg-midnight-900/60 p-4">
                <dt className="text-silver-mist">Moon</dt>
                <dd className="mt-1 font-display text-lg text-parchment-100">{moon ? formatPlacement(moon) : "—"}</dd>
              </div>
              <div className="rounded-xl border border-gold/15 bg-midnight-900/60 p-4">
                <dt className="text-silver-mist">Ascendant</dt>
                <dd className="mt-1 font-display text-lg text-parchment-100">
                  {asc ? formatPlacement(asc) : reading.timeKnown ? "—" : "Not calculated"}
                </dd>
              </div>
              <div className="rounded-xl border border-gold/15 bg-midnight-900/60 p-4">
                <dt className="text-silver-mist">Midheaven</dt>
                <dd className="mt-1 font-display text-lg text-parchment-100">
                  {reading.chart.placements.find((p) => p.key === "midheaven")
                    ? formatPlacement(reading.chart.placements.find((p) => p.key === "midheaven")!)
                    : "Not calculated"}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-silver-mist">
              {reading.chart.ephemerisConfig.zodiac} zodiac · {reading.chart.ephemerisConfig.houseSystem} ·{" "}
              {reading.chart.ephemerisConfig.ephemeris} — deterministic calculations, not AI.
            </p>
          </div>
        </div>
      </section>

      <DemoBadgeContainer reading={reading} matrix={getProviderMatrix()} />

      {/* The Three Gates */}
      <section className="mx-auto max-w-5xl px-5 py-16" aria-labelledby="gates">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">The Three Gates</p>
          <h2 id="gates" className="mt-2 font-display text-3xl font-medium text-parchment-100">
            Sun · Moon · Ascendant
          </h2>
        </div>
        <div className="mt-12 space-y-14">
          <GatePanel
            title={interp.sun.title}
            placement={interp.sun.placement}
            symbol={interp.sun.symbol}
            interpretation={interp.sun.interpretation}
            light={interp.sun.light}
            shadow={interp.sun.shadow}
            question={interp.sun.reflectionQuestion}
            artwork={reading.artwork?.sun}
            gateName="Sun"
          />
          <GatePanel
            title={interp.moon.title}
            placement={interp.moon.placement}
            symbol={interp.moon.symbol}
            interpretation={interp.moon.interpretation}
            light={interp.moon.light}
            shadow={interp.moon.shadow}
            question={interp.moon.reflectionQuestion}
            artwork={reading.artwork?.moon}
            gateName="Moon"
          />
          {interp.ascendant.available ? (
            <GatePanel
              title={interp.ascendant.title}
              placement={interp.ascendant.placement}
              symbol={interp.ascendant.symbol}
              interpretation={interp.ascendant.interpretation}
              light={interp.ascendant.light}
              shadow={interp.ascendant.shadow}
              question={interp.ascendant.reflectionQuestion}
              artwork={reading.artwork?.ascendant}
              gateName="Ascendant"
            />
          ) : (
            <UnknownAscendant explanation={interp.ascendant.explanation} />
          )}
        </div>
      </section>

      {/* The Planetary Chorus */}
      <section className="border-y border-gold/15 bg-midnight-800/40" aria-labelledby="chorus">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">The Planetary Chorus</p>
            <h2 id="chorus" className="mt-2 font-display text-3xl font-medium text-parchment-100">
              The voices around the wheel
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {interp.planets.map((p) => (
              <article key={p.planet} className="rounded-2xl border border-gold/15 bg-midnight-900/60 p-6 shadow-card">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl font-medium text-gold-300">{p.planet}</h3>
                  <span className="text-sm text-silver-moon">{p.sign} {p.sabianDegree}</span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wideish text-silver-mist">
                  {p.keywords.join(" · ")}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-parchment-200">{p.interpretation}</p>
                <p className="mt-3 border-t border-gold/10 pt-3 text-sm italic leading-relaxed text-silver-moon">
                  {p.relationship}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Your Sabian Story */}
      <section className="mx-auto max-w-3xl px-5 py-16" aria-labelledby="story">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">Your Sabian Story</p>
          <h2 id="story" className="mt-2 font-display text-3xl font-medium text-parchment-100">
            A story in seven images
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm italic text-silver-moon">
            {interp.summary}
          </p>
        </div>
        <div className="mt-10 space-y-10">
          {interp.story.map((chapter, i) => (
            <article key={chapter.title} className="rounded-2xl border border-gold/15 bg-parchment-100 p-7 text-midnight-900 shadow-card md:p-9">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl text-gold-600" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-medium">{chapter.title}</h3>
              </div>
              <p className="mt-4 font-display text-[17px] leading-relaxed text-midnight-800">
                {chapter.body}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-gold/25 bg-gold/5 p-6 text-sm leading-relaxed text-parchment-200">
          <strong className="text-gold-300">A gentle note: </strong>
          {interp.safetyDisclaimer}
        </div>
      </section>

      {/* Reflection Ritual */}
      <section className="border-t border-gold/15 bg-midnight-800/40" aria-labelledby="ritual">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">Reflection Ritual</p>
            <h2 id="ritual" className="mt-2 font-display text-3xl font-medium text-parchment-100">
              Carry the images gently
            </h2>
          </div>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="font-display text-xl text-gold-300">Three journal prompts</h3>
              <ol className="mt-4 list-decimal space-y-2 pl-6 text-parchment-200">
                {interp.journalPrompts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-gold/15 bg-midnight-900/60 p-6">
              <h3 className="font-display text-xl text-gold-300">A grounding exercise</h3>
              <p className="mt-3 leading-relaxed text-parchment-200">{interp.groundingExercise}</p>
            </div>
            <div className="rounded-2xl border border-gold/25 bg-gold/5 p-6 text-center">
              <p className="text-xs uppercase tracking-wideish text-silver-mist">Your affirmation</p>
              <p className="mt-2 font-display text-2xl italic text-parchment-100">{interp.affirmation}</p>
            </div>
            <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
              <Button href="/reading/new">Start Another Reading</Button>
              <Button href="/" variant="ghost">Return Home</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function GatePanel({
  gateName,
  title,
  placement,
  symbol,
  interpretation,
  light,
  shadow,
  question,
  artwork,
}: {
  gateName: string;
  title: string;
  placement: string;
  symbol: string;
  interpretation: string;
  light: string;
  shadow: string;
  question: string;
  artwork?: { imageUrl: string; source: string; altText: string };
}) {
  return (
    <article className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <figure className="self-start rounded-2xl border border-gold/20 bg-midnight-900/60 p-4">
        <Artwork artwork={artwork} altText={artwork?.altText ?? `Artwork for ${title}`} />
        <figcaption className="mt-3 text-center text-sm text-silver-moon">
          <span className="text-gold-300">{gateName}</span> — {title}
        </figcaption>
      </figure>
      <div className="rounded-2xl border border-gold/15 bg-midnight-800/40 p-6 md:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">{gateName}</p>
        <h3 className="mt-1 font-display text-2xl font-medium text-parchment-100">{title}</h3>
        <p className="mt-1 text-sm text-silver-moon">{placement}</p>
        <p className="mt-4 font-display text-lg italic leading-relaxed text-parchment-200">{symbol}</p>
        <p className="mt-4 leading-relaxed text-parchment-200">{interpretation}</p>
        <div className="mt-5 grid gap-4 border-t border-gold/10 pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wideish text-gold-400">Light</p>
            <p className="mt-1 leading-relaxed text-parchment-200">{light}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wideish text-ember">Shadow</p>
            <p className="mt-1 leading-relaxed text-parchment-200">{shadow}</p>
          </div>
        </div>
        <p className="mt-5 rounded-xl bg-gold/10 p-4 text-sm italic leading-relaxed text-gold-300">
          {question}
        </p>
        <p className="mt-4 text-xs leading-relaxed text-silver-mist">
          Calculated position and Sabian degree are shown above; the interpretation is a generated
          reflection, not a statement of fact.
        </p>
      </div>
    </article>
  );
}

function Artwork({ artwork, altText }: { artwork?: { imageUrl: string; altText: string; source?: string }; altText: string }) {
  if (!artwork) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-gold/20 bg-midnight-900 text-sm text-silver-mist">
        Artwork unavailable
      </div>
    );
  }
  const isPlaceholder = artwork.source === "placeholder" || artwork.source === "failed";
  return (
    <div>
      {/* Demo artwork is an inline data-URL SVG; next/image adds no value here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artwork.imageUrl} alt={altText} className="aspect-square w-full rounded-xl object-cover" />
      <div className="mt-2">{isPlaceholder && <DemoArtworkBadge />}</div>
    </div>
  );
}

function UnknownAscendant({ explanation }: { explanation: string }) {
  return (
    <article className="rounded-2xl border border-gold/15 bg-midnight-800/40 p-8 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-400">The Ascendant</p>
      <h3 className="mt-2 font-display text-2xl font-medium text-parchment-100">
        Your birth time is not known
      </h3>
      <p className="mx-auto mt-4 max-w-xl leading-relaxed text-parchment-200">{explanation}</p>
    </article>
  );
}

function DemoBadgeContainer({ reading, matrix }: { reading: Reading; matrix: ReturnType<typeof getProviderMatrix> }) {
  const mockText = reading.providers?.interpretation?.includes("mock") ?? reading.isDemo;
  const mockArt = reading.providers?.image?.includes("mock") ?? reading.isDemo;
  const showLabel = matrix.isDemonstration || reading.isDemo || mockText || mockArt;
  if (!showLabel) return null;
  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 px-5 pb-4">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/60 bg-ember/10 px-3 py-1 text-xs font-semibold tracking-wideish text-ember">
        Demonstration Reading
      </span>
      {mockText && <DemoTextBadge />}
      {mockArt && <DemoArtworkBadge />}
      {reading.providers?.symbolDatasetIsDemo && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-dust/40 bg-violet-deep/40 px-2.5 py-0.5 text-[11px] tracking-wideish text-silver-moon">
          Demo symbol dataset — placeholders, not licensed Sabian texts
        </span>
      )}
    </div>
  );
}

function formatPlacement(p: Placement): string {
  return `${p.sign} ${p.degree}°${String(p.minute).padStart(2, "0")}′`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
}

function NatalWheel({ chart }: { chart: Reading["chart"] }) {
  const cx = 200;
  const cy = 200;
  const r = 160;
  return (
    <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-sm" role="img" aria-label="Compact natal wheel showing planet positions">
      <circle cx={cx} cy={cy} r={r} fill="#0B1020" stroke="#C9A227" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="#7E8CA3" strokeWidth="0.8" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r * 0.33} fill="none" stroke="#7E8CA3" strokeWidth="0.8" opacity="0.6" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * r}
            y1={cy + Math.sin(a) * r}
            x2={cx + Math.cos(a) * r * 0.33}
            y2={cy + Math.sin(a) * r * 0.33}
            stroke="#C9A227"
            strokeWidth="0.7"
            opacity="0.5"
          />
        );
      })}
      {chart.placements.map((p) => {
        const a = ((p.longitude - 90) * Math.PI) / 180;
        const x = cx + Math.cos(a) * r * 0.82;
        const y = cy + Math.sin(a) * r * 0.82;
        return (
          <text key={p.key} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="15" fill="#E3C766">
            {p.glyph}
          </text>
        );
      })}
    </svg>
  );
}

function ChartFacts({ reading }: { reading: Reading }) {
  return (
    <div className="mt-12 text-left">
      <h2 className="font-display text-2xl text-parchment-100">Calculated placements</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {reading.chart.placements.map((p) => (
          <li key={p.key} className="rounded-lg border border-gold/15 bg-midnight-900/60 px-4 py-2 text-sm">
            <span className="text-gold-300">{p.name}:</span> {formatPlacement(p)} · Sabian {p.sabianDegree}
          </li>
        ))}
      </ul>
    </div>
  );
}
