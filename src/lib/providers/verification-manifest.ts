/**
 * Verification manifest — timestamped, machine-generated record of a full
 * verification run (commit hash, commands, exit codes, test counts).
 *
 * The readiness dashboard never shows hard-coded test/audit counts. It loads
 * this manifest if present and reports whether it matches the current HEAD.
 * If no manifest exists (or it was generated for a different commit), the
 * dashboard says so plainly instead of inventing numbers.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { currentSourceState, type SourceState } from "@/lib/providers/source-state";

export interface ManifestCommand {
  command: string;
  exitCode: number;
  passed: boolean;
  testsPassed?: number;
  testsTotal?: number;
  note?: string;
}

export interface VerificationManifest {
  commit: string;
  sourceState?: SourceState;
  sourceStateStable?: boolean;
  generatedAt: string;
  nodeVersion: string;
  platform: string;
  commands: ManifestCommand[];
  audit?: { vulnerabilities: number; omitDevVulnerabilities: number };
}

export interface ManifestState {
  /** A manifest file exists and parsed. */
  available: boolean;
  /** The manifest's commit equals the current git HEAD. */
  matchesHead: boolean;
  /** Commit and exact tracked/untracked source fingerprint both match. */
  matchesSource: boolean;
  /** Whether the current checkout has tracked or untracked changes. */
  currentDirty: boolean;
  /** Current git HEAD short hash (empty string if unavailable). */
  head: string;
  manifest: VerificationManifest | null;
}

function currentHead(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function manifestPath(): string {
  return join(process.cwd(), "verification-manifest.json");
}

export function loadVerificationManifest(): ManifestState {
  const sourceState = currentSourceState();
  const head = sourceState.head || currentHead();
  let manifest: VerificationManifest | null = null;
  try {
    if (existsSync(manifestPath())) {
      manifest = JSON.parse(readFileSync(manifestPath(), "utf8")) as VerificationManifest;
    }
  } catch {
    manifest = null;
  }
  const available = manifest !== null && typeof manifest.commit === "string";
  const matchesHead = available && head !== "" && manifest!.commit === head;
  const matchesSource = Boolean(
    matchesHead &&
      manifest?.sourceStateStable !== false &&
      manifest?.sourceState?.fingerprint &&
      manifest.sourceState.fingerprint === sourceState.fingerprint
  );
  return { available, matchesHead, matchesSource, currentDirty: sourceState.dirty, head, manifest };
}
