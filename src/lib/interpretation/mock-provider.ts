/**
 * InterpretationProvider — text generation for the reading.
 *
 * The deterministic mock provider produces a complete, original,
 * chart-derived reading with NO AI calls. It is clearly labeled as demo
 * content in the UI. A live provider (Anthropic/OpenAI, selected via
 * TEXT_PROVIDER env) implements the same interface; its output is validated
 * with Zod and may be retried once on validation failure.
 */

import { seededRandom } from "@/lib/config";
import type {
  InterpretationInput,
  InterpretationOutput,
} from "@/lib/interpretation/contract";

export interface InterpretationProvider {
  /** Generate the full reading interpretation. */
  generate(input: InterpretationInput): Promise<InterpretationOutput>;
  /** Provider name for disclosure, e.g. "deterministic mock" or "anthropic". */
  readonly name: string;
}

const STORY_TITLES = [
  "The First Image",
  "The Inner Chamber",
  "The Mask and the Threshold",
  "Allies and Gifts",
  "The Central Tension",
  "The Road Ahead",
  "A Closing Reflection",
] as const;

const SIGN_NATURE: Record<string, { element: string; quality: string; image: string }> = {
  Aries: { element: "fire", quality: "initiating", image: "a first spark that refuses to be dampened" },
  Taurus: { element: "earth", quality: "steadfast", image: "ground that holds what has been planted" },
  Gemini: { element: "air", quality: "curious", image: "two windows looking onto the same world" },
  Cancer: { element: "water", quality: "sheltering", image: "a tide that remembers every shore" },
  Leo: { element: "fire", quality: "radiant", image: "a hearth kept burning through the night" },
  Virgo: { element: "earth", quality: "discerning", image: "a careful hand separating seed from chaff" },
  Libra: { element: "air", quality: "harmonizing", image: "a balance that listens before it weighs" },
  Scorpio: { element: "water", quality: "transformative", image: "a depth that turns what it touches" },
  Sagittarius: { element: "fire", quality: "expansive", image: "an arrow drawn toward the far horizon" },
  Capricorn: { element: "earth", quality: "enduring", image: "a stairway cut into living rock" },
  Aquarius: { element: "air", quality: "original", image: "a vessel poured out for the many" },
  Pisces: { element: "water", quality: "dissolving", image: "a sea where every boundary softens" },
};

function pick(rand: () => number, items: string[]): string {
  return items[Math.floor(rand() * items.length)];
}

function gateText(input: InterpretationInput, key: "sun" | "moon" | "ascendant", rand: () => number) {
  const placement = input.placements.find((p) => p.key === key);
  const symbol = input.symbols.find((s) => s.globalIndex === placement?.globalIndex);
  const nature = SIGN_NATURE[placement?.sign ?? "Aries"] ?? SIGN_NATURE.Aries;
  const title = symbol?.title ?? "An unnamed image";
  return {
    title,
    placement: `${placement?.sign} ${placement?.degree}°${String(placement?.minute ?? 0).padStart(2, "0")}′ — Sabian ${placement?.sabianDegree}`,
    symbol: `${title} (${placement?.sign} ${placement?.sabianDegree})`,
    interpretation: `The image of "${title}" speaks to a ${nature.quality} quality within you — ${nature.image}. This symbol may suggest that your ${key === "sun" ? "conscious purpose" : key === "moon" ? "emotional nature" : "approach to the world"} is touched by ${pick(rand, ["a slow unfolding", "a sudden recognition", "a quiet insistence", "an unexpected lightness"])}.`,
    light: `In its lighter expression, this degree can support ${pick(rand, ["clarity of intent", "gentle persistence", "an open hand", "a steady gaze"])}.`,
    shadow: `Unexamined, it may pull toward ${pick(rand, ["rigidity", "withdrawal", "over-identification", "restless doubt"])} — an invitation to awareness, not a verdict.`,
    reflectionQuestion: symbol?.reflectionQuestion ?? "Where in your life is this image already at work?",
  };
}

export class MockInterpretationProvider implements InterpretationProvider {
  readonly name = "deterministic mock (demo)";

  async generate(input: InterpretationInput): Promise<InterpretationOutput> {
    const rand = seededRandom(
      [input.displayName, input.birthDate, input.birthTime ?? "unknown", input.place.longitude].join("|")
    );

    const sun = gateText(input, "sun", rand);
    const moon = gateText(input, "moon", rand);
    const ascAvailable = input.timeKnown;
    const ascendant = ascAvailable
      ? ({ available: true as const, ...gateText(input, "ascendant", rand) })
      : ({
          available: false as const,
          explanation:
            "Your birth time is not known, so the Ascendant — the sign rising over the eastern horizon at your birth — cannot be calculated. This reading honors that: the Ascendant, Midheaven, and houses are omitted rather than guessed. When you learn your birth time, this panel will open.",
        });

    const planets = input.placements
      .filter((p) => !["sun", "moon", "ascendant", "midheaven", "north_node"].includes(p.key))
      .map((p) => {
        const symbol = input.symbols.find((s) => s.globalIndex === p.globalIndex);
        const nature = SIGN_NATURE[p.sign] ?? SIGN_NATURE.Aries;
        return {
          planet: p.name,
          sabianDegree: p.sabianDegree,
          sign: p.sign,
          keywords: (symbol?.keywords.length ? symbol.keywords : ["reflection", "threshold", p.sign.toLowerCase()]),
          interpretation: `${p.name} rests in ${p.sign} ${p.degree}°, at the ${p.sabianDegree}${ordinal(p.sabianDegree)} degree — ${nature.image}. The symbol "${symbol?.title ?? "an unnamed image"}" may suggest how this part of your nature seeks ${pick(rand, ["expression", "integration", "recognition", "steady form"])}.`,
          relationship: `Together with the Sun and Moon, ${p.name} adds ${pick(rand, ["a counterweight", "a deeper tone", "an enabling force", "a quiet counterpoint"])} to the overall story.`,
        };
      });

    const tensions = input.timeKnown
      ? [
          "The Sun's image and the Moon's image pull in slightly different directions — one asks for form, the other for feeling. The work of this reading is to let both be true.",
          "A tension between what is inherited and what is chosen runs through the planetary chorus; it may surface as a recurring choice rather than a conflict to solve.",
        ]
      : [
          "Without a birth time, the relationship between the Sun and Moon carries the central tension of this reading — the known and the felt, the visible and the interior.",
          "The planetary chorus suggests a recurring rhythm between holding on and letting go.",
        ];

    const story = STORY_TITLES.map((title, i) => ({
      title,
      body: storyBody(i, input, sun, moon, ascAvailable, planets, rand),
    }));

    return {
      summary: `This reading gathers the images of your birth sky into a single, gently told story. Your Sun rests at ${sun.placement}; your Moon at ${moon.placement}.${input.timeKnown ? ` The Ascendant, the mask you wear toward the world, stands at ${ascendant.available ? ascendant.placement : "an unknown degree"}.` : ""} The symbols found there are treated as invitations — pictures to contemplate — rather than statements about who you are.`,
      coreThemes: [
        pick(rand, ["emergence", "threshold", "recognition"]),
        pick(rand, ["integration", "witnessing", "tenderness"]),
        pick(rand, ["continuity", "transformation", "attention"]),
      ],
      sun,
      moon,
      ascendant,
      planets,
      tensions,
      story,
      journalPrompts: [
        `What image from this reading lingered longest, and what might it be asking of you?`,
        `Where in your life right now is the ${sun.placement.split("—")[0]?.trim() ?? "Sun"} theme most alive?`,
        `If your symbols were a place, what would it look like — and what would you do there first?`,
      ],
      groundingExercise:
        "Find a quiet minute. Place your feet on the floor, close your eyes, and name three things you can feel: the weight of your body, the air on your skin, the ground beneath you. Then recall the single image from this reading that felt most true, and let it rest in your mind without needing to do anything with it.",
      affirmation: `I am allowed to be an unfolding story, not a fixed verdict.`,
      imagePrompts: {
        sun: `${sun.title} — a symbolic celestial painting, ${natureFor(sun.title)}, deep indigo and antique gold, illuminated-manuscript detail, contemplative and mysterious, no text.`,
        moon: `${moon.title} — lunar silver and muted ember, Art Nouveau geometry, tactile painted texture, no text.`,
        ascendant: ascAvailable
          ? `${ascendant.available ? ascendant.title : ""} — a threshold scene, celestial geometry, parchment light, elegant and mysterious, no text.`
          : "The Sun and the Moon together in one image — a combined celestial emblem, deep indigo and lunar silver, contemplative, no text.",
      },
      safetyDisclaimer:
        "This reading is a reflective and entertainment exercise. It is not medical, legal, financial, or mental-health advice, and it makes no claims about your future. If you are struggling, please reach out to a qualified professional.",
    };
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

function natureFor(title: string): string {
  return `inspired by ${title}, with figures in quiet motion`;
}

function storyBody(
  index: number,
  input: InterpretationInput,
  sun: { title: string },
  moon: { title: string },
  ascAvailable: boolean,
  planets: Array<{ planet: string }>,
  rand: () => number
): string {
  const name = input.displayName.split(" ")[0] ?? "you";
  const sunTitle = sun.title;
  const moonTitle = moon.title;
  const planetNames = planets.map((p) => p.planet.toLowerCase());
  const ally = planetNames.length > 0 ? planetNames[Math.floor(rand() * planetNames.length)] : "an unseen ally";
  const ally2 = planetNames.length > 1 ? planetNames[(Math.floor(rand() * planetNames.length) + 1) % planetNames.length] : "another companion";

  const ascendantChapter = ascAvailable
    ? `At the threshold between you and the world stands a third image, worn like a garment no one asked you to choose. It is how you step forward, how you are first seen. It may suggest that the world meets you through a particular doorway — and that you may change the doorway without changing what waits behind it.\n\nThe Ascendant is not who you are; it is how you arrive. It is the first impression you make before a word is spoken, the posture you take when a door opens, the version of yourself that handles the morning. This is not a mask in the sense of a disguise — it is a threshold, and thresholds are real. They shape what crosses them. The image at your threshold may suggest that you meet the world through a particular quality: openness, steadiness, wit, warmth. Whatever it is, it has served you, and it may also have limited you. This chapter is an invitation to examine the doorway itself — to ask whether it still fits, and whether the room behind it has changed more than the door has.`
    : `There is a threshold in every life, and yours was not recorded — the exact degree rising on your eastern horizon at birth is unknown. This reading does not invent it. Instead, it honors the unmarked doorway: whatever you were about to become, you became it through an opening no one noted down.\n\nNot knowing your birth time is not a failure; it is simply a boundary of the record. Many lives have been lived without this particular line being drawn, and the story of a life does not require it. What this chapter asks of you instead is a different kind of attention: to the thresholds you have actually crossed, the doors you have opened and closed, the way you step forward when the hour is unmarked. The Ascendant may be unknown in the sky, but it is written in your habits — how you greet, how you defend, how you begin. This reading will not pretend to know the degree; it will simply walk with you to the door.`;

  const bodies = [
    `Before you spoke, before anyone gave you a name, an image was already forming in the sky above your birthplace — a picture no one else in the world was given at quite the same moment. This is the first image: ${sunTitle}. One way to read it is as a seed — something that does not yet know what it will become, only that it is meant to grow toward light. The story of ${name} begins there, not with an answer, but with a picture.\n\nConsider what a seed requires: soil that holds it, water that reaches it, and time that is not rushed. The image of your Sun asks something similar of you. It does not demand that you become anything quickly, or that you justify your pace to anyone. It invites you to notice the conditions you are planted in, the ground beneath your feet, and the light you are already turning toward. This chapter is not a prediction; it is a beginning. Every life that has ever been lived began with an image held in mind before it could be spoken aloud. Yours is no different. What the image asks of you is simply attention — the willingness to look at it again and again, and to let it change as you change.`,
    `Deeper still, where the day's noise cannot reach, another image keeps its own time: ${moonTitle}. This may be the chamber where feeling is kept — the part of you that remembers before it understands. It may suggest that your emotional weather has its own logic, tides that answer to a moon no calendar charts. You are not required to explain this chamber to anyone; it is enough that you visit it.\n\nThere are rooms in every life that no visitor is shown, and the Moon's image often stands at the door of one of them. In this chamber, the questions are not about what you do, but about what you need: what restores you, what drains you, what you reach for when no one is watching. The image may speak of nourishment, of shelter, of the way you return to yourself after the day has spent you. It may also speak of a hunger you have learned not to name. Both belong to the same room. This chapter asks you to sit with your own tides — to notice when they rise and when they fall, and to trust that the moon that moves them has never once failed to return.`,
    ascendantChapter,
    `Around these central images, others gather like companions: ${planetNames.slice(0, 3).join(", ") || "the slower travelers"} among them. Each carries a gift — one offers endurance, another imagination, another the will to begin again. In this chapter, they are simply introduced: allies whose names you will learn by living with them. The image of ${ally} may be closer than it appears.\n\nA life is not carried by its Sun and Moon alone. Around them move the quieter voices: the one that argues with the world, the one that longs, the one that builds, the one that waits, the one that breaks what no longer serves. Each of these voices has a degree and an image of its own, and each one asks to be heard on its own terms. ${ally2} may appear as a small thing at first — an irritation, a recurring dream, a habit you cannot explain — but the chorus does not sing in the foreground. It sings underneath, and it has been singing since your first breath. This chapter is a listening exercise: not to decide which voice is right, but to learn the sound of each one, so that when one of them speaks in a moment of decision, you recognize it for what it is.`,
    `Every story holds a knot, and this one is no different. The images of your sky do not all agree — the one that asks for stillness and the one that asks for motion, the one that guards and the one that opens. This is not a flaw in the story; it is the tension that gives it shape. One way to read this is as an invitation to hold two truths at once, without forcing them to resolve.\n\nThe central tension of a chart is rarely a problem to be solved; it is more often a conversation to be sustained. The image that wants to build and the image that wants to wander are not enemies — they are two seasons of the same land. When they pull against each other, the feeling can be one of being divided, of never quite arriving. But consider: a string that is pulled taut is the one that makes music. The knot in this chapter is where your story generates its particular tone. The invitation is not to cut the knot, but to learn its shape — to notice when one voice is drowning out the other, and to give the quieter one the floor now and then. Over time, the tension you once experienced as conflict may begin to read as rhythm.`,
    `What lies ahead is not written in any degree of the zodiac. The symbols suggest directions, not destinations — weather, not fate. The road ahead may look like ${pick(rand, ["a long, patient ascent", "a series of surprising turns", "a shoreline that appears only at low tide", "a bridge built one stone at a time"])}. What matters is not the map, but the walking.\n\nThis is the chapter where the reading must be most careful with its language, because the future is precisely what no symbol can claim to know. The images of your sky describe tendencies, climates, and seasons — not events. A chart that speaks of discipline does not promise a difficult career; it describes a temperament that meets difficulty with steadiness. A chart that speaks of imagination does not promise artistry; it describes a mind that cannot help but make meaning. What lies ahead is the consequence of these tendencies meeting the choices you make, and the choices remain yours. This chapter offers no predictions and asks for no certainty. It asks only that you walk — and that you notice, as you walk, which images grow clearer and which fade.`,
    `Return now to the first image: ${sunTitle}. It has not changed, but you have — you have spent these pages living inside it. The closing reflection is simple: you are the author of the interpretation, not its object. The sky offered pictures; only you can say what they mean. Carry ${moonTitle} in your inner chamber, wear your threshold however you choose, and let the story continue to write itself.\n\nA reading is not a verdict delivered from above; it is a mirror held at an angle. What you saw in these pages was never the whole of you — no image could hold that. What the symbols can do is point: they can gesture toward the rooms you already carry, the voices you already hear, the thresholds you already cross. The rest is yours. Keep the images that felt true, set aside the ones that did not, and return to them in a season when they may read differently. The story of ${name} is not finished; it is being written by the living, and it will continue to surprise even its author.`,
  ];
  return bodies[index] ?? bodies[bodies.length - 1];
}

export function createInterpretationProvider(): InterpretationProvider {
  return new MockInterpretationProvider();
}
