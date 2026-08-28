import type { LegalDocument } from "../types";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_LAST_UPDATED, SUPPORT_CONTACT_EMAIL } from "../types";

export const privacyPolicy: LegalDocument = {
  slug: "privacy-policy",
  title: "Privacy Policy",
  description:
    "How Passport collects, uses, shares, retains, and protects personal and trade-related data.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "intro",
      title: "1. Introduction",
      paragraphs: [
        `${LEGAL_ENTITY_NAME} ("Passport", "we", "us", "our") provides a trade compliance and shipment intelligence platform. This Privacy Policy explains how we collect, use, disclose, retain, and protect personal data when you visit our website, create an account, collaborate on shipments, use our API, or otherwise interact with the Service.`,
        "This policy applies to account holders, organization administrators, collaborators, invitees, API integrators, and visitors. It should be read together with our Terms of Service, Cookie Policy, and Data Processing Agreement (DPA) where we process data on your behalf.",
        "Passport is designed for business use. It is not directed to children.",
      ],
    },
    {
      id: "controller",
      title: "2. Roles and contact",
      paragraphs: [
        `${LEGAL_ENTITY_NAME} is typically the data controller for account, billing, security, and platform operation data.`,
        "When you upload personal data about your employees, brokers, suppliers, buyers, or other parties in trade documents, you are generally the data controller and Passport acts as a data processor processing that data on your instructions via the Service. See our DPA for processor terms.",
        `Privacy and data protection inquiries: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: "collect",
      title: "3. Categories of data we collect",
      paragraphs: ["Depending on how you use the Service, we may collect:"],
      bullets: [
        "Identity and account data: name, email address, phone number (optional), organization name, job role, language preference, avatar, and account settings.",
        "Authentication data: credentials and session tokens managed by our authentication provider (Supabase). We do not store plain-text passwords.",
        "Organization and tenancy data: organization membership, roles, subscription plan, API key metadata (hashed or scoped identifiers, not full secrets in logs), and feature flags.",
        "Trade and shipment data: shipment references, parties (names, addresses, tax IDs, contact details), products, HS codes, commercial terms, uploaded documents (invoices, packing lists, bills of lading, certificates, etc.), extraction results, verification outcomes, discrepancies, regulatory check results, risk assessments, Passport Score, workflow tasks, comments, readiness confirmations, and audit logs.",
        "Collaboration data: collaborator invitations (including invitee email addresses for users not yet registered), roles, acceptance timestamps, and shared activity within shipments.",
        "Tracking and logistics data: container numbers, bill-of-lading references, carrier events, and tracking notifications you enable.",
        "Communications: support requests, feedback, inbound email or WhatsApp metadata and content when inbound channels are enabled, and transactional messages (invites, security alerts, tracking updates).",
        "Usage and technical data: pages viewed, features used, API request metadata, IP address, browser and device type, operating system, timestamps, error logs, and performance diagnostics.",
        "Payment data: billing name, address, subscription status, and transaction identifiers. Payment card data is processed by our payment provider (Stripe); we do not store full card numbers.",
        "AI processing metadata: document types processed, model invocation logs, confidence scores, and error/retry records for quality and security monitoring.",
      ],
    },
    {
      id: "sources",
      title: "4. Sources of data",
      bullets: [
        "Directly from you when you register, create shipments, upload documents, configure integrations, or contact support.",
        "From users in your organization and collaborators you invite.",
        "From systems you connect via API, webhooks, or inbound channels.",
        "From third-party providers you configure (tracking, screening, etc.), subject to their terms.",
        "Automatically through cookies, session storage, and server logs as described in our Cookie Policy.",
      ],
    },
    {
      id: "use",
      title: "5. How we use data",
      bullets: [
        "Provide, operate, maintain, and personalize the Service.",
        "Authenticate users, enforce row-level security, and manage multi-tenant organizations.",
        "Run AI-assisted document classification, extraction, verification, regulatory checks, risk scoring, HS code intelligence, analytics, and workflow automation.",
        "Enable collaboration, invitations, comments, notifications, and audit trails.",
        "Process payments, manage subscriptions, and send transactional communications.",
        "Monitor security, prevent fraud and abuse, enforce our Terms and Acceptable Use Policy, and comply with legal obligations.",
        "Debug errors, improve reliability, and develop new features (using aggregated or de-identified data where feasible).",
        "Respond to your requests and provide customer support.",
      ],
    },
    {
      id: "legal-bases",
      title: "6. Legal bases (EEA, UK, and similar jurisdictions)",
      paragraphs: ["Where GDPR, UK GDPR, or comparable laws apply, we rely on:"],
      bullets: [
        "Contract — to provide the Service you request, including account management, document processing, and collaboration features.",
        "Legitimate interests — securing the platform, preventing abuse, improving the Service, and communicating about your account, balanced against your rights.",
        "Consent — where required for non-essential cookies, optional marketing, or certain notification channels.",
        "Legal obligation — responding to lawful requests, record-keeping, and regulatory compliance.",
        "When we act as processor on your behalf, you determine the legal basis for processing personal data in Customer Data.",
      ],
    },
    {
      id: "ai-processing",
      title: "7. Automated processing and AI",
      paragraphs: [
        "The Service uses automated processing, including AI models, to analyze documents and generate suggestions, scores, and flags. These outputs are assistive and may be inaccurate.",
        "We do not make solely automated decisions that produce legal or similarly significant effects on individuals without human involvement in your compliance workflow. You are responsible for reviewing outputs before acting.",
        "Document contents may be transmitted to configured AI subprocessors for analysis. See Section 8 for subprocessors.",
      ],
    },
    {
      id: "sharing",
      title: "8. Sharing and subprocessors",
      paragraphs: [
        "We do not sell personal data. We share data only as described below:",
      ],
      bullets: [
        "Service providers (subprocessors) who help us operate the Service, under contractual confidentiality and data protection obligations:",
        "— Supabase: database, authentication, file storage, and hosting infrastructure.",
        "— OpenAI or other configured AI provider: document analysis and extraction.",
        "— SendGrid: transactional email delivery (invitations, alerts, tracking notifications).",
        "— Twilio: WhatsApp or SMS messaging when enabled.",
        "— Stripe: payment processing and subscription billing.",
        "— Upstash: rate limiting and abuse prevention.",
        "— Sentry or similar: error monitoring when enabled in your deployment.",
        "— Tracking and screening providers you configure (e.g. vessel tracking APIs, OpenSanctions).",
        "Collaborators and organizations you authorize within the Service.",
        "Professional advisers, auditors, and insurers under confidentiality obligations.",
        "Authorities when required by law, court order, or to protect rights, safety, and security.",
        "Successors in a merger, acquisition, or asset sale, subject to this policy.",
      ],
    },
    {
      id: "transfers",
      title: "9. International transfers",
      paragraphs: [
        "Your data may be processed in countries other than your own, including where our subprocessors operate. Where required by law, we implement appropriate safeguards such as Standard Contractual Clauses, UK IDTA addenda, or equivalent mechanisms.",
        "You may contact us for more information about transfer safeguards applicable to your data.",
      ],
    },
    {
      id: "retention",
      title: "10. Retention",
      paragraphs: [
        "We retain personal data for as long as necessary to provide the Service, fulfill the purposes in this policy, and comply with legal obligations.",
        "Typical retention: account and organization data for the life of the subscription plus up to ninety (90) days after closure unless longer retention is required for backups, disputes, or law.",
        "Shipment and document data is retained while your organization maintains the record and according to your settings, subject to backup cycles and legal holds.",
        "Audit logs and security records may be retained longer where necessary for security, fraud prevention, or compliance.",
        "You may request deletion subject to legal requirements, active disputes, and legitimate business needs. Processors must direct data subject requests to the relevant controller where applicable.",
      ],
    },
    {
      id: "security",
      title: "11. Security",
      paragraphs: [
        "We implement technical and organizational measures including encryption in transit (TLS), access controls, row-level security in our database, API key scoping, rate limiting, audit logging for mutating actions, and least-privilege internal access.",
        "No method of transmission or storage is completely secure. You are responsible for securing your credentials, API keys, and collaborator access.",
        "Report suspected security incidents to " + LEGAL_CONTACT_EMAIL + " promptly.",
      ],
    },
    {
      id: "breach",
      title: "12. Data breach notification",
      paragraphs: [
        "If we become aware of a personal data breach affecting data we control, we will notify affected users and/or supervisory authorities as required by applicable law without undue delay.",
        "Where we act as processor, we will notify you without undue delay after becoming aware of a personal data breach affecting Customer Data, so you can meet your obligations to regulators and data subjects.",
      ],
    },
    {
      id: "rights",
      title: "13. Your privacy rights",
      paragraphs: [
        "Depending on your location, you may have rights to access, correct, delete, restrict, or object to certain processing, and to data portability. Where processing is based on consent, you may withdraw consent.",
        "To exercise rights, contact " + LEGAL_CONTACT_EMAIL + ". We may verify your identity before responding. We will respond within timeframes required by applicable law (e.g. one month under GDPR).",
        "If we process your data as processor on behalf of an organization, direct your request to that organization; we will assist them as required by our DPA.",
        "You may lodge a complaint with a supervisory authority in your jurisdiction.",
      ],
    },
    {
      id: "california",
      title: "14. California and US state privacy notices",
      paragraphs: [
        "Where California Consumer Privacy Act (CCPA/CPRA) or similar US state laws apply, we describe categories collected and disclosed above. We do not sell or share personal information for cross-context behavioral advertising as defined by those laws.",
        "California residents may have rights to know, delete, correct, and opt out of certain processing. Submit requests to " + LEGAL_CONTACT_EMAIL + ". We will not discriminate against you for exercising privacy rights.",
      ],
    },
    {
      id: "marketing",
      title: "15. Marketing communications",
      paragraphs: [
        "We may send product updates and marketing emails where permitted by law. You may opt out of marketing at any time via unsubscribe links or by contacting us. Transactional and security messages are not marketing and may still be sent.",
      ],
    },
    {
      id: "cookies",
      title: "16. Cookies and similar technologies",
      paragraphs: [
        "We use essential cookies and local storage for authentication, security, and language preference. See our Cookie Policy for details.",
      ],
    },
    {
      id: "children",
      title: "17. Children",
      paragraphs: [
        "The Service is not directed to individuals under 16 (or the age specified by local law). We do not knowingly collect personal data from children. Contact us if you believe a child has provided data.",
      ],
    },
    {
      id: "changes-privacy",
      title: "18. Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy. The Last updated date will change and material updates will be communicated as required by law via the Service or email.",
      ],
    },
    {
      id: "contact-privacy",
      title: "19. Contact",
      paragraphs: [
        `Customer support: ${SUPPORT_CONTACT_EMAIL}.`,
        `Privacy inquiries and data subject requests: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
