import type { MetadataRoute } from "next";
import { noIndexRoutes, siteUrl } from "@/lib/config";

/**
 * robots.txt
 *
 * Public surfaces are crawlable. The intake form, personal readings, the API
 * and the development readiness dashboard are excluded, because those carry
 * birth details or are not public product surfaces. Personal reading routes
 * additionally send `X-Robots-Tag: noindex, nofollow, noarchive` and
 * `Cache-Control: private, no-store` (see next.config.mjs) so exclusion does
 * not depend on a crawler honouring this file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...noIndexRoutes],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
