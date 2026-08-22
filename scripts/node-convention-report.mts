/**
 * North Node convention comparison report (Task 3).
 *
 * Compares the engine's osculating node against the SE mean and true nodes
 * for every gold-master fixture and counts how often the choice would change
 * the displayed Sabian degree / global index.
 */

import { createChartProvider } from "../src/lib/chart/provider";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const gold = JSON.parse(readFileSync(join(process.cwd(), "docs", "goldmaster", "fixtures.json"), "utf8"));
const provider = createChartProvider();

function sabianOf(longitude) {
  const norm = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const inSign = norm - signIndex * 30;
  return { sabianDegree: Math.floor(inSign) + 1, globalIndex: signIndex * 30 + (Math.floor(inSign) + 1) };
}

const rows = [];
const changes = { mean: 0, true: 0 };
for (const fixture of gold.fixtures) {
  const chart = provider.calculate({ utc: new Date(fixture.utcIso), latitude: fixture.lat, longitude: fixture.lon, timeKnown: fixture.timeKnown });
  const engine = chart.placements.find((p) => p.key === "north_node");
  const seMean = fixture.placements.find((p) => p.key === "mean_node");
  const seTrue = fixture.placements.find((p) => p.key === "true_node");
  const engineSab = sabianOf(engine.longitude);
  const meanSab = sabianOf(seMean.longitude);
  const trueSab = sabianOf(seTrue.longitude);
  if (engineSab.globalIndex !== meanSab.globalIndex) changes.mean++;
  if (engineSab.globalIndex !== trueSab.globalIndex) changes.true++;
  rows.push({
    id: fixture.id,
    engine: engine.longitude.toFixed(3),
    seMean: seMean.longitude.toFixed(3),
    seTrue: seTrue.longitude.toFixed(3),
    dMean: Math.min(Math.abs(engine.longitude - seMean.longitude), 360 - Math.abs(engine.longitude - seMean.longitude)).toFixed(3),
    dTrue: Math.min(Math.abs(engine.longitude - seTrue.longitude), 360 - Math.abs(engine.longitude - seTrue.longitude)).toFixed(3),
    engineSabian: `${engineSab.globalIndex}`,
    meanSabian: `${meanSab.globalIndex}`,
    trueSabian: `${trueSab.globalIndex}`,
    sabianChangesVsMean: engineSab.globalIndex !== meanSab.globalIndex,
    sabianChangesVsTrue: engineSab.globalIndex !== trueSab.globalIndex,
  });
}

console.table(rows);
console.log(`Sabian-degree changes vs SE MEAN: ${changes.mean}/${gold.fixtures.length}`);
console.log(`Sabian-degree changes vs SE TRUE: ${changes.true}/${gold.fixtures.length}`);
