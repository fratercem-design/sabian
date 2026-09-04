import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { SabianSymbolSchema } from "../src/lib/sabian/model";
import { SIGNS } from "../src/lib/types";
import type { Sign } from "../src/lib/types";
import type { SabianSymbol, LicenseStatus } from "../src/lib/sabian/model";

const outPath = resolve(process.cwd(), "datasets", "original-sabian-symbols.json");

const archetypes = [
  "traveler", "child", "elder", "artist", "warrior", "scholar", "musician", "builder",
  "gardener", "sailor", "merchant", "healer", "messenger", "watchmaker", "weaver", "pilot",
  "dancer", "sculptor", "archivist", "fisher", "hunter", "cook", "painter", "poet",
  "mechanic", "athlete", "midwife", "blacksmith", "navigator", "dreamer", "stranger", "companion",
];

const settings = [
  "on a mountain path", "beside a still lake", "in a quiet library", "under a streetlamp",
  "at a crossroads", "in a winter garden", "on a sandy shore", "beneath an oak tree",
  "inside a glass house", "on a rooftop", "in a hidden valley", "among ancient stones",
  "under a full moon", "in a bustling market", "on a wooden bridge", "within a labyrinth",
  "at the edge of town", "in a candlelit room", "on a drifting boat", "beside a fountain",
  "in a mirrored hall", "under a railway arch", "on a hilltop meadow", "in a silent temple",
  "among blooming poppies", "on a cobblestone street", "inside a clock tower", "under an awning",
  "in a sunlit atelier", "at the threshold of a door", "on a winding staircase", "in a sheltered cove",
];

const actions = [
  "pauses to listen", "raises a lantern", "opens a sealed letter", "plants a seed",
  "traces a map", "folds a paper bird", "listens to the wind", "counts the stars",
  "waters a vine", "shuffles a deck of cards", "mends a torn cloak", "whistles a tune",
  "sets down a burden", "picks up a thread", "reads aloud from memory", "draws a circle",
  "empties a pocket", "knots a rope", "strikes a match", "polishes a lens",
  "breaks bread with another", "writes in the sand", "lifts a curtain", "balances on a wall",
  "tunes an instrument", "holds up a mirror", "scatters seeds", "catches rain in cupped hands",
  "lights a candle", "closes a gate", "offers a key", "reaches toward the horizon",
];

const reflections = [
  "What is beginning that you cannot yet name?",
  "Where does your attention want to rest?",
  "What pattern are you being invited to complete?",
  "Who or what is waiting just outside the frame?",
  "What small act would restore balance?",
  "What truth have you been carrying in silence?",
  "What threshold are you approaching?",
  "What is ready to be released?",
  "What detail keeps returning to you?",
  "What would change if you moved first?",
  "What are you guarding that no longer needs protection?",
  "What signal is trying to reach you?",
];

const visualMotifsList = [
  ["dawn light", "open road"],
  ["falling leaf", "stone wall"],
  ["woven cloth", "bronze bell"],
  ["bird in flight", "weather vane"],
  ["glass bottle", "driftwood"],
  ["iron gate", "overgrown path"],
  ["compass needle", "faded map"],
  ["seed pod", "clay vessel"],
  ["mirror surface", "burning wick"],
  ["spiral shell", "tide line"],
  ["lantern glow", "mist"],
  ["broken pottery", "new growth"],
];

function phraseFor(sign: string, signIndex: number, degree: number): string {
  const globalIndex = signIndex * 30 + degree;
  const archetype = archetypes[(globalIndex * 7) % archetypes.length];
  const setting = settings[(globalIndex * 13) % settings.length];
  const action = actions[(globalIndex * 17) % actions.length];
  return `A ${archetype} ${setting} ${action}.`;
}

function interpretationFor(_sign: Sign, _degree: number, phrase: string): string {
  const seed = phrase.length + _degree;
  const light = seed % 3;
  if (light === 0) {
    return `This degree points toward fresh initiative and the courage to begin before the path is fully clear.`;
  }
  if (light === 1) {
    return `This degree speaks to patience, gathering, and the steady work of tending what is already in motion.`;
  }
  return `This degree invites reflection, completion, and the wisdom that comes from having traveled far enough to see the whole pattern.`;
}

function shadowFor(): string {
  return `The tension here is between moving forward and waiting for certainty; either extreme can stall the work.`;
}

function reflectionFor(_sign: Sign, _degree: number, phrase: string): string {
  const seed = phrase.length + _degree;
  return reflections[(seed * 5) % reflections.length];
}

function keywordsFor(sign: Sign, degree: number): string[] {
  return ["original", "symbolic", sign.toLowerCase(), `degree-${degree}`];
}

function visualMotifsFor(sign: Sign, degree: number): string[] {
  const globalIndex = SIGNS.indexOf(sign) * 30 + degree;
  return visualMotifsList[globalIndex % visualMotifsList.length];
}

function generate(): SabianSymbol[] {
  const out: SabianSymbol[] = [];
  for (const sign of SIGNS as unknown as Sign[]) {
    const signIndex = SIGNS.indexOf(sign);
    for (let degree = 1; degree <= 30; degree++) {
      const globalIndex = signIndex * 30 + degree;
      const phrase = phraseFor(sign, signIndex, degree);
      const title = `${sign} ${degree}`;
      const record = {
        globalIndex,
        sign,
        degree,
        title,
        canonicalSymbolText: phrase,
        sourceVersion: "original-1.0",
        // These phrases were written for this project in 2026, so they are the
        // project's own copyrighted work. "public-domain-original" is reserved
        // for wording that can be shown to be genuinely public domain (see
        // docs/data-license.md); applying it here would read as dedicating
        // original work to the public domain.
        sourceAttribution: "The Sabian Story — original content, all rights reserved",
        edition: "Original 2026",
        licenseStatus: "licensed" as LicenseStatus,
        originalEditorialInterpretation: interpretationFor(sign, degree, phrase),
        keywords: keywordsFor(sign, degree),
        lightExpression: interpretationFor(sign, degree, phrase),
        shadowExpression: shadowFor(),
        reflectionQuestion: reflectionFor(sign, degree, phrase),
        visualMotifs: visualMotifsFor(sign, degree),
      };
      out.push(SabianSymbolSchema.parse(record));
    }
  }
  return out;
}

const dataset = generate();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(dataset, null, 2));
console.log(`Wrote ${outPath} (${dataset.length} records)`);
