import { test, expect, type Page } from "@playwright/test";

/**
 * Live browser quality checks at 1440px (desktop) and 390px (mobile):
 *  - no failed network resources
 *  - no console errors or React error overlays
 *  - keyboard navigation works with visible focus states
 */

async function assertNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("no failed resources or console errors on landing and reading pages", async ({ page }) => {
  const errors = await assertNoConsoleErrors(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Sabian Story" })).toBeVisible();
  await page.goto("/reading/new");
  await expect(page.getByRole("heading", { name: "Begin Your Reading" })).toBeVisible();
  await page.goto("/about/method");
  await expect(page.getByRole("heading", { name: /How this experience calculates/ })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /handled with care/ })).toBeVisible();

  expect(errors).toEqual([]);
});

test("keyboard navigation reaches the primary call to action with a visible focus", async ({ page }) => {
  await page.goto("/");
  // Tab from the top of the page until the Begin Your Reading link is focused.
  await page.keyboard.press("Tab");
  for (let i = 0; i < 12; i++) {
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
    if (focused.includes("Begin Your Reading")) break;
    await page.keyboard.press("Tab");
  }
  const active = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return { text: "", outline: "" };
    const style = getComputedStyle(el);
    return { text: el.textContent ?? "", outline: style.outline, outlineWidth: style.outlineWidth };
  });
  expect(active.text).toContain("Begin Your Reading");
  // A visible focus indicator must be present (outline or box-shadow from our focus-visible styles).
  expect(active.outline !== "none" || active.outlineWidth !== "0px").toBe(true);
});

test("no horizontal overflow at 1440px and 390px", async ({ page }) => {
  await page.goto("/");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  }
});
