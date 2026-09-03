import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parsedSynthetic360 } from "../test-fixtures/synthetic-dataset";

const outPath = resolve(process.cwd(), "test-fixtures", "synthetic-360.json");
writeFileSync(outPath, JSON.stringify(parsedSynthetic360(), null, 2));
console.log(`Wrote ${outPath}`);
