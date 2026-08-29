import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/types";
import { absoluteUrl, getPublicSitemapPaths } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(LEGAL_LAST_UPDATED);

  return getPublicSitemapPaths().map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/legal/") ? 0.5 : 0.7,
  }));
}
