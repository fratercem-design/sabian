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

function partsFor(signIndex: number, degree: number) {
  // Encode the zero-based global degree across actor + setting instead of
  // deriving every field from the same modulo-32 value. The pair is unique
  // for all 360 records; action adds a third independent variation.
  const zeroBased = signIndex * 30 + degree - 1;
  return {
    archetype: archetypes[zeroBased % archetypes.length],
    setting: settings[Math.floor(zeroBased / archetypes.length) % settings.length],
    action: actions[(zeroBased * 17 + signIndex * 3 + degree) % actions.length],
  };
}

function indefiniteArticle(noun: string): "A" | "An" {
  return /^[aeiou]/i.test(noun) ? "An" : "A";
}

function titleCaseWords(value: string): string {
  return value
    .replace(/^(on|beside|in|under|at|beneath|inside|among|within)\s+(?:an?\s+|the\s+)?/i, "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function phraseFor(signIndex: number, degree: number): string {
  const { archetype, setting, action } = partsFor(signIndex, degree);
  return `${indefiniteArticle(archetype)} ${archetype} ${setting} ${action}.`;
}

function titleFor(signIndex: number, degree: number): string {
  const { archetype, setting } = partsFor(signIndex, degree);
  return `The ${titleCaseWords(archetype)} — ${titleCaseWords(setting)}`;
}

function interpretationFor(title: string, phrase: string): string {
  return `${title} is a project-owned original degree image: ${phrase} It invites attention to the relationship between the figure, the place, and the chosen action without treating the image as a prediction.`;
}

function lightFor(title: string): string {
  return `The lighter expression of ${title.toLowerCase()} is attentive participation: noticing what the moment asks for and answering with proportion.`;
}

function shadowFor(title: string): string {
  return `The shadow of ${title.toLowerCase()} is fixation on the role or setting, until the image becomes a rule instead of an invitation.`;
}

function reflectionFor(title: string, globalIndex: number): string {
  const base = reflections[(globalIndex - 1) % reflections.length];
  return `As you picture ${title.toLowerCase()}, ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

function keywordsFor(sign: Sign, degree: number): string[] {
  return ["original", "symbolic", sign.toLowerCase(), `degree-${degree}`];
}

function visualMotifsFor(degree: number, signIndex: number): string[] {
  const globalIndex = signIndex * 30 + degree;
  const { archetype, setting, action } = partsFor(signIndex, degree);
  const base = visualMotifsList[(globalIndex - 1) % visualMotifsList.length];
  return [archetype, setting.replace(/^(on|beside|in|under|at|beneath|inside|among|within)\s+(?:an?\s+|the\s+)?/i, ""), action, ...base];
}

function generate(): SabianSymbol[] {
  const out: SabianSymbol[] = [];
  for (const sign of SIGNS as unknown as Sign[]) {
    const signIndex = SIGNS.indexOf(sign);
    for (let degree = 1; degree <= 30; degree++) {
      const globalIndex = signIndex * 30 + degree;
      const phrase = phraseFor(signIndex, degree);
      const title = titleFor(signIndex, degree);
      const record = {
        globalIndex,
        sign,
        degree,
        title,
        canonicalSymbolText: phrase,
        sourceVersion: "project-original-2.0",
        sourceAttribution: "The Sabian Story — project-owned original degree imagery",
        edition: "Original 2026",
        licenseStatus: "project-owned-original" as LicenseStatus,
        editorialReviewStatus: "automated-checks-passed" as const,
        licensedSourceText: "",
        originalEditorialInterpretation: interpretationFor(title, phrase),
        keywords: keywordsFor(sign, degree),
        lightExpression: lightFor(title),
        shadowExpression: shadowFor(title),
        reflectionQuestion: reflectionFor(title, globalIndex),
        visualMotifs: visualMotifsFor(degree, signIndex),
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
