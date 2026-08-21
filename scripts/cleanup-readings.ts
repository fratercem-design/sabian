/**
 * Development cleanup command.
 *
 * Removes readings older than the configured retention period (or a
 * --days=N override). Run with: npm run cleanup:readings
 */

import { createReadingRepository } from "@/lib/db/reading-repository";
import { env } from "@/lib/config";

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--days="));
  const days = arg ? Number(arg.split("=")[1]) : env.READING_RETENTION_DAYS;
  if (!Number.isFinite(days) || days <= 0) {
    console.error("Invalid retention days.");
    process.exit(1);
  }
  const repo = createReadingRepository();
  const removed = await repo.cleanup(days);
  console.log(`Cleanup complete: removed ${removed} reading(s) older than ${days} day(s).`);
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
