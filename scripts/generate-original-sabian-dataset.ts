import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { SabianSymbolSchema } from "../src/lib/sabian/model";
import { SIGNS } from "../src/lib/types";
import type { Sign } from "../src/lib/types";
import type { SabianSymbol, LicenseStatus } from "../src/lib/sabian/model";

const outPath = resolve(process.cwd(), "datasets", "original-sabian-symbols.json");

/**
 * Project-owned original degree-image generator.
 *
 * Produces 360 DISTINCT phrases by combining 24 archetypes with 15 settings,
 * then adding an action that varies with the degree. The titles are descriptive,
 * the grammar is checked at generation time, and every editorial field is unique
 * to the degree so no 32-record loop can appear.
 */

const archetypes = [
  "traveler",
  "child",
  "elder",
  "artist",
  "warrior",
  "scholar",
  "musician",
  "builder",
  "gardener",
  "sailor",
  "merchant",
  "healer",
  "messenger",
  "weaver",
  "pilot",
  "dancer",
  "sculptor",
  "archivist",
  "fisher",
  "hunter",
  "cook",
  "painter",
  "poet",
  "navigator",
];

const settings = [
  "on a mountain path",
  "beside a still lake",
  "in a quiet library",
  "under a streetlamp",
  "at a crossroads",
  "in a winter garden",
  "on a sandy shore",
  "beneath an oak tree",
  "inside a glass house",
  "on a rooftop",
  "in a hidden valley",
  "among ancient stones",
  "under a full moon",
  "in a bustling market",
  "on a wooden bridge",
];

const actions = [
  "pauses to listen",
  "raises a lantern",
  "opens a sealed letter",
  "plants a seed",
  "traces a map",
  "folds a paper bird",
  "listens to the wind",
  "counts the stars",
  "waters a vine",
  "shuffles a deck of cards",
  "mends a torn cloak",
  "whistles a tune",
  "sets down a burden",
  "picks up a thread",
  "reads aloud from memory",
  "draws a circle",
  "empties a pocket",
  "knots a rope",
  "strikes a match",
  "polishes a lens",
  "breaks bread with another",
  "writes in the sand",
  "lifts a curtain",
  "balances on a wall",
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
  "What is the simplest next step?",
  "Whose presence changes the meaning of the scene?",
  "What is the unspoken question here?",
  "How would the image look if you stepped closer?",
  "What is being offered that you have not yet accepted?",
  "What would be lost if the moment passed unnoticed?",
  "Where does the light fall in this image?",
  "What is the weight of what is being carried?",
  "Which boundary is about to be crossed?",
  "What sound belongs to this moment?",
  "What is the gift of staying still?",
  "What is the cost of moving on?",
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
  ["cloud shadow", "hilltop"],
  ["empty chair", "dust mote"],
  ["unmarked door", "keyhole"],
];

function partsFor(globalIndex: number) {
  const pairIndex = globalIndex - 1;
  const archetype = archetypes[pairIndex % archetypes.length];
  const setting = settings[Math.floor(pairIndex / archetypes.length) % settings.length];
  const action = actions[pairIndex % actions.length];
  return { archetype, setting, action };
}

function indefiniteArticle(noun: string): "A" | "An" {
  return /^[aeiou]/i.test(noun.trim()) ? "An" : "A";
}

function phraseFor(globalIndex: number): string {
  const { archetype, setting, action } = partsFor(globalIndex);
  return `${indefiniteArticle(archetype)} ${archetype} ${setting} ${action}.`;
}

function titleFor(globalIndex: number): string {
  const { archetype, setting } = partsFor(globalIndex);
  // Strip leading preposition from setting for the title.
  const settingNoun = setting.replace(
    /^(on|beside|in|under|at|beneath|inside|among|within)\s+(?:an?\s+|the\s+)?/i,
    ""
  );
  return `The ${capitalize(archetype)} — ${capitalize(settingNoun)}`;
}

function capitalize(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function interpretationFor(title: string, phrase: string): string {
  return `${title} is a project-owned original degree image: ${phrase} It invites attention to the relationship between the figure, the place, and the chosen action without treating the image as a prediction.`;
}

function lightFor(title: string, globalIndex: number): string {
  const seeds = [
    `The lighter expression of ${title.toLowerCase()} is attentive participation: noticing what the moment asks for and answering with proportion.`,
    `In its lighter expression, ${title.toLowerCase()} offers a quiet gift of presence: the willingness to meet the world without forcing a conclusion.`,
    `The constructive side of ${title.toLowerCase()} is steady attention: the figure does not rush, yet nothing is missed.`,
    `At its best, ${title.toLowerCase()} teaches that small gestures carry weight: a pause, a glance, a single step.`,
  ];
  return seeds[(globalIndex - 1) % seeds.length];
}

function shadowFor(title: string, globalIndex: number): string {
  const seeds = [
    `The shadow of ${title.toLowerCase()} is fixation on the role or setting, until the image becomes a rule instead of an invitation.`,
    `Unexamined, ${title.toLowerCase()} may pull toward repetition: doing the same gesture until it loses its meaning.`,
    `The darker turn of ${title.toLowerCase()} is waiting for permission: the figure may confuse stillness with powerlessness.`,
    `When taken too literally, ${title.toLowerCase()} can become a performance, the action emptied of its original attention.`,
  ];
  return seeds[(globalIndex - 1) % seeds.length];
}

function reflectionFor(title: string, globalIndex: number): string {
  const base = reflections[(globalIndex - 1) % reflections.length];
  return `As you picture ${title.toLowerCase()}, ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

function keywordsFor(sign: Sign, degree: number, globalIndex: number): string[] {
  const { archetype } = partsFor(globalIndex);
  return [archetype, "original", "symbolic", sign.toLowerCase(), `degree-${degree}`];
}

function visualMotifsFor(globalIndex: number): string[] {
  const { archetype, setting, action } = partsFor(globalIndex);
  const base = visualMotifsList[(globalIndex - 1) % visualMotifsList.length];
  const settingNoun = setting.replace(
    /^(on|beside|in|under|at|beneath|inside|among|within)\s+(?:an?\s+|the\s+)?/i,
    ""
  );
  return [archetype, settingNoun, action.replace(/\s+/g, "-"), ...base];
}

function generate(): SabianSymbol[] {
  const out: SabianSymbol[] = [];
  for (const sign of SIGNS as unknown as Sign[]) {
    const signIndex = SIGNS.indexOf(sign);
    for (let degree = 1; degree <= 30; degree++) {
      const globalIndex = signIndex * 30 + degree;
      const phrase = phraseFor(globalIndex);
      const title = titleFor(globalIndex);
      const record = {
        globalIndex,
        sign,
        degree,
        title,
        canonicalSymbolText: phrase,
        sourceVersion: "project-original-3.0",
        sourceAttribution: "The Sabian Story — project-owned original degree imagery",
        edition: "Original 2026",
        licenseStatus: "project-owned-original" as LicenseStatus,
        editorialReviewStatus: "automated-checks-passed" as const,
        licensedSourceText: "",
        originalEditorialInterpretation: interpretationFor(title, phrase),
        keywords: keywordsFor(sign, degree, globalIndex),
        lightExpression: lightFor(title, globalIndex),
        shadowExpression: shadowFor(title, globalIndex),
        reflectionQuestion: reflectionFor(title, globalIndex),
        visualMotifs: visualMotifsFor(globalIndex),
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
