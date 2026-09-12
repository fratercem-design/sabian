import { expect, test, type Page } from "@playwright/test";

const reading = {
  id: "test-reading-id",
  displayName: "Psyche Tester",
  birthDate: "1990-01-02",
  birthTime: "12:30",
  timeKnown: true,
  place: { id: "london", displayName: "London", country: "England", latitude: 51.5, longitude: -0.1, timezone: "Europe/London" },
  status: "ready",
  saved: false,
  isDemo: true,
  chart: {
    placements: [
      { key: "sun", name: "Sun", glyph: "☉", sign: "Capricorn", degree: 11, minute: 22, second: 0, sabianDegree: 12 },
      { key: "moon", name: "Moon", glyph: "☽", sign: "Pisces", degree: 2, minute: 10, second: 0, sabianDegree: 3 },
      { key: "ascendant", name: "Ascendant", glyph: "Asc", sign: "Taurus", degree: 8, minute: 8, second: 0, sabianDegree: 9 },
    ],
  },
  interpretation: {
    summary: "Three original images gather into a private constellation of reflection.",
    coreThemes: ["signal", "threshold", "sovereignty"],
    sun: { title: "The Quiet Instrument", placement: "Capricorn 11°22′ — Psyche 12", symbol: "A brass instrument waits beside a dark window.", interpretation: "Attention gives form to the signal.", light: "Patient clarity.", shadow: "Rigidity mistaken for truth.", reflectionQuestion: "What becomes audible when you stop forcing an answer?" },
    moon: { title: "The Listening Pool", placement: "Pisces 2°10′ — Psyche 3", symbol: "Moonlight gathers in an untouched pool.", interpretation: "Feeling receives what language cannot yet hold.", light: "Receptivity.", shadow: "Losing shape in another current.", reflectionQuestion: "Which feeling needs witness rather than explanation?" },
    ascendant: { available: true, title: "The Open Gate", placement: "Taurus 8°08′ — Psyche 9", symbol: "A gate opens onto a field before dawn.", interpretation: "Arrival can be gentle and unmistakable.", light: "Grounded presence.", shadow: "Waiting until the moment has passed.", reflectionQuestion: "How do you enter without abandoning your own pace?" },
    story: Array.from({ length: 7 }, (_, index) => ({ title: `Movement ${index + 1}`, body: "The image changes as attention changes. This is a mirror, not a verdict." })),
    journalPrompts: ["What image stayed?", "Where is the signal clearest?"],
    groundingExercise: "Feel the floor beneath you and name three things that are here now.",
    affirmation: "I remain the author of the meaning I make.",
    safetyDisclaimer: "This reading is for reflection and entertainment, not professional advice.",
  },
};

async function mockApi(page: Page) {
  await page.route("**/api/places**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [reading.place] }) }));
  await page.route("**/api/reading/review", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ place: reading.place, utcIso: "1990-01-02T12:30:00.000Z", offsetLabel: "UTC+00:00", dstKind: "standard", timeKnown: true, timeNotation: null }) }));
  await page.route("**/api/readings", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ reading }) }));
  await page.route("**/api/readings/test-reading-id", (route) => {
    const method = route.request().method();
    if (method === "PATCH") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: true }) });
    if (method === "DELETE") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ deleted: true }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reading: { ...reading, saved: true } }) });
  });
}

test("bundled mobile journey creates and renders a reading without overflow", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Open a mirror/ })).toBeVisible();
  await page.getByRole("button", { name: "Open Your Mirrors" }).click();
  await page.getByLabel("Name or nickname").fill("Psyche Tester");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Birth date").fill("1990-01-02");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I know my birth time").check();
  await page.getByLabel("Recorded time").fill("12:30");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I understand and want to search.").check();
  await page.getByLabel("Birthplace").fill("London");
  await page.getByRole("option").getByRole("button").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Europe/London", { exact: false })).toBeVisible();
  await page.getByLabel(/I consent to creating this reading/).check();
  await page.getByRole("button", { name: "Create My Reading" }).click();
  await expect(page.getByRole("heading", { name: "Psyche Tester" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The three gates" })).toBeVisible();
  await expect(page.getByText("Psyche 12", { exact: false }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("offline state is explicit and blocks a new reading", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText("Offline · your details have not been sent")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Your Mirrors" })).toBeDisabled();
});
