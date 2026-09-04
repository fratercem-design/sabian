import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProviderMatrix,
  getReadinessChecks,
  isSafeForPrivateBeta,
  type ProviderStatus,
} from "@/lib/providers/status";
import { loadVerificationManifest } from "@/lib/providers/verification-manifest";
import { getSymbolDataset, isDemoDataset } from "@/lib/sabian";
import { isReadinessRouteAllowed } from "@/app/dev/readiness/gate";

export const metadata: Metadata = {
  title: "Beta Readiness Dashboard (Dev Only)",
};

export const dynamic = "force-dynamic";

const CHECK_LABELS: Record<string, string> = {
  chartVerified: "Chart engine independently verified (gold-master)",
  timezoneVerified: "Historical timezone resolver verified (bundled IANA)",
  symbolContentReady: "360 project-owned or authorized degree images loaded and validated",
  storyLiveVerified: "Story provider live-verified with a controlled call",
  imageLiveVerified: "Artwork provider live-verified with a controlled call",
  geocodingOperational: "Birthplace resolution operational (fixture or live-verified)",
  databaseProductionVerified: "Production database (PostgreSQL) live-tested",
};

export default function ReadinessPage() {
  // Fail-closed gate: 404 in production always, and off by default elsewhere.
  if (!isReadinessRouteAllowed()) {
    notFound();
  }

  const matrix = getProviderMatrix();
  const checks = getReadinessChecks();
  const ready = isSafeForPrivateBeta();
  const symbolCount = getSymbolDataset().length;
  const demo = isDemoDataset();
  const manifestState = loadVerificationManifest();

  const providers: Array<{ label: string; status: ProviderStatus }> = [
    { label: "Astrology (Chart)", status: matrix.astrology },
    { label: "Birthplace Geocoding", status: matrix.geocoding },
    { label: "Historical Timezone", status: matrix.timezone },
    { label: "Sabian Dataset", status: matrix.sabian },
    { label: "Story Generation", status: matrix.story },
    { label: "Artwork Generation", status: matrix.image },
  ];

  return (
    <main className="min-h-screen bg-midnight px-6 py-12 font-body text-parchment">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="border-b border-gold/20 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold text-gold">
                Beta Readiness &amp; Truth Dashboard
              </h1>
              <p className="mt-1 text-sm text-silver-moon">
                Live inspection of provider state and launch criteria — derived from real
                configuration at request time, never hard-coded.
              </p>
            </div>
            <span className="rounded-full border border-gold/40 bg-midnight-800 px-3 py-1 font-mono text-xs uppercase tracking-widest text-gold-300">
              Dev Only
            </span>
          </div>
        </header>

        {/* Derived verdict */}
        <section
          aria-labelledby="verdict-heading"
          className={`rounded-2xl border p-6 ${
            ready ? "border-gold/60 bg-midnight-800/60" : "border-ember/40 bg-midnight-900/80"
          }`}
        >
          <h2 id="verdict-heading" className="text-xs font-semibold uppercase tracking-wider text-silver-mist">
            Overall Readiness Verdict (derived)
          </h2>
          <div className="mt-2">
            <span className={`font-display text-2xl font-bold ${ready ? "text-gold-300" : "text-ember"}`}>
              {ready ? "READY FOR CLOSED BETA" : "NOT READY FOR CLOSED BETA"}
            </span>
          </div>
          <p className="mt-2 text-sm text-silver-moon">
            {ready
              ? "Every capability check below passes. The verdict is computed from those checks, not asserted."
              : "One or more capability checks below are not yet satisfied. Local chart and timezone engines are production-grade; the blockers are licensed content, live provider verification, and a production database."}
          </p>

          <ul className="mt-4 space-y-1.5">
            {Object.entries(checks).map(([key, pass]) => (
              <li key={key} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 rounded-full ${pass ? "bg-gold-400" : "bg-ember"}`}
                />
                <span className={pass ? "text-parchment-100" : "text-silver-moon"}>
                  {CHECK_LABELS[key] ?? key}
                </span>
                <span className={`font-mono text-xs ${pass ? "text-gold-300" : "text-ember"}`}>
                  {pass ? "pass" : "not met"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Provider matrix */}
        <section aria-labelledby="providers-heading" className="space-y-4">
          <h2 id="providers-heading" className="font-display text-xl font-medium text-parchment-100">
            Provider Architecture Matrix
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {providers.map(({ label, status }) => (
              <div key={label} className="space-y-2 rounded-xl border border-gold/20 bg-midnight-900/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-gold-400">{label}</span>
                  <span className="rounded bg-violet-deep/60 px-2 py-0.5 font-mono text-xs text-silver-moon">
                    {status.kind}
                  </span>
                </div>
                <p className="text-sm font-medium text-parchment-100">{status.implementation}</p>
                <p className="text-xs text-silver-mist">{status.readinessNote}</p>
              </div>
            ))}

            {/* Database spans both columns */}
            <div className="space-y-2 rounded-xl border border-gold/20 bg-midnight-900/60 p-5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gold-400">Database Storage</span>
                <span className="rounded bg-violet-deep/60 px-2 py-0.5 font-mono text-xs text-silver-moon">
                  {matrix.database.kind} · {matrix.database.backend}
                </span>
              </div>
              <p className="text-sm font-medium text-parchment-100">
                {matrix.database.backend === "sqlite"
                  ? "Local SQLite (node:sqlite) — implemented and integration-tested."
                  : "PostgreSQL configured but no runtime implemented yet."}
              </p>
              <p className="text-xs text-silver-mist">{matrix.database.readinessNote}</p>
            </div>
          </div>
          <p className="text-xs text-silver-mist">
            Symbol dataset active state: {demo ? "demo fixture" : matrix.sabian.implementation} — {symbolCount}/360
            symbols loaded.
          </p>
        </section>

        {/* Verification manifest */}
        <section
          aria-labelledby="verification-heading"
          className="space-y-3 rounded-xl border border-gold/20 bg-midnight-900/40 p-6"
        >
          <h2 id="verification-heading" className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            Verification Manifest
          </h2>
          {!manifestState.available && (
            <p className="text-sm text-silver-moon">
              No verification manifest for this commit. Run <code className="font-mono">npm run verify:manifest</code>{" "}
              to generate one from a real verification run.
            </p>
          )}
          {manifestState.available && manifestState.manifest && (
            <>
              <p className="text-xs text-silver-mist">
                Generated {manifestState.manifest.generatedAt} for commit{" "}
                <span className="font-mono">{manifestState.manifest.commit}</span>
                {manifestState.manifest.sourceState?.dirty ? " (exact dirty-worktree snapshot)" : ""} on{" "}
                {manifestState.manifest.platform} (Node {manifestState.manifest.nodeVersion}).
              </p>
              {!manifestState.matchesSource && (
                <p className="rounded border border-ember/40 bg-ember/10 px-3 py-2 text-xs text-ember">
                  This manifest does not match the exact current source or active symbol dataset
                  {manifestState.currentDirty ? " (the worktree has uncommitted changes)" : ""}. It was generated
                  for commit {manifestState.manifest.commit}; current HEAD is {manifestState.head || "unknown"}.
                  The results below may be stale — re-run{" "}
                  <code className="font-mono">npm run verify:manifest</code>.
                </p>
              )}
              <ul className="space-y-2 font-mono text-sm">
                {manifestState.manifest.commands.map((c) => (
                  <li key={c.command}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-silver-moon">{c.command}</span>
                      <span className={c.passed ? "text-gold-300" : "text-ember"}>
                        {c.passed ? "pass" : `exit ${c.exitCode}`}
                        {c.testsTotal !== undefined ? ` · ${c.testsPassed}/${c.testsTotal} tests` : ""}
                      </span>
                    </div>
                    {c.note && <p className="mt-0.5 font-body text-xs text-silver-mist">{c.note}</p>}
                  </li>
                ))}
              </ul>
              {manifestState.manifest.audit && (
                <p className="text-xs text-silver-mist">
                  npm audit: {manifestState.manifest.audit.vulnerabilities ?? "unavailable"} vulnerabilities (full tree),{" "}
                  {manifestState.manifest.audit.omitDevVulnerabilities ?? "unavailable"} (production-only).
                </p>
              )}
            </>
          )}
        </section>

        <footer className="pb-8 text-center text-xs text-silver-mist">
          This dashboard only reports what the system can verify about itself. It never exposes connection
          strings, API keys, or other credentials.
        </footer>
      </div>
    </main>
  );
}
