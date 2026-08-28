import type { LegalDocument } from "../types";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_LAST_UPDATED } from "../types";

export const complianceDisclaimer: LegalDocument = {
  slug: "compliance-disclaimer",
  title: "Compliance & AI Disclaimer",
  description:
    "Important limitations on Passport verification, AI outputs, regulatory checks, and tracking data.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "summary",
      title: "1. Read this before relying on Passport",
      paragraphs: [
        `${LEGAL_ENTITY_NAME} ("Passport") provides software tools to help organize trade documents, run checks, and collaborate on shipments. This disclaimer summarizes critical limitations. It supplements our Terms of Service and does not replace them.`,
        "If anything in the product UI conflicts with this disclaimer or the Terms, the Terms and Policies govern.",
      ],
    },
    {
      id: "no-advice",
      title: "2. No professional or government advice",
      paragraphs: [
        "Passport does not provide legal, customs, tax, accounting, or export control advice. We are not a government agency, customs authority, licensed broker, or law firm.",
        "Nothing in the Service constitutes clearance approval, compliance certification, or a guarantee that goods will be accepted by customs or any regulator.",
        "Always consult qualified professionals and official authorities for binding guidance.",
      ],
    },
    {
      id: "ai-limits",
      title: "3. AI and extraction limitations",
      paragraphs: [
        "Document classification and field extraction use artificial intelligence and automated parsing. Results may be wrong, incomplete, or inconsistent — especially for poor scans, handwritten text, non-standard formats, or uncommon languages.",
        "HS code suggestions are indicative only. Final classification is your responsibility and may require binding rulings from customs authorities.",
        "You must verify every extracted field against source documents before filing or payment.",
      ],
    },
    {
      id: "verification-limits",
      title: "4. Verification and Passport Score",
      paragraphs: [
        "Cross-document verification compares data you and the system have captured. It cannot detect fraud, missing documents you did not upload, or errors in source documents that appear internally consistent.",
        "Passport Score and readiness indicators are composite metrics for workflow prioritization. A high score does not mean a shipment will clear without inspection, duty adjustment, or penalty.",
        "Discrepancy resolution and ignored flags are your decisions — the Service does not automatically resolve legal or customs issues.",
      ],
    },
    {
      id: "regulatory-limits",
      title: "5. Regulatory and corridor checks",
      paragraphs: [
        "Regulatory rules in Passport (including corridor-specific checks such as Ghana import requirements) are based on configured rule sets that may be incomplete, outdated, or not applicable to your specific facts, exemptions, or free trade agreements.",
        "Pass/fail results are automated signals, not legal determinations. Requirements change frequently; you must confirm current rules with official sources.",
      ],
    },
    {
      id: "sanctions-limits",
      title: "6. Sanctions and denied-party screening",
      paragraphs: [
        "Where enabled, screening uses third-party or configured lists that may be delayed, incomplete, or produce false positives and false negatives.",
        "Screening in Passport is not a substitute for your own export control and sanctions compliance program, including list updates, escalation procedures, and record-keeping required by law.",
      ],
    },
    {
      id: "tracking-limits",
      title: "7. Tracking and logistics data",
      paragraphs: [
        "Container and bill-of-lading tracking depends on carriers and third-party data providers. Positions, ETAs, and events may be estimated, stale, or incorrect.",
        "Do not rely solely on Passport tracking for time-critical customs, demurrage, or delivery decisions without independent confirmation.",
      ],
    },
    {
      id: "collaboration-limits",
      title: "8. Collaboration and shared data",
      paragraphs: [
        "When you invite collaborators or share shipment data, you are responsible for ensuring they are authorized recipients and bound by appropriate confidentiality obligations.",
        "Passport facilitates sharing; it does not verify the professional credentials or trustworthiness of collaborators.",
      ],
    },
    {
      id: "your-responsibility",
      title: "9. Your responsibilities",
      bullets: [
        "Maintain accurate, complete, and lawful source documents.",
        "Review all automated outputs before official use.",
        "File correct declarations with the appropriate authorities.",
        "Meet export control, sanctions, and data protection obligations.",
        "Configure access controls and revoke collaborator access when no longer needed.",
      ],
    },
    {
      id: "contact-disclaimer",
      title: "10. Questions",
      paragraphs: [
        `This disclaimer is for informational purposes. For contractual terms, see our Terms of Service. Questions: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
