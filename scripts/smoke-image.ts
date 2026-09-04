/**
 * Image provider smoke test — controlled live call for the artwork API.
 *
 * Usage:
 *   IMAGE_PROVIDER=openai IMAGE_API_KEY=... IMAGE_MODEL=... npm run smoke:image
 *     → verifies credentials are present (read-only)
 *   IMAGE_PROVIDER=openai IMAGE_API_KEY=... IMAGE_MODEL=... npm run smoke:image -- --apply
 *     → performs a single live call and validates the returned image URL
 *
 * The script exits 0 on success and non-zero on any failure. It does not touch
 * the production database or artwork cache.
 */

import { LiveImageGenerationProvider } from "@/lib/image/live-provider";
import { env } from "@/lib/config";

async function main() {
  if (!env.IMAGE_API_KEY) {
    throw new Error("IMAGE_API_KEY is not set. Set it to run a live image smoke test.");
  }

  const provider = new LiveImageGenerationProvider();
  console.log(`Image provider: ${provider.name}`);

  if (!process.argv.includes("--apply")) {
    console.log("Credentials present. Pass --apply to perform a live call.");
    return;
  }

  const prompt =
    "A symbolic celestial painting of the Sun motif, inspired by: dawn light, open road. " +
    "Symbolist celestial painting, illuminated-manuscript detail, deep indigo, no readable text.";
  const seed = "smoke-test";
  const cacheKey = `smoke-${Date.now()}`;

  console.log("Sending controlled live image request...");
  const artwork = await provider.generate(prompt, cacheKey, seed);
  if (!artwork.imageUrl) {
    throw new Error("Live image provider returned no image URL");
  }
  console.log(`Live image returned URL: ${artwork.imageUrl.slice(0, 80)}...`);
  console.log("\nImage provider smoke test passed.");
}

main().catch((error) => {
  console.error("\nImage smoke test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
