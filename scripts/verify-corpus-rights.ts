/**
 * Fail-closed production rights gate for the active bundled corpus.
 *
 * This verifies evidence, not legal conclusions. It never invents an approval:
 * a real human must review the 360 records and complete the rights manifest.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { SabianSymbolSchema } from "@/lib/sabian/model";

const RightsManifestSchema = z.object({
  schemaVersion: z.literal(1),
  dataset: z.literal("datasets/original-sabian-symbols.json"),
  datasetSha256: z.string().regex(/^[A-F0-9]{64}$/),
  recordCount: z.literal(360),
  rightsBasis: z.literal("project-original"),
  historicalSabianWordingIncluded: z.literal(false),
  status: z.enum(["pending-human-attestation", "approved"]),
  approvedBy: z.string().min(2).nullable(),
  approvedAt: z.string().datetime().nullable(),
  evidence: z.object({
    firstTrackedCommit: z.string().regex(/^[a-f0-9]{40}$/),
    generator: z.literal("scripts/generate-original-sabian-dataset.ts"),
    automatedValidation: z.literal("npm run validate:symbols"),
    humanEditorialReviewCount: z.number().int().min(0).max(360),
    contributorAssignmentOrAuthorshipRecord: z.string().min(1).nullable(),
    outsideCounselReview: z.string().min(1).nullable(),
  }),
});

const root = process.cwd();
const datasetPath = join(root, "datasets", "original-sabian-symbols.json");
const manifestPath = join(root, "datasets", "original-sabian-symbols.rights.json");
const datasetBytes = readFileSync(datasetPath);
const dataset = z.array(SabianSymbolSchema).parse(JSON.parse(datasetBytes.toString("utf8")));
const manifest = RightsManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
const actualHash = createHash("sha256").update(datasetBytes).digest("hex").toUpperCase();
const humanReviewed = dataset.filter((record) => record.editorialReviewStatus === "reviewed").length;

const failures: string[] = [];
if (actualHash !== manifest.datasetSha256) failures.push("manifest hash does not match the dataset bytes");
if (dataset.length !== 360) failures.push(`dataset contains ${dataset.length}, not 360, records`);
if (manifest.evidence.humanEditorialReviewCount !== humanReviewed) {
  failures.push(
    `manifest records ${manifest.evidence.humanEditorialReviewCount} human reviews, but the dataset records ${humanReviewed}`
  );
}
if (humanReviewed !== 360) failures.push(`${360 - humanReviewed} records still require human editorial review`);
if (manifest.status !== "approved") failures.push("rights status is not approved");
if (!manifest.approvedBy || !manifest.approvedAt) failures.push("named, dated human approval is missing");
if (!manifest.evidence.contributorAssignmentOrAuthorshipRecord) {
  failures.push("contributor authorship or assignment evidence is missing");
}

console.log(`Corpus: ${dataset.length}/360 project-original records`);
console.log(`SHA-256: ${actualHash}`);
console.log(`Historical Sabian wording included: ${manifest.historicalSabianWordingIncluded ? "yes" : "no"}`);
console.log(`Human editorial review: ${humanReviewed}/360`);
console.log(`Rights status: ${manifest.status}`);

if (failures.length) {
  console.error("RIGHTS GATE: BLOCKED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`RIGHTS GATE: PASS — approved by ${manifest.approvedBy} at ${manifest.approvedAt}`);
