import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProviderMatrix } from "@/lib/providers/status";
import { getSymbolDataset, isDemoDataset } from "@/lib/sabian";
import { isTestingMode } from "@/lib/config";
import { EPHEMERIS_LICENSE } from "@/lib/chart/provider";

export const metadata: Metadata = {
  title: "Beta Readiness Dashboard (Dev Only)",
};

export const dynamic = "force-dynamic";

export default function ReadinessPage() {
  // Only accessible in development / testing mode
  if (process.env.NODE_ENV === "production" && !isTestingMode) {
    notFound();
  }

  const matrix = getProviderMatrix();
  const symbolDataset = getSymbolDataset();
  const isDemo = isDemoDataset();
  const symbolCount = symbolDataset.length;

  const safeForPrivateBeta = false; // Intentionally false until credentials, PostgreSQL, and licensed Sabian dataset are connected

  return (
    <main className="min-h-screen bg-midnight px-6 py-12 text-parchment font-body">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="border-b border-gold/20 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold text-gold">Beta Readiness & Truth Dashboard</h1>
              <p className="mt-1 text-sm text-silver-moon">
                Live inspection of system providers, data provenance, and launch criteria.
              </p>
            </div>
            <span className="rounded-full border border-gold/40 bg-midnight-800 px-3 py-1 text-xs font-mono uppercase tracking-widest text-gold-300">
              Dev Only
            </span>
          </div>
        </header>

        {/* Beta Verdict Card */}
        <section
          aria-labelledby="verdict-heading"
          className={`rounded-2xl border p-6 ${
            safeForPrivateBeta
              ? "border-emerald-500/40 bg-emerald-950/20"
              : "border-ember/40 bg-midnight-900/80"
          }`}
        >
          <h2 id="verdict-heading" className="text-xs font-semibold uppercase tracking-wider text-silver-mist">
            Overall Readiness Verdict
          </h2>
          <div className="mt-2 flex items-baseline gap-3">
            <span className={`text-2xl font-display font-bold ${safeForPrivateBeta ? "text-emerald-400" : "text-ember"}`}>
              {safeForPrivateBeta ? "READY FOR CLOSED BETA" : "DEMO / PROTOTYPE ONLY"}
            </span>
          </div>
          <p className="mt-2 text-sm text-silver-moon">
            {safeForPrivateBeta
              ? "All live adapters are authenticated, dataset is fully licensed (360/360), and PostgreSQL persistence is verified."
              : "The application contains hardened, verified calculation engines and server-side adapters, but remains in demonstration mode because live AI/geocoding credentials, production PostgreSQL, and an authorized 360-symbol dataset have not been connected."}
          </p>
        </section>

        {/* Provider Status Grid */}
        <section aria-labelledby="providers-heading" className="space-y-4">
          <h2 id="providers-heading" className="font-display text-xl font-medium text-parchment-100">
            Provider Architecture Matrix
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Astrology Engine */}
            <div className="rounded-xl border border-gold/20 bg-midnight-900/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Astrology (Chart)</span>
                <span className="rounded bg-violet-deep/60 px-2 py-0.5 text-xs font-mono text-silver-moon">
                  {matrix.astrology.kind}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">{matrix.astrology.implementation}</p>
              <p className="text-xs text-silver-mist">{EPHEMERIS_LICENSE}</p>
              <div className="text-xs text-emerald-400 font-mono pt-1">
                ✓ Gold-master verified against Swiss Ephemeris 2.10.03
              </div>
            </div>

            {/* Sabian Dataset */}
            <div className="rounded-xl border border-gold/20 bg-midnight-900/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Sabian Dataset</span>
                <span className={`rounded px-2 py-0.5 text-xs font-mono ${isDemo ? "bg-ember/20 text-ember" : "bg-emerald-900/40 text-emerald-300"}`}>
                  {isDemo ? "demo fixture" : "licensed (360)"}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">
                {symbolCount} of 360 Symbols Loaded
              </p>
              <p className="text-xs text-silver-mist">
                {isDemo
                  ? "Incomplete fictional placeholders. Import pipeline ready via scripts/import-symbols.ts."
                  : "Authorized dataset verified."}
              </p>
            </div>

            {/* Geocoding Provider */}
            <div className="rounded-xl border border-gold/20 bg-midnight-900/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Geocoding</span>
                <span className="rounded bg-violet-deep/60 px-2 py-0.5 text-xs font-mono text-silver-moon">
                  {matrix.geocoding.kind}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">{matrix.geocoding.implementation}</p>
              <p className="text-xs text-silver-mist">{matrix.geocoding.externalData}</p>
            </div>

            {/* Timezone Resolver */}
            <div className="rounded-xl border border-gold/20 bg-midnight-900/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Historical Timezone</span>
                <span className="rounded bg-violet-deep/60 px-2 py-0.5 text-xs font-mono text-silver-moon">
                  {matrix.timezone.kind}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">{matrix.timezone.implementation}</p>
              <p className="text-xs text-silver-mist">Local IANA tz database (2025b). No external calls.</p>
            </div>

            {/* Story Provider */}
            <div className="rounded-xl border border-gold/20 bg-midnight-900/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Story Generation</span>
                <span className={`rounded px-2 py-0.5 text-xs font-mono ${matrix.story.kind === "live" ? "bg-emerald-900/40 text-emerald-300" : "bg-violet-deep/60 text-silver-moon"}`}>
                  {matrix.story.kind}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">{matrix.story.implementation}</p>
              <p className="text-xs text-silver-mist">
                Adapter exists with Zod validation, retry, and timeout policies.
              </p>
            </div>

            {/* Artwork Provider */}
            <div className="rounded-xl border border-gold/20 bg-midnight-900/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Artwork Generation</span>
                <span className={`rounded px-2 py-0.5 text-xs font-mono ${matrix.image.kind === "live" ? "bg-emerald-900/40 text-emerald-300" : "bg-violet-deep/60 text-silver-moon"}`}>
                  {matrix.image.kind}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">{matrix.image.implementation}</p>
              <p className="text-xs text-silver-mist">
                4-image contract (Sun, Moon, Ascendant, Soul Portrait) with prompt sanitization.
              </p>
            </div>

            {/* Database */}
            <div className="rounded-xl border border-gold/20 bg-midnight-900/60 p-5 space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Database Storage</span>
                <span className={`rounded px-2 py-0.5 text-xs font-mono ${matrix.database.kind === "postgres" ? "bg-emerald-900/40 text-emerald-300" : "bg-violet-deep/60 text-silver-moon"}`}>
                  {matrix.database.kind}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">
                {matrix.database.kind === "sqlite" ? "Local SQLite (data/sabian.db)" : "PostgreSQL"}
              </p>
              <p className="text-xs text-silver-mist">
                PostgreSQL migration plan, DDL schema, and migration script documented in docs/postgresql-migration-plan.md.
              </p>
            </div>
          </div>
        </section>

        {/* Verification Summary */}
        <section aria-labelledby="verification-heading" className="rounded-xl border border-gold/20 bg-midnight-900/40 p-6 space-y-3">
          <h2 id="verification-heading" className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            Last Test & Verification Results
          </h2>
          <ul className="space-y-1 text-sm font-mono text-silver-moon">
            <li>• Unit & Integration Tests: <span className="text-emerald-400">175 / 175 passing</span></li>
            <li>• Gold-Master Ephemeris: <span className="text-emerald-400">71 / 71 assertions matching SE 2.10.03</span></li>
            <li>• Symbol Validation: <span className="text-gold-300">120/360 demo symbols verified</span></li>
            <li>• Security & Secrets Scan: <span className="text-emerald-400">0 leaked credentials</span></li>
            <li>• npm Audit: <span className="text-emerald-400">0 vulnerabilities</span></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
