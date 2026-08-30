/** Git source-state fingerprint used by the verification manifest. */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface SourceState {
  head: string;
  dirty: boolean;
  fingerprint: string;
}

function git(args: string[], encoding: "utf8"): string;
function git(args: string[], encoding: "buffer"): Buffer;
function git(args: string[], encoding: "utf8" | "buffer"): string | Buffer {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

export function currentSourceState(): SourceState {
  try {
    const head = git(["rev-parse", "--short", "HEAD"], "utf8").trim();
    // Next.js and incremental TypeScript rewrite these tracked generated files
    // during an otherwise read-only verification run. They are build metadata,
    // not authored source, so exclude them from the certification fingerprint.
    const diffArgs = [
      "diff",
      "--binary",
      "HEAD",
      "--",
      ".",
      ":(exclude)next-env.d.ts",
      ":(exclude)tsconfig.tsbuildinfo",
    ];
    const trackedDiff = git(diffArgs, "buffer");
    const untracked = git(
      ["ls-files", "--others", "--exclude-standard", "-z"],
      "utf8"
    )
      .split("\0")
      .filter(Boolean)
      .sort();
    const hash = createHash("sha256");
    hash.update(head);
    hash.update("\0tracked-diff\0");
    hash.update(trackedDiff);
    for (const relativePath of untracked) {
      hash.update("\0untracked\0");
      hash.update(relativePath);
      hash.update("\0");
      hash.update(readFileSync(join(process.cwd(), relativePath)));
    }
    // The authorized corpus is intentionally gitignored, but it materially
    // changes application behavior and must invalidate an old verification.
    const datasetPath = join(
      process.cwd(),
      "src",
      "lib",
      "sabian",
      "generated",
      "full-dataset.json"
    );
    if (existsSync(datasetPath)) {
      hash.update("\0active-sabian-dataset\0");
      hash.update(readFileSync(datasetPath));
    }
    return {
      head,
      dirty: trackedDiff.length > 0 || untracked.length > 0,
      fingerprint: hash.digest("hex"),
    };
  } catch {
    return { head: "", dirty: false, fingerprint: "" };
  }
}
