import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { getAppUrl } from "@/lib/app-url";

export const SITE_NAME = "Passport";

export const DEFAULT_TITLE = "Passport — Trade Compliance & Shipment Intelligence";

export const DEFAULT_DESCRIPTION =
  "Upload trade documents, verify cross-document consistency, run regulatory checks, and collaborate with brokers — before customs filing.";

export const SITE_KEYWORDS = [
  "trade compliance",
  "customs clearance",
  "import compliance",
  "Ghana import",
  "Nigeria import",
  "Kenya import",
  "commercial invoice verification",
  "shipment readiness",
  "customs broker collaboration",
  "trade document verification",
  "African import corridors",
  "pre-clearance compliance",
] as const;

/** Paths that should appear in sitemap.xml and be indexable. */
export function getPublicSitemapPaths(): string[] {
  return [
    "/",
    "/help",
    "/legal",
    ...LEGAL_DOCUMENTS.map((doc) => `/legal/${doc.slug}`),
  ];
}

/** Paths that must never be indexed (auth + app shell). */
export const NOINDEX_PATH_PREFIXES = [
  "/admin",
  "/dashboard",
  "/settings",
  "/shipments",
  "/analytics",
  "/readiness",
  "/compliance",
  "/compliance-alerts",
  "/invitations",
  "/auth",
  "/api",
] as const;

export function getSiteUrl(): string {
  try {
    return getAppUrl();
  } catch {
    return (
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "http://localhost:3000"
    );
  }
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (path === "/" || path === "") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
