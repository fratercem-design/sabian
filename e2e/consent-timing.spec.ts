import { test, expect, type Page } from "@playwright/test";

/**
 * Consent timing.
 *
 * The claim the interface makes must match the order in which requests
 * actually happen:
 *
 *  1. No place query reaches /api/places until the location-provider
 *     disclosure has been acknowledged.
 *  2. No birth record reaches /api/reading/review until processing consent
 *     has been given.
 *  3. Raw birth details never appear in a URL, at any point in the journey.
 */

const BIRTH = {
  name: "Consent Tester",
  date: "1977-08-09",
  time: "03:45",
  place: "London",
};

/** Every request URL the page issues, in order. */
function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.method() + " " + request.url()));
  return urls;
}

/** Every URL the top-level frame has occupied. */
function recordNavigations(page: Page): string[] {
  const urls: string[] = [page.url()];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) urls.push(frame.url());
  });
  return urls;
}

test("no birth record reaches the review endpoint before processing consent", async ({ page }) => {
  const requests = recordRequests(page);
  const navigations = recordNavigations(page);

  await page.goto("/reading/new");

  await page.getByLabel("Name or nickname").fill(BIRTH.name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Birth date").fill(BIRTH.date);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I know my birth time").check();
  await page.getByLabel("Recorded time").fill(BIRTH.time);
  await page.getByRole("button", { name: "Continue" }).click();

  // On the birthplace step, before the disclosure is acknowledged, the field
  // is disabled and no place query has been issued.
  const field = page.getByLabel("Birthplace", { exact: true });
  await expect(field).toBeDisabled();
  expect(requests.filter((u) => u.includes("/api/places"))).toHaveLength(0);

  // Acknowledge the disclosure, then search. Now — and only now — a place
  // query is allowed.
  await page.getByLabel("I understand and want to search.").check();
  await expect(field).toBeEnabled();
  await field.fill(BIRTH.place);
  await expect(page.getByRole("option", { name: /London/ }).first()).toBeVisible({ timeout: 15_000 });
  expect(requests.filter((u) => u.includes("/api/places")).length).toBeGreaterThan(0);

  // The place query carries ONLY the free-text query — no name, date or time.
  for (const entry of requests.filter((u) => u.includes("/api/places"))) {
    expect(entry).not.toContain(BIRTH.date);
    expect(entry).not.toContain(encodeURIComponent(BIRTH.name));
    expect(entry).not.toContain("03%3A45");
  }

  await page.getByRole("option", { name: /London/ }).first().click();

  // Still no review request: processing consent has not been given.
  expect(requests.filter((u) => u.includes("/api/reading/review"))).toHaveLength(0);

  // Continue is refused, and the error names the missing consent.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert", { name: "Please check one thing:" })).toContainText(
    /consent to processing/i
  );
  expect(requests.filter((u) => u.includes("/api/reading/review"))).toHaveLength(0);

  // Give processing consent; only then does the review endpoint see anything.
  await page.getByLabel(/I consent to processing my birth date/).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Review your birth record")).toBeVisible();
  await expect
    .poll(() => requests.filter((u) => u.includes("/api/reading/review")).length, { timeout: 15_000 })
    .toBeGreaterThan(0);

  // No raw birth detail ever appeared in a URL — neither a request URL nor a
  // page URL. Birth data travels in request bodies only.
  for (const entry of [...requests, ...navigations]) {
    expect(entry).not.toContain(BIRTH.date);
    expect(entry).not.toContain(encodeURIComponent(BIRTH.name));
    expect(entry).not.toContain("03%3A45");
    expect(entry).not.toContain("03:45");
  }
});

test("the reading URL carries only an opaque identifier", async ({ page }) => {
  await page.goto("/reading/new");
  await page.getByLabel("Name or nickname").fill(BIRTH.name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Birth date").fill(BIRTH.date);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I know my birth time").check();
  await page.getByLabel("Recorded time").fill(BIRTH.time);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I understand and want to search.").check();
  await page.getByLabel("Birthplace", { exact: true }).fill(BIRTH.place);
  await page.getByRole("option", { name: /London/ }).first().click();
  await page.getByLabel(/I consent to processing my birth date/).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Review your birth record")).toBeVisible();
  await page.getByRole("button", { name: "Create My Reading" }).click();

  await expect(page.getByRole("heading", { name: /Consent Tester/ })).toBeVisible({ timeout: 30_000 });

  const path = new URL(page.url()).pathname;
  const id = path.split("/").pop() ?? "";
  expect(path).toMatch(/^\/reading\/[A-Za-z0-9_-]+$/);
  // High entropy, and nothing recognisable from the birth record.
  expect(id.length).toBeGreaterThanOrEqual(16);
  expect(id).not.toContain("1977");
  expect(id.toLowerCase()).not.toContain("consent");
  expect(id.toLowerCase()).not.toContain("london");
});
