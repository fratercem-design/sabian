import { test, expect } from "@playwright/test";

/**
 * Mobile-width check at 390px: the landing page and the reading form must
 * be usable, readable, and not overflow horizontally.
 */

test.use({ viewport: { width: 390, height: 844 } });

test("landing page renders correctly at 390px", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Sabian Story" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Begin Your Reading" }).first()).toBeVisible();

  // No horizontal scroll on mobile.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);

  // The hero wheel exists and is present.
  await expect(page.locator("svg[aria-hidden='true']").first()).toBeVisible();
});

test("birth form works end-to-end at 390px", async ({ page }) => {
  await page.goto("/reading/new");
  await page.getByLabel("Display name").fill("Mobile Test");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Birth date").fill("1990-06-15");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I know my birth time").check();
  await page.getByLabel("Exact local birth time").fill("14:30");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Search for your birthplace").fill("Paris");
  await expect(page.getByRole("button", { name: /Paris/ }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Paris/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Review your birth record")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate My Reading" }).click();
  await expect(page.getByRole("heading", { name: /Mobile Test/ })).toBeVisible({ timeout: 30_000 });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
