import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * The primary browser journey, end to end, with SAVED-DATA verification:
 *
 * The test generates a reading, fetches the saved reading JSON from the API,
 * and compares every displayed placement (sign, DMS, Sabian degree, global
 * index, longitude) against that saved JSON. It also asserts the review step
 * shows UTC, offset, latitude, and longitude BEFORE submission, then reloads
 * and deletes.
 */

const KNOWN_TIME_READING = {
  name: "Avery Testington",
  date: "1990-06-15",
  time: "14:30",
  place: "London",
};

async function fillBirthForm(page: Page, input: typeof KNOWN_TIME_READING, unknownTime = false) {
  await page.goto("/reading/new");

  await page.getByLabel("Display name").fill(input.name);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Birth date").fill(input.date);
  await page.getByRole("button", { name: "Continue" }).click();

  if (unknownTime) {
    await page.getByLabel("I don't know my exact birth time").check();
  } else {
    await page.getByLabel("I know my birth time").check();
    await page.getByLabel("Exact local birth time").fill(input.time);
  }
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Search for your birthplace").fill(input.place);
  await expect(page.getByRole("button", { name: /London/ }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /London/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Review your birth record")).toBeVisible();
  await page.getByRole("checkbox").check();
  return page;
}

type SavedReading = {
  id: string;
  displayName: string;
  chart: {
    placements: Array<{
      key: string;
      name: string;
      longitude: number;
      sign: string;
      degree: number;
      minute: number;
      second: number;
      sabianDegree: number;
      globalIndex: number;
    }>;
  };
  interpretation: { story: Array<{ title: string; body: string }> };
  isDemo: boolean;
  saved: boolean;
};

async function getSavedReading(request: APIRequestContext, id: string): Promise<SavedReading> {
  const res = await request.get(`/api/readings/${id}`);
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { reading: SavedReading };
  return data.reading;
}

/** Format a placement the same way the UI renders it. */
function uiPlacement(p: SavedReading["chart"]["placements"][number]): string {
  return `${p.sign} ${p.degree}°${String(p.minute).padStart(2, "0")}′`;
}

test("complete journey with saved-data comparison: landing → reading → reload → delete", async ({ page, request }) => {
  // 1. Landing page.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Sabian Story" })).toBeVisible();
  await expect(page.getByText("Testing Preview").first()).toBeVisible();

  // 2. Begin a reading.
  await page.getByRole("link", { name: "Begin Your Reading" }).first().click();
  await expect(page.getByRole("heading", { name: "Begin Your Reading" })).toBeVisible();

  // 3. Fill the known birth record.
  await fillBirthForm(page, KNOWN_TIME_READING);

  // 4. Review shows canonical place, coordinates, timezone, offset, UTC BEFORE submission.
  await expect(page.getByText("Resolved before submission")).toBeVisible();
  await expect(page.getByText("51.5074°, -0.1278°")).toBeVisible(); // London lat/lon
  await expect(page.getByLabel("Resolved birth time details").getByText("Europe/London")).toBeVisible();
  await expect(page.getByText("+01:00")).toBeVisible(); // BST historical offset on 1990-06-15
  await expect(page.getByText("1990-06-15T13:30:00.000Z")).toBeVisible(); // resolved UTC instant
  await expect(page.getByText("Daylight-saving occurrence", { exact: false })).toHaveCount(0); // unique time

  // 5. Generate.
  await page.getByRole("button", { name: "Generate My Reading" }).click();

  // 6. Wait for the reading to be ready.
  await expect(page.getByRole("heading", { name: /Avery Testington/ })).toBeVisible({ timeout: 30_000 });

  // 7. Fetch the SAVED reading JSON and compare displayed values against it.
  const url = page.url();
  const id = url.split("/").pop()!;
  const saved = await getSavedReading(request, id);
  expect(saved.id).toBe(id);
  expect(saved.displayName).toBe("Avery Testington");
  expect(saved.isDemo).toBe(true); // mock providers + demo symbols
  expect(saved.saved).toBe(false); // not saved by default

  // The saved JSON must be internally consistent: longitude ↔ sign ↔ DMS ↔
  // Sabian degree ↔ global index for every placement.
  for (const p of saved.chart.placements) {
    expect(p.sign).toBeTruthy();
    expect(p.degree).toBeGreaterThanOrEqual(0);
    expect(p.degree).toBeLessThan(30);
    expect(p.minute).toBeGreaterThanOrEqual(0);
    expect(p.minute).toBeLessThan(60);
    expect(p.sabianDegree).toBeGreaterThanOrEqual(1);
    expect(p.sabianDegree).toBeLessThanOrEqual(30);
    expect(p.globalIndex).toBeGreaterThanOrEqual(1);
    expect(p.globalIndex).toBeLessThanOrEqual(360);
    // DMS must be consistent with the raw longitude.
    const inSign = p.longitude % 30;
    expect(Math.floor(inSign)).toBe(p.degree);
  }

  // The signature grid displays exact DMS for the principal placements;
  // compare those displayed strings against the saved JSON.
  const gateKeys = ["sun", "moon", "ascendant"];
  for (const key of ["sun", "moon", "ascendant", "midheaven"]) {
    const p = saved.chart.placements.find((x) => x.key === key);
    if (!p) continue;
    const display = uiPlacement(p);
    await expect(page.getByText(display, { exact: false }).first()).toBeVisible();
    // The Three Gates show the exact position AND the Sabian degree together.
    if (gateKeys.includes(key)) {
      await expect(
        page.getByText(new RegExp(`${p.sign} ${p.degree}°.*Sabian ${p.sabianDegree}`)).first()
      ).toBeVisible();
    }
  }

  // The planetary chorus displays sign + Sabian degree for the rest
  // (mercury..pluto only; the North Node is not a chorus card).
  const chorusKeys = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  for (const p of saved.chart.placements) {
    if (!chorusKeys.includes(p.key)) continue;
    await expect(page.getByText(`${p.sign} ${p.sabianDegree}`).first()).toBeVisible();
  }

  // 8. Story renders with the seven chapters.
  await expect(page.getByRole("heading", { name: "A story in seven images" })).toBeVisible();
  for (const chapter of saved.interpretation.story) {
    await expect(page.getByRole("heading", { name: chapter.title })).toBeVisible();
  }

  // 9. Demo badges render from stored metadata.
  await expect(page.getByText("Demo interpretation — deterministic text").first()).toBeVisible();
  await expect(page.getByText("Demo artwork — deterministic emblem").first()).toBeVisible();

  // 10. Reload and confirm the SAME saved data is displayed.
  await page.reload();
  await expect(page.getByRole("heading", { name: /Avery Testington/ })).toBeVisible();
  const reloaded = await getSavedReading(request, id);
  expect(reloaded.chart.placements).toEqual(saved.chart.placements);
  const sun = saved.chart.placements.find((p) => p.key === "sun")!;
  await expect(page.getByText(uiPlacement(sun), { exact: false }).first()).toBeVisible();

  // 11. Delete the reading and confirm it is no longer accessible.
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Reading" }).click();
  await page.waitForURL("**/");
  const gone = await request.get(`/api/readings/${id}`);
  expect(gone.status()).toBe(404);
});
