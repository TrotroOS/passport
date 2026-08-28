import type { LegalDocument } from "../types";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_LAST_UPDATED } from "../types";

export const dataProcessingAgreement: LegalDocument = {
  slug: "data-processing",
  title: "Data Processing Agreement",
  description:
    "Processor terms when Passport handles personal data on your behalf under GDPR, UK GDPR, and similar laws.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "scope",
      title: "1. Scope, parties, and precedence",
      paragraphs: [
        `This Data Processing Agreement ("DPA") forms part of the agreement between you ("Customer", "Controller") and ${LEGAL_ENTITY_NAME} ("Passport", "Processor") and applies where Passport processes Personal Data on your behalf in connection with the Service.`,
        "This DPA applies when GDPR, UK GDPR, Nigeria Data Protection Act, Ghana Data Protection Act, or similar laws require a written processor agreement. If there is a conflict between this DPA and the Terms regarding processing of Personal Data, this DPA controls.",
        "Passport may act as an independent controller for account, billing, security, and product analytics data as described in the Privacy Policy.",
      ],
    },
    {
      id: "definitions",
      title: "2. Definitions",
      bullets: [
        '"Personal Data", "Processing", "Controller", "Processor", "Data Subject", and "Supervisory Authority" have the meanings in applicable data protection law.',
        '"Customer Data" means Personal Data submitted to the Service by or on behalf of Customer.',
        '"Subprocessor" means a third party engaged by Passport to process Customer Data.',
        '"Security Incident" means a breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to Customer Data.',
      ],
    },
    {
      id: "subject-matter",
      title: "3. Subject matter, duration, and nature",
      paragraphs: [
        "Processing supports trade compliance workflows — including document storage, AI extraction, verification, collaboration, notifications, audit logging, and analytics — for the duration of the subscription and any retention period in the Privacy Policy.",
        "Processing is ongoing and automated, with human review performed by Customer and its users in the Service.",
      ],
    },
    {
      id: "nature",
      title: "4. Purpose of processing",
      bullets: [
        "Hosting, organizing, and displaying shipment and document data.",
        "AI-assisted classification, extraction, and quality checks.",
        "Cross-document verification, regulatory checks, risk assessment, and scoring.",
        "Collaboration, invitations, comments, readiness confirmations, and role-based access.",
        "Transactional notifications, webhooks, and API integrations you enable.",
        "Security monitoring, backup, disaster recovery, and support.",
      ],
    },
    {
      id: "categories",
      title: "5. Categories of data subjects and data",
      bullets: [
        "Data subjects: Customer personnel, collaborators, suppliers, buyers, carriers, customs agents, and other individuals identified in trade documents or invitations.",
        "Categories: names, business contact details, addresses, tax and registration identifiers, job titles, commercial terms, product descriptions, financial amounts, document images and text, communication metadata, and audit records.",
        "Special categories: Customer must not upload special category data (e.g. health, biometric, political opinions) unless strictly necessary, lawful, and with appropriate safeguards. Passport does not require such data for the Service.",
      ],
    },
    {
      id: "instructions",
      title: "6. Customer instructions",
      paragraphs: [
        "Passport will process Customer Data only on documented instructions from Customer, including configuration of the Service, uploads, sharing settings, API calls, and integrations — unless required by applicable law, in which case Passport will inform Customer unless prohibited.",
        "Customer is responsible for the lawfulness of instructions and for providing required notices and obtaining consents from data subjects.",
      ],
    },
    {
      id: "obligations",
      title: "7. Processor obligations",
      bullets: [
        "Implement appropriate technical and organizational measures as described in Section 10 and the Privacy Policy.",
        "Ensure personnel authorized to process Customer Data are bound by confidentiality.",
        "Not engage another processor without Customer authorization as set out in Section 8.",
        "Assist Customer with data subject requests where feasible, considering the nature of processing.",
        "Assist Customer with security, breach notification, and impact assessment obligations where applicable and reasonable.",
        "Delete or return Customer Data upon termination per Section 12, unless retention is required by law.",
        "Make available information reasonably necessary to demonstrate compliance and allow audits per Section 11.",
      ],
    },
    {
      id: "subprocessors",
      title: "8. Subprocessors",
      paragraphs: [
        "Customer provides general authorization for Passport to use Subprocessors listed in the Privacy Policy, including Supabase, configured AI providers, SendGrid, Twilio, Stripe, Upstash, and optional monitoring tools.",
        "Passport will impose data protection obligations on Subprocessors substantially similar to this DPA.",
        "Passport will notify Customer of material Subprocessor changes via the Privacy Policy or email. Customer may object on reasonable grounds relating to data protection within thirty (30) days. If unresolved, Customer may terminate affected processing or the Service as permitted by the Terms.",
      ],
    },
    {
      id: "transfers-dpa",
      title: "9. International transfers",
      paragraphs: [
        "Where Customer Data is transferred to a country without an adequacy decision, Passport will implement appropriate safeguards such as EU Standard Contractual Clauses (Module Two: Controller to Processor), UK IDTA, or equivalent mechanisms.",
        "Upon request, Passport will provide information about applicable transfer mechanisms.",
      ],
    },
    {
      id: "security-dpa",
      title: "10. Security measures",
      bullets: [
        "Encryption of data in transit; encryption at rest where supported by infrastructure.",
        "Logical access controls, multi-tenant isolation, and row-level security.",
        "API authentication, scoped keys, and rate limiting.",
        "Audit logging for mutating actions within the application.",
        "Regular backups and incident response procedures.",
        "Measures are subject to ongoing review and improvement; no system is perfectly secure.",
      ],
    },
    {
      id: "audit",
      title: "11. Audits and information",
      paragraphs: [
        "Upon reasonable written request no more than once per twelve (12) months, Passport will provide security documentation, certifications, or completed questionnaires sufficient to demonstrate compliance, unless confidential or legally restricted.",
        "Onsite audits require thirty (30) days notice, mutual agreement on scope, confidentiality, and timing, and are at Customer expense. Onsite audits will not unreasonably interfere with operations.",
      ],
    },
    {
      id: "breach",
      title: "12. Security incidents",
      paragraphs: [
        "Passport will notify Customer without undue delay after becoming aware of a Security Incident affecting Customer Data, and will provide information reasonably available to assist Customer in meeting regulatory obligations.",
        "Passport will take reasonable steps to investigate, mitigate, and remediate Security Incidents.",
      ],
    },
    {
      id: "deletion",
      title: "13. Return and deletion",
      paragraphs: [
        "Upon termination or written request, Passport will delete or return Customer Data within ninety (90) days, except where retention is required by law or permitted under the Privacy Policy for backup cycles.",
        "Customer may export data through the Service where export features are available before termination.",
      ],
    },
    {
      id: "liability-dpa",
      title: "14. Liability",
      paragraphs: [
        "Each party liability under this DPA is subject to the limitations and exclusions in the Terms of Service. Nothing in this DPA limits either party liability to data subjects where prohibited by law.",
      ],
    },
    {
      id: "contact-dpa",
      title: "15. Contact",
      paragraphs: [
        `Data protection and DPA inquiries: ${LEGAL_CONTACT_EMAIL}.`,
        "Customer may designate a data protection contact in account settings or by email.",
      ],
    },
  ],
};
