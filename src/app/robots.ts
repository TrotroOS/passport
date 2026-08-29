import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/help", "/legal/"],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/settings/",
          "/shipments/",
          "/analytics/",
          "/readiness/",
          "/compliance/",
          "/compliance-alerts/",
          "/invitations/",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
