/**
 * Story provider smoke test — controlled live call for the interpretation API.
 *
 * Usage:
 *   TEXT_PROVIDER=anthropic TEXT_API_KEY=... TEXT_MODEL=... npm run smoke:story
 *     → verifies credentials are present (read-only)
 *   TEXT_PROVIDER=anthropic TEXT_API_KEY=... TEXT_MODEL=... npm run smoke:story -- --apply
 *     → performs a single live call and validates the output contract
 *
 * The script exits 0 on success and non-zero on any failure. It does not touch
 * the production database or artwork cache.
 */

import { LiveInterpretationProvider } from "@/lib/interpretation/live-provider";
import { validateInterpretation } from "@/lib/interpretation/contract";
import { env } from "@/lib/config";

const PLACEMENT = {
  key: "sun",
  name: "Sun",
  sign: "Aries",
  degree: 1,
  minute: 0,
  second: 0,
  sabianDegree: 1,
  globalIndex: 1,
};

const SYMBOL = {
  globalIndex: 1,
  sign: "Aries" as const,
  degree: 1,
  title: "The Traveler — Open Road",
  symbolText: "A traveler on a mountain path pauses to listen.",
  licensedSourceText: "",
  licenseStatus: "project-owned-original" as const,
  keywords: ["original", "symbolic", "aries", "degree-1"],
  lightExpression: "Attentive participation.",
  shadowExpression: "Fixation on the role.",
  reflectionQuestion: "What is beginning that you cannot yet name?",
};

async function main() {
  if (!env.TEXT_API_KEY) {
    throw new Error("TEXT_API_KEY is not set. Set it to run a live story smoke test.");
  }

  const provider = new LiveInterpretationProvider();
  console.log(`Story provider: ${provider.name}`);

  if (!process.argv.includes("--apply")) {
    console.log("Credentials present. Pass --apply to perform a live call.");
    return;
  }

  const input = {
    displayName: "Smoke",
    timeKnown: true,
    birthDate: "1990-06-15",
    birthTime: "14:30",
    place: {
      displayName: "Smoke Test City",
      country: "Nowhere",
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
    },
    placements: [PLACEMENT],
    symbols: [SYMBOL],
    houseSystem: "Placidus",
    moonUncertain: false,
  };

  console.log("Sending controlled live story request...");
  const output = await provider.generate(input);
  const validated = validateInterpretation(output);
  if (!validated.ok) {
    throw new Error(`Live story output did not match the contract: ${validated.errors.join("; ")}`);
  }
  console.log(`Live story returned ${validated.data.story.length} chapters and ${validated.data.planets.length} planet cards.`);
  console.log("\nStory provider smoke test passed.");
}

main().catch((error) => {
  console.error("\nStory smoke test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
