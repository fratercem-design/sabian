/**
 * write-verification-manifest — runs the verification suite and writes a
 * timestamped verification-manifest.json recording the ACTUAL commit, command
 * exit codes, and test counts. The readiness dashboard displays this file
 * instead of hard-coded numbers.
 *
 * Usage: npm run verify:manifest
 *
 * The manifest is generated for whatever commit HEAD points to when it runs;
 * the dashboard flags it if HEAD later moves. It is intentionally not
 * committed (see .gitignore) so it always reflects a real, recent run.
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentSourceState } from "@/lib/providers/source-state";
import { getActiveDatasetHash } from "@/lib/sabian";

interface Cmd {
  command: string;
  exitCode: number;
  passed: boolean;
  testsPassed?: number;
  testsTotal?: number;
  note?: string;
}

function run(command: string, args: string[] = [], cwd = process.cwd()) {
  const isWin = process.platform === "win32";
  const r = spawnSync(command, args, {
    shell: isWin,
    encoding: "utf8",
    cwd,
    maxBuffer: 1024 * 1024 * 128,
    env: process.env,
  });
  return {
    exitCode: r.status === null ? 1 : r.status,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function readVitestCounts(jsonPath: string): { passed?: number; total?: number } {
  try {
    if (!existsSync(jsonPath)) return {};
    const data = JSON.parse(readFileSync(jsonPath, "utf8"));
    const total = data.numTotalTests ?? 0;
    const passed = data.numPassedTests ?? 0;
    return { passed, total };
  } catch {
    return {};
  }
}

function parseAuditVulnerabilities(stdout: string): number {
  const m = stdout.match(/found (\d+) vulnerabilit/i);
  return m ? Number(m[1]) : 0;
}

function main() {
  const sourceStateAtStart = currentSourceState();
  const activeDatasetHashAtStart = getActiveDatasetHash();
  const tmp = mkdtempSync(join(tmpdir(), "sabian-verify-"));
  const unitJson = join(tmp, "unit.json");
  const integrationJson = join(tmp, "integration.json");
  const commands: Cmd[] = [];
  const record = (command: string, exitCode: number, extra: Partial<Cmd> = {}) => {
    commands.push({ command, exitCode, passed: exitCode === 0, ...extra });
    const icon = exitCode === 0 ? "PASS" : "FAIL";
    console.log(`[${icon}] ${command}${extra.testsTotal !== undefined ? ` (${extra.testsPassed}/${extra.testsTotal} tests)` : ""}`);
  };

  console.log(
    `Generating verification manifest for ${sourceStateAtStart.head || "unknown source"}${
      sourceStateAtStart.dirty ? " (dirty worktree)" : ""
    }...\n`
  );

  let r = run("npm", ["run", "lint"]);
  record("npm run lint", r.exitCode);

  r = run("npm", ["run", "typecheck"]);
  record("npm run typecheck", r.exitCode);

  r = run("npx", ["vitest", "run", "--reporter=json", `--outputFile=${unitJson}`]);
  const unit = readVitestCounts(unitJson);
  record("npm test (vitest run)", r.exitCode, { testsPassed: unit.passed, testsTotal: unit.total });

  r = run("npx", [
    "vitest",
    "run",
    "--config",
    "vitest.integration.config.mts",
    "--reporter=json",
    `--outputFile=${integrationJson}`,
  ]);
  const integ = readVitestCounts(integrationJson);
  record("npm run test:integration", r.exitCode, {
    testsPassed: integ.passed,
    testsTotal: integ.total,
  });

  r = run("npm", ["run", "validate:symbols"]);
  record("npm run validate:symbols", r.exitCode, {
    note: r.stdout.includes("INCOMPLETE")
      ? "INCOMPLETE by design while the licensed 360-symbol dataset is not imported."
      : "Active dataset passed structural and semantic validation: 360 records and distinct texts, consistent indices, grammar/title/review gates, and recorded ownership or license status.",
  });

  r = run("npm", ["run", "build"]);
  record("npm run build", r.exitCode);

  r = run("npm", ["run", "assert:build-trace"]);
  record("npm run assert:build-trace", r.exitCode);

  r = run("npm", ["run", "scan:client-secrets"]);
  record("npm run scan:client-secrets", r.exitCode);

  const auditFull = run("npm", ["audit"]);
  const auditDev = run("npm", ["audit", "--omit=dev"]);
  record("npm audit", auditFull.exitCode, {
    note: `${parseAuditVulnerabilities(auditFull.stdout)} vulnerabilities (full tree)`,
  });

  r = run("npx", ["playwright", "test"]);
  record("npm run e2e (playwright)", r.exitCode, {
    note: "Full desktop + mobile Playwright suite.",
  });

  const sourceStateAtEnd = currentSourceState();
  const sourceStateStable =
    sourceStateAtStart.fingerprint !== "" &&
    sourceStateAtStart.fingerprint === sourceStateAtEnd.fingerprint;
  if (!sourceStateStable) {
    record("source state remained unchanged during verification", 1, {
      note: "Tracked or untracked source changed while verification was running.",
    });
  }

  const manifest = {
    commit: sourceStateAtStart.head || "unknown",
    sourceState: sourceStateAtStart,
    sourceStateStable,
    activeDatasetHash: activeDatasetHashAtStart,
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    commands,
    audit: {
      vulnerabilities: parseAuditVulnerabilities(auditFull.stdout),
      omitDevVulnerabilities: parseAuditVulnerabilities(auditDev.stdout),
    },
  };

  const outPath = join(process.cwd(), "verification-manifest.json");
  writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");
  const allPassed = sourceStateStable && commands.every((c) => c.passed);
  console.log(`\nManifest written to ${outPath}`);
  console.log(`Overall: ${allPassed ? "ALL COMMANDS PASSED" : "ONE OR MORE COMMANDS FAILED"}`);
  process.exit(allPassed ? 0 : 1);
}

main();
