import type { Metadata } from "next";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_KEYWORDS,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
} from "@/lib/seo/site";

export interface PageSeoInput {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImagePath?: string;
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: DEFAULT_TITLE,
      template: `%s — ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: [...SITE_KEYWORDS],
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: siteUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: SITE_NAME,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: "/logo.png",
      apple: "/logo.png",
    },
    alternates: {
      canonical: siteUrl,
    },
    verification: {
      google: "google67e218557784b354",
    },
  };
}

export function buildPageMetadata(input: PageSeoInput = {}): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path = "/",
    keywords = [...SITE_KEYWORDS],
    noIndex = false,
    ogImagePath = "/opengraph-image",
  } = input;

  const canonical = absoluteUrl(path);
  const ogImage = absoluteUrl(ogImagePath);
  const resolvedTitle = title ?? DEFAULT_TITLE;

  return {
    title: title ? { absolute: resolvedTitle } : undefined,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: resolvedTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
        },
  };
}
