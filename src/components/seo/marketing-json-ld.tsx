import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/types";
import { absoluteUrl, getSiteUrl, SITE_NAME } from "@/lib/seo/site";

interface MarketingJsonLdProps {
  title: string;
  description: string;
}

export function MarketingJsonLd({ title, description }: MarketingJsonLdProps) {
  const siteUrl = getSiteUrl();

  const graph = [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: SITE_NAME,
      url: siteUrl,
      logo: absoluteUrl("/logo.png"),
      email: SUPPORT_CONTACT_EMAIL,
      description,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: title,
      description,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: ["en", "fr", "pt", "ar"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier available; paid Pro and Enterprise plans",
      },
      featureList: [
        "Trade document extraction and verification",
        "Cross-document consistency checks",
        "Corridor-specific regulatory screening",
        "Shipment readiness scoring",
        "Broker and forwarder collaboration",
        "Container tracking and compliance analytics",
      ],
    },
  ];

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@graph": graph,
      }}
    />
  );
}
