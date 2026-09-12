import { test, expect } from "@playwright/test";

/**
 * Discoverability and privacy metadata.
 *
 * Public surfaces must be findable: canonical URLs, descriptions, social
 * cards, robots.txt and sitemap.xml. Personal surfaces must be the opposite:
 * noindex, no shared caching, and absent from the sitemap.
 */

const SITE = "https://www.psychesymbols.xyz";

async function head(page: import("@playwright/test").Page, selector: string, attr: string) {
  return page.locator(selector).first().getAttribute(attr);
}

test.describe("public metadata", () => {
  test("home page exposes canonical, description and social cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", SITE);

    const description = await head(page, 'meta[name="description"]', "content");
    expect(description).toBeTruthy();
    expect((description ?? "").length).toBeGreaterThan(60);

    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );

    // The generated Open Graph image must actually resolve to a PNG.
    const ogImage = await head(page, 'meta[property="og:image"]', "content");
    expect(ogImage).toBeTruthy();
    const imageResponse = await page.request.get(new URL(ogImage!).pathname);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toContain("image/png");
  });

  test("method and privacy pages are canonical and indexable", async ({ page }) => {
    for (const [path, canonical] of [
      ["/about/method", `${SITE}/about/method`],
      ["/privacy", `${SITE}/privacy`],
    ] as const) {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
      const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
      // Either absent (inherits the indexable default) or explicitly indexable.
      if (robots) expect(robots).not.toContain("noindex");
      const description = await head(page, 'meta[name="description"]', "content");
      expect(description).toBeTruthy();
    }
  });

  test("robots.txt is served and excludes private surfaces", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Sitemap: https://www.psychesymbols.xyz/sitemap.xml");
    expect(body).toContain("Disallow: /reading/");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Disallow: /dev/");
  });

  test("sitemap.xml is served and lists only public routes", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain(`${SITE}</loc>`);
    expect(body).toContain(`${SITE}/about/method`);
    expect(body).toContain(`${SITE}/privacy`);
    // No reading identifiers, ever.
    expect(body).not.toContain("/reading/");
  });
});

test.describe("private metadata", () => {
  test("the intake form is noindex", async ({ page }) => {
    await page.goto("/reading/new");
    const robots = await head(page, 'meta[name="robots"]', "content");
    expect(robots).toContain("noindex");
    expect(robots).toContain("nofollow");
  });

  test("a reading page is noindex and never shared-cached", async ({ page, request }) => {
    const created = await request.post("/api/readings", {
      data: {
        displayName: "Metadata Probe",
        birthDate: "1991-04-05",
        birthTime: "08:20",
        timeKnown: true,
        placeId: "london-uk",
        consent: true,
      },
    });
    expect(created.status()).toBe(201);
    const { reading } = (await created.json()) as { reading: { id: string } };

    const res = await request.get(`/reading/${reading.id}`);
    expect(res.status()).toBe(200);
    const headers = res.headers();
    // `next dev` normalizes dynamic responses to `no-cache, must-revalidate`.
    // The proxy unit test asserts the exact private/no-store policy, while this
    // browser test guards the security property that matters in either mode:
    // the response must never be publicly or edge cached.
    expect(headers["cache-control"]).not.toContain("public");
    expect(headers["cache-control"]).not.toContain("s-maxage");
    expect(headers["x-robots-tag"]).toContain("noindex");
    expect(headers["x-robots-tag"]).toContain("noarchive");

    await page.goto(`/reading/${reading.id}`);
    const robots = await head(page, 'meta[name="robots"]', "content");
    expect(robots).toContain("noindex");
    expect(robots).toContain("nofollow");
    // A private reading must not carry a social preview that leaks its URL.
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);

    // Cleaning up after ourselves keeps the e2e database small.
    await request.delete(`/api/readings/${reading.id}`);
  });
});
