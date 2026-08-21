import { test, expect } from "@playwright/test";

/**
 * Unknown birth time: the app must clearly omit the Ascendant, Midheaven,
 * and houses, and explain why — in the UI and in the saved reading JSON.
 */

test("unknown-time reading omits Ascendant, Midheaven, and houses", async ({ page, request }) => {
  await page.goto("/reading/new");

  // Step 1: name.
  await page.getByLabel("Display name").fill("Morgan Unknown");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: date.
  await page.getByLabel("Birth date").fill("1985-03-14");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: unknown time.
  await page.getByLabel("I don't know my exact birth time").check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: birthplace.
  await page.getByLabel("Search for your birthplace").fill("New York");
  await expect(page.getByRole("button", { name: /New York City/ }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /New York City/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5: review shows the unknown-time disclosure and the reference
  // instant — with the actual UTC birth instant clearly marked unknown.
  await expect(page.getByText("Unknown — time-independent placements only")).toBeVisible();
  await expect(page.getByText("Actual UTC birth instant")).toBeVisible();
  await expect(page.getByText("Not known — no time was supplied")).toBeVisible();
  await expect(page.getByText("Disclosed reference instant", { exact: true })).toBeVisible();
  await expect(page.getByText("1985-03-14T05:00:00.000Z")).toBeVisible(); // NY EST midnight reference
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate My Reading" }).click();

  // Reading ready.
  await expect(page.getByRole("heading", { name: /Morgan Unknown/ })).toBeVisible({ timeout: 30_000 });

  // The Ascendant panel is replaced by an explanation, never invented.
  await expect(page.getByRole("heading", { name: "Your birth time is not known" })).toBeVisible();
  await expect(page.getByText("Not calculated").first()).toBeVisible();
  const signs = "Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces";
  await expect(page.getByText(new RegExp(`Ascendant\\s+(${signs})\\s+\\d+°`))).toHaveCount(0);

  // The saved reading JSON must contain no ascendant/midheaven/houses.
  const id = page.url().split("/").pop()!;
  const res = await request.get(`/api/readings/${id}`);
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { reading: { chart: { placements: Array<{ key: string }>; houses?: unknown } } };
  const keys = body.reading.chart.placements.map((p) => p.key);
  expect(keys).not.toContain("ascendant");
  expect(keys).not.toContain("midheaven");
  expect(body.reading.chart.houses).toBeUndefined();

  // Midheaven shows "Not calculated" too.
  await expect(page.getByText("Not calculated")).toHaveCount(2);
});
