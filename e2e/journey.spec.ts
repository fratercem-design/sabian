import { test, expect, type Page } from "@playwright/test";

/**
 * The primary browser journey, end to end:
 *  landing → form (known time) → generation → reading → reload → delete.
 */

const KNOWN_TIME_READING = {
  name: "Avery Testington",
  date: "1990-06-15",
  time: "14:30",
  place: "London",
};

async function fillBirthForm(page: Page, input: typeof KNOWN_TIME_READING, unknownTime = false) {
  await page.goto("/reading/new");

  // Step 1: name.
  await page.getByLabel("Display name").fill(input.name);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: date.
  await page.getByLabel("Birth date").fill(input.date);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: time (known or unknown).
  if (unknownTime) {
    await page.getByLabel("I don't know my exact birth time").check();
  } else {
    await page.getByLabel("I know my birth time").check();
    await page.getByLabel("Exact local birth time").fill(input.time);
  }
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: birthplace.
  await page.getByLabel("Search for your birthplace").fill(input.place);
  await expect(page.getByRole("button", { name: /London/ }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /London/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5: review + consent.
  await expect(page.getByText("Review your birth record")).toBeVisible();
  await page.getByRole("checkbox").check();
  return page;
}

test("complete journey: landing → known-time reading → reload → delete", async ({ page }) => {
  // 1. Landing page.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Sabian Story" })).toBeVisible();
  await expect(page.getByText("Testing Preview").first()).toBeVisible();
  await expect(page.getByText("Every degree contains an image")).toBeVisible();

  // 2. Begin a reading.
  await page.getByRole("link", { name: "Begin Your Reading" }).first().click();
  await expect(page.getByRole("heading", { name: "Begin Your Reading" })).toBeVisible();

  // 3. Fill the known birth record.
  await fillBirthForm(page, KNOWN_TIME_READING);

  // 4. Review shows the resolved place and timezone before submission.
  await expect(page.getByText("Europe/London")).toBeVisible();

  // 5. Generate.
  await page.getByRole("button", { name: "Generate My Reading" }).click();

  // 6. Wait for the reading to be ready.
  await expect(page.getByRole("heading", { name: /Avery Testington/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Your Celestial Signature")).toBeVisible();

  // 7. Confirm displayed planetary degrees match the deterministic chart.
  // Sun for 1990-06-15 14:30 London is Gemini 24°11′ (from the ephemeris).
  await expect(page.getByText("Gemini 24°11′", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Sun", { exact: true }).first()).toBeVisible();

  // 8. Sabian mappings displayed.
  await expect(page.getByText(/Sabian/).first()).toBeVisible();

  // 9. Story + artwork render.
  await expect(page.getByRole("heading", { name: "A story in seven images" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The First Image" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A Closing Reflection" })).toBeVisible();
  await expect(page.getByText("Demo artwork — deterministic emblem").first()).toBeVisible();
  await expect(page.getByText("Demo interpretation — deterministic text").first()).toBeVisible();

  const url = page.url();
  const id = url.split("/").pop()!;

  // 10. Reload and confirm consistency.
  await page.reload();
  await expect(page.getByRole("heading", { name: /Avery Testington/ })).toBeVisible();
  await expect(page.getByText("Gemini 24°11′", { exact: false }).first()).toBeVisible();

  // 11. Delete the reading and confirm it is no longer accessible.
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Reading" }).click();
  await page.waitForURL("**/");
  await page.goto(`/reading/${id}`);
  await expect(page.getByText("This page is not in the wheel")).toBeVisible();
});
