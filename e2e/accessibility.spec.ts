import { test, expect, type Page } from "@playwright/test";

/**
 * Accessibility of the reading intake.
 *
 * Covers the behaviours automation can actually prove: the birth-time gate,
 * full keyboard operation of the birthplace combobox and its ARIA state, focus
 * destinations after a step change and after a failed validation, and minimum
 * touch-target size at 390px.
 *
 * Automated checks are a floor, not a ceiling: keyboard order and
 * screen-reader announcements still need a manual pass.
 */

async function toTimeStep(page: Page, name = "A11y Tester") {
  await page.goto("/reading/new");
  await page.getByLabel("Name or nickname").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Birth date").fill("1990-06-15");
  await page.getByRole("button", { name: "Continue" }).click();
}

async function toPlaceStep(page: Page) {
  await toTimeStep(page);
  await page.getByLabel("I know my birth time").check();
  await page.getByLabel("Recorded time").fill("14:30");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I understand and want to search.").check();
}

test.describe("birth-time certainty has no default", () => {
  test("neither option is preselected and Continue is refused", async ({ page }) => {
    await toTimeStep(page);

    await expect(page.getByLabel("I know my birth time")).not.toBeChecked();
    await expect(page.getByLabel("I don't know it")).not.toBeChecked();
    // No time input is offered, so no placeholder value can exist.
    await expect(page.getByLabel("Recorded time")).toHaveCount(0);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert", { name: "Please check one thing:" })).toContainText(
      /whether your birth time is known/i
    );
    // Still on the time step.
    await expect(page.getByLabel("I know my birth time")).toBeVisible();
  });

  test("choosing 'known' reveals an empty time field, never 12:00", async ({ page }) => {
    await toTimeStep(page);
    await page.getByLabel("I know my birth time").check();
    const field = page.getByLabel("Recorded time");
    await expect(field).toBeVisible();
    await expect(field).toHaveValue("");

    // An empty time is refused rather than silently defaulted.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert", { name: "Please check one thing:" })).toContainText(
      /recorded birth time/i
    );
  });
});

test.describe("birthplace combobox", () => {
  test("exposes combobox and listbox semantics", async ({ page }) => {
    await toPlaceStep(page);
    const field = page.getByLabel("Birthplace", { exact: true });

    await expect(field).toHaveAttribute("role", "combobox");
    await expect(field).toHaveAttribute("aria-autocomplete", "list");
    await expect(field).toHaveAttribute("aria-expanded", "false");

    await field.fill("London");
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 15_000 });
    await expect(field).toHaveAttribute("aria-expanded", "true");

    const controls = await field.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await expect(page.locator(`#${controls}`)).toHaveAttribute("role", "listbox");
    expect(await page.getByRole("option").count()).toBeGreaterThan(1);
  });

  test("both Londons are selectable with the keyboard alone", async ({ page }) => {
    for (const target of ["England", "Ontario"] as const) {
      await toPlaceStep(page);
      const field = page.getByLabel("Birthplace", { exact: true });
      await field.click();
      await page.keyboard.type("London");
      await expect(page.getByRole("listbox")).toBeVisible({ timeout: 15_000 });
      // Park the pointer away from the list so hover cannot set the active
      // option; this test proves the keyboard path alone.
      await page.mouse.move(0, 0);

      // Walk the list with Arrow Down until the wanted option is active,
      // then commit with Enter. No pointer is used for the selection.
      const options = page.getByRole("option");
      const total = await options.count();
      let chosen = -1;
      for (let i = 0; i < total; i++) {
        if (((await options.nth(i).textContent()) ?? "").includes(target)) {
          chosen = i;
          break;
        }
      }
      expect(chosen).toBeGreaterThanOrEqual(0);

      for (let i = 0; i <= chosen; i++) await page.keyboard.press("ArrowDown");
      await expect(field).toHaveAttribute(
        "aria-activedescendant",
        (await options.nth(chosen).getAttribute("id")) ?? ""
      );
      await page.keyboard.press("Enter");

      await expect(page.locator("p", { hasText: /^Selected:/ })).toContainText(target);
      await expect(field).toHaveAttribute("aria-expanded", "false");
      // Focus never left the combobox.
      await expect(field).toBeFocused();
    }
  });

  test("Escape closes the list, then clears the field", async ({ page }) => {
    await toPlaceStep(page);
    const field = page.getByLabel("Birthplace", { exact: true });
    await field.click();
    await page.keyboard.type("London");
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Escape");
    await expect(field).toHaveAttribute("aria-expanded", "false");
    await expect(field).toHaveValue("London");

    await page.keyboard.press("Escape");
    await expect(field).toHaveValue("");
  });
});

test.describe("focus management", () => {
  test("the step heading receives focus after a step change", async ({ page }) => {
    await page.goto("/reading/new");
    await page.getByLabel("Name or nickname").fill("Focus Tester");
    await page.getByRole("button", { name: "Continue" }).click();

    const heading = page.locator("legend", { hasText: "When were you born?" });
    await expect(heading).toBeFocused();
  });

  test("the error summary receives focus and links to the field", async ({ page }) => {
    await page.goto("/reading/new");
    await page.getByRole("button", { name: "Continue" }).click();

    const summary = page.getByRole("alert", { name: "Please check one thing:" });
    await expect(summary).toBeFocused();
    await summary.getByRole("link").first().click();
    await expect(page.getByLabel("Name or nickname")).toBeFocused();
  });
});

test.describe("touch targets at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("intake controls are at least 44px tall", async ({ page }) => {
    await toPlaceStep(page);

    // Checkboxes are measured by their clickable label, which is the real
    // target, rather than by the 20px box inside it.
    const targets = [
      page.getByRole("button", { name: "Continue" }),
      page.getByRole("button", { name: "Back" }),
      page.getByLabel("Birthplace", { exact: true }),
      page.locator('label[for="placeDisclosureAck"]'),
      page.locator('label[for="processingConsent"]'),
    ];

    for (const target of targets) {
      const box = await target.first().boundingBox();
      expect(box, "control should be laid out").not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});
