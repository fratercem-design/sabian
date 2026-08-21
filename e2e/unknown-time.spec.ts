import { test, expect } from "@playwright/test";

/**
 * Unknown birth time: the app must clearly omit the Ascendant, Midheaven,
 * and houses, and explain why.
 */

test("unknown-time reading omits Ascendant, Midheaven, and houses", async ({ page }) => {
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

  // Step 5: review shows unknown-time notation.
  await expect(page.getByText("Unknown — time-independent placements only")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate My Reading" }).click();

  // Reading ready.
  await expect(page.getByRole("heading", { name: /Morgan Unknown/ })).toBeVisible({ timeout: 30_000 });

  // The Ascendant panel is replaced by an explanation, never invented.
  await expect(page.getByRole("heading", { name: "Your birth time is not known" })).toBeVisible();
  await expect(page.getByText("Not calculated").first()).toBeVisible();
  // No invented Ascendant placement: the Ascendant label is never followed
  // by a sign + degree anywhere in the reading.
  const signs = "Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces";
  await expect(page.getByText(new RegExp(`Ascendant\\s+(${signs})\\s+\\d+°`))).toHaveCount(0);
  // The Sun and Moon ARE shown (time-independent placements remain).
  await expect(page.getByText("Pisces 23°33′").first()).toBeVisible();

  // Midheaven shows "Not calculated" too.
  await expect(page.getByText("Not calculated")).toHaveCount(2);
});
