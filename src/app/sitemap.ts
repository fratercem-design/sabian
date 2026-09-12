import type { MetadataRoute } from "next";
import { publicRoutes, siteUrl } from "@/lib/config";

/**
 * sitemap.xml
 *
 * Only public, indexable product surfaces appear here. Reading identifiers are
 * never enumerated: a reading URL is private to the person who created it, so
 * listing one in a sitemap would publish it.
 */
const CHANGE_FREQUENCY: Record<string, "monthly" | "yearly"> = {
  "/": "monthly",
  "/about/method": "monthly",
  "/privacy": "yearly",
};

const PRIORITY: Record<string, number> = {
  "/": 1,
  "/about/method": 0.8,
  "/privacy": 0.5,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return publicRoutes.map((route) => ({
    url: route === "/" ? siteUrl : `${siteUrl}${route}`,
    lastModified,
    changeFrequency: CHANGE_FREQUENCY[route] ?? "monthly",
    priority: PRIORITY[route] ?? 0.5,
  }));
}
