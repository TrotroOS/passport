import type { LegalDocument } from "../types";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_LAST_UPDATED } from "../types";

export const acceptableUsePolicy: LegalDocument = {
  slug: "acceptable-use",
  title: "Acceptable Use Policy",
  description:
    "Permitted and prohibited uses of Passport, including trade compliance, AI, API, and collaboration rules.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "purpose",
      title: "1. Purpose and incorporation",
      paragraphs: [
        `This Acceptable Use Policy ("AUP") is part of your agreement with ${LEGAL_ENTITY_NAME} and supplements our Terms of Service. Capitalized terms not defined here have the meanings in the Terms.`,
        "This AUP applies to all users, including organization owners, employees, contractors, collaborators, invitees, and API consumers.",
      ],
    },
    {
      id: "permitted",
      title: "2. Permitted use",
      bullets: [
        "Manage lawful import and export shipments and associated trade documentation.",
        "Run verification, readiness, regulatory, and risk checks as decision-support before filing with authorities.",
        "Collaborate with licensed customs brokers, freight forwarders, compliance teams, and authorized counterparties.",
        "Integrate back-office systems via documented API endpoints within your authorized scope and rate limits.",
        "Store and process personal data of parties named in trade documents where you have a lawful basis and appropriate consents.",
        "Use AI-assisted extraction and review workflows with mandatory human verification before official use.",
      ],
    },
    {
      id: "prohibited-trade",
      title: "3. Prohibited trade and compliance conduct",
      paragraphs: ["You must not use Passport to:"],
      bullets: [
        "Facilitate smuggling, misdeclaration, undervaluation, false invoicing, or customs fraud.",
        "Evade or circumvent sanctions, export controls, import restrictions, or denied-party screening requirements.",
        "Process shipments or parties you know or should know are prohibited under applicable law.",
        "Upload forged, altered, stolen, or counterfeit documents, or documents you are not authorized to use.",
        "Misrepresent goods, origin, value, classification, or parties to obtain improper clearance or duty treatment.",
        "Rely on Passport outputs as a substitute for licensed professional advice or official government approval.",
        "Present Passport Score, verification pass results, or readiness confirmations as guaranteed clearance or legal certification.",
      ],
    },
    {
      id: "prohibited-technical",
      title: "4. Prohibited technical and security conduct",
      paragraphs: ["You must not:"],
      bullets: [
        "Attempt unauthorized access to accounts, organizations, shipments, API keys, or infrastructure.",
        "Probe, scan, or test vulnerabilities without prior written authorization from " + LEGAL_CONTACT_EMAIL + ".",
        "Introduce malware, malicious scripts, or harmful code into the Service.",
        "Interfere with or disrupt the Service, including denial-of-service attacks or excessive automated requests outside documented API limits.",
        "Scrape, crawl, or harvest data from the Service except through documented APIs.",
        "Reverse engineer, decompile, or attempt to extract source code or models except where prohibited restrictions are unenforceable by law.",
        "Share API keys publicly, embed keys in client-side code, or use keys outside your organization without proper controls.",
        "Circumvent rate limits, row-level security, or access controls.",
      ],
    },
    {
      id: "prohibited-content",
      title: "5. Prohibited content and conduct",
      bullets: [
        "Upload content that is unlawful, defamatory, harassing, threatening, or infringes intellectual property or privacy rights.",
        "Harass, abuse, or impersonate other users or organizations.",
        "Use the Service for personal, non-business purposes unrelated to trade compliance workflows.",
        "Resell, sublicense, or provide the Service to third parties as a standalone offering without a written agreement with Passport.",
        "Use the Service to build a competing product through systematic extraction of outputs or underlying logic.",
      ],
    },
    {
      id: "data-responsibility",
      title: "6. Data and collaboration responsibilities",
      paragraphs: [
        "You are responsible for ensuring that all data you upload, share, or process through Passport is accurate, authorized, and compliant with applicable data protection and trade laws.",
        "When inviting collaborators, assign the minimum role necessary. Revoke access promptly when no longer required.",
        "Do not invite individuals who are not authorized to receive confidential trade or personal data for the shipment.",
        "Inbound channels (email, WhatsApp) must only be used for lawful document intake you control.",
      ],
    },
    {
      id: "ai-use",
      title: "7. AI and automated output use",
      paragraphs: [
        "AI extractions, HS code suggestions, and automated flags are assistive only. You must review them before use in filings or commercial decisions.",
        "Do not train external models on Passport outputs or Customer Data without authorization.",
        "Do not represent AI-generated content as human-reviewed or government-approved unless that is factually true.",
      ],
    },
    {
      id: "monitoring",
      title: "8. Monitoring and enforcement",
      paragraphs: [
        "We may monitor use for security, abuse prevention, and legal compliance. Monitoring is limited to what is necessary and consistent with the Privacy Policy.",
        "Violations may result in warning, feature restriction, suspension, or termination without refund. We may preserve evidence and report illegal activity to authorities.",
        "You must cooperate with investigations into suspected violations affecting your account or organization.",
      ],
    },
    {
      id: "reporting",
      title: "9. Reporting abuse",
      paragraphs: [
        `Report suspected violations, security issues, or unauthorized data in shipments to ${LEGAL_CONTACT_EMAIL}. Include relevant shipment reference, organization, and description where possible.`,
      ],
    },
  ],
};
