import type { LegalDocument } from "../types";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  LEGAL_GOVERNING_LAW,
  LEGAL_LAST_UPDATED,
  SUPPORT_CONTACT_EMAIL,
} from "../types";

export const termsOfService: LegalDocument = {
  slug: "terms-of-service",
  title: "Terms of Service",
  description:
    "Binding terms governing access to and use of the Passport trade compliance platform.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "acceptance",
      title: "1. Agreement to these Terms",
      paragraphs: [
        `These Terms of Service ("Terms") are a binding legal agreement between you and ${LEGAL_ENTITY_NAME} ("Passport", "we", "us", "our") governing access to and use of the Passport trade compliance platform, website, application programming interfaces ("API"), and related services (collectively, the "Service").`,
        `By creating an account, clicking to accept, accessing, or using the Service, you agree to these Terms, our Privacy Policy, Cookie Policy, Acceptable Use Policy, and Data Processing Agreement (where applicable) (collectively, the "Policies"). If you do not agree, do not use the Service.`,
        `If you use the Service on behalf of a company, customs brokerage, freight forwarder, or other organization, you represent and warrant that you have authority to bind that entity. In that case, "you" and "your" refer to that entity, and you are jointly responsible for all users under your account.`,
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility",
      bullets: [
        "You must be at least 18 years old (or the age of majority in your jurisdiction) and capable of entering a binding contract.",
        "The Service is intended for business and professional trade compliance use, not consumer personal use.",
        "You must provide accurate registration information and keep it current.",
        "We may refuse, suspend, or terminate access where we reasonably believe you do not meet these requirements or pose legal, security, or reputational risk.",
      ],
    },
    {
      id: "service",
      title: "3. Description of the Service",
      paragraphs: [
        "Passport is a software-as-a-service platform for trade document management, AI-assisted classification and extraction, cross-document verification, Passport Score and readiness assessments, regulatory and risk checks, HS code intelligence, shipment and container tracking, collaboration with third parties, analytics, workflow tasks, audit logging, inbound document channels (where enabled), webhooks, and a public REST API.",
        "Features may vary by plan, configuration, jurisdiction, and release. We may add, modify, suspend, or discontinue features at any time. Beta, preview, or experimental features may be less reliable and are provided without warranty.",
      ],
    },
    {
      id: "not-advice",
      title: "4. Not legal, customs, or professional advice",
      paragraphs: [
        "THE SERVICE IS A DECISION-SUPPORT AND WORKFLOW TOOL ONLY. IT DOES NOT CONSTITUTE LEGAL, CUSTOMS, TAX, ACCOUNTING, EXPORT CONTROL, SANCTIONS, OR OTHER PROFESSIONAL ADVICE.",
        "Passport is not a licensed customs broker, freight forwarder, government agency, or law firm. We do not file customs declarations, obtain clearance, or act as your agent with any authority unless explicitly agreed in a separate signed writing.",
        "You remain solely and exclusively responsible for: (a) accuracy and completeness of all data you enter or upload; (b) all customs, import, export, tax, and regulatory filings; (c) classification of goods (including HS codes); (d) sanctions and export control compliance; (e) interactions with customs, carriers, banks, and counterparties; and (f) all commercial and legal consequences of your shipments.",
        "No output from the Service — including verification results, Passport Score, readiness indicators, regulatory pass/fail flags, risk ratings, HS suggestions, tracking status, or AI extractions — creates or implies clearance approval, compliance certification, or fitness for any particular purpose.",
      ],
    },
    {
      id: "accounts",
      title: "5. Accounts, organizations, and security",
      bullets: [
        "You are responsible for safeguarding passwords, API keys, and access credentials. Do not share credentials except through designated collaboration features.",
        "You are responsible for all activity under your account, including actions by employees, contractors, collaborators, and API integrations you authorize.",
        "Notify us immediately at " + LEGAL_CONTACT_EMAIL + " if you suspect unauthorized access.",
        "Multi-tenant organizations may assign roles and invite collaborators. You are responsible for configuring access appropriately and for data shared with invitees.",
        "We may suspend or terminate accounts for breach of these Terms, the Acceptable Use Policy, non-payment, suspected fraud, or legal requirement.",
      ],
    },
    {
      id: "customer-data",
      title: "6. Customer Data and license",
      paragraphs: [
        `You retain ownership of trade documents, shipment records, comments, and other content you or your users submit to the Service ("Customer Data"). You grant Passport a worldwide, non-exclusive, royalty-free license to host, copy, transmit, display, and process Customer Data solely to provide, secure, maintain, and improve the Service, comply with law, and as described in the Policies.`,
        "You represent and warrant that: (a) you have all rights, licenses, and consents necessary to upload and process Customer Data, including personal data of employees, brokers, suppliers, buyers, and other parties named in trade documents; (b) your use of the Service complies with applicable data protection, export control, sanctions, and trade laws; and (c) Customer Data does not infringe third-party rights or violate law.",
        "You are the data controller for Customer Data you upload. Where we process personal data on your instructions, our Data Processing Agreement applies.",
      ],
    },
    {
      id: "ai",
      title: "7. Artificial intelligence and automated outputs",
      paragraphs: [
        "The Service uses artificial intelligence, machine learning, optical character recognition, and deterministic rules to classify documents, extract fields, suggest HS codes, flag discrepancies, generate scores, create tasks, and produce other automated outputs.",
        "AI and automated systems are probabilistic and may produce incomplete, outdated, or incorrect results — including misread amounts, parties, dates, product descriptions, or codes. Outputs may differ between runs or model versions.",
        "YOU MUST INDEPENDENTLY REVIEW AND VERIFY ALL AI-GENERATED AND AUTOMATED OUTPUTS BEFORE RELYING ON THEM FOR CUSTOMS FILINGS, COMMERCIAL DECISIONS, PAYMENTS, OR REGULATORY SUBMISSIONS. HUMAN REVIEW IS REQUIRED.",
        "We do not guarantee accuracy, recall, or suitability of AI outputs for any jurisdiction, commodity, or regulatory regime. You assume all risk from reliance on automated outputs.",
        "We may use aggregated or de-identified data to improve models and the Service, subject to the Privacy Policy.",
      ],
    },
    {
      id: "verification",
      title: "8. Verification, scores, and regulatory checks",
      paragraphs: [
        "Verification engines, Passport Score, discrepancy tracking, regulatory checks (including corridor-specific rules such as Ghana import checks), risk assessments, workflow tasks, and printable reports are informational tools based on data you provide and rules configured in the Service.",
        "Results depend on document quality, completeness, timeliness, and correct configuration. Missing, illegible, or fraudulent documents will produce unreliable results.",
        "Regulatory rule sets may be incomplete, superseded, or not applicable to your facts. Sanctions screening (where enabled) uses third-party or configured sources that may be delayed, incomplete, or produce false positives or false negatives.",
        "A pass, high score, or readiness confirmation does not guarantee customs acceptance, release of goods, absence of penalties, or compliance with all applicable laws.",
      ],
    },
    {
      id: "third-party",
      title: "9. Third-party services and data",
      paragraphs: [
        "The Service integrates with or may display data from third parties, including authentication and hosting (Supabase), AI providers (e.g. OpenAI), email (SendGrid), messaging (Twilio), payment processors (Stripe), rate limiting (Upstash), vessel tracking providers, sanctions databases (e.g. OpenSanctions), and other sources you configure.",
        "Third-party services are subject to their own terms and privacy policies. We do not control and are not responsible for third-party availability, accuracy, latency, or conduct.",
        "Tracking events, vessel positions, screening hits, exchange rates, and external regulatory data may be estimated, delayed, or wrong. You must verify critical information with primary sources and official authorities.",
      ],
    },
    {
      id: "collaboration",
      title: "10. Collaboration and sharing",
      paragraphs: [
        "You may invite collaborators (including users not yet registered) to shipments with role-based permissions (viewer, commenter, editor). Invitations may be delivered by email link or in-app notification.",
        "You are solely responsible for selecting invitees, assigning roles, revoking access, and ensuring collaborators are authorized to receive Customer Data shared through the Service.",
        "Collaborators who accept invitations become subject to these Terms and the Acceptable Use Policy. The inviting organization remains responsible for collaborator conduct to the extent permitted by law.",
        "Comments, readiness confirmations, and audit logs may be visible to authorized users within a shipment. Do not post confidential information beyond what is necessary for compliance workflows.",
      ],
    },
    {
      id: "api",
      title: "11. API access and webhooks",
      bullets: [
        "API keys are confidential credentials. You are responsible for all API usage under your keys and must implement appropriate security in integrating systems.",
        "Use the API only within documented rate limits and scopes. We may throttle, suspend, or revoke keys for abuse, excessive load, or security risk.",
        "Webhooks and inbound channels (email, WhatsApp) you configure must comply with applicable law and these Terms. You are responsible for validating webhook payloads and securing endpoints.",
        "We may change API versions with reasonable notice where practicable. Breaking changes to major versions will be communicated through release notes or documentation.",
      ],
    },
    {
      id: "acceptable-use",
      title: "12. Acceptable use",
      paragraphs: [
        "Your use of the Service must comply with our Acceptable Use Policy, which is incorporated by reference. Prohibited conduct includes unlawful trade activity, sanctions evasion, misdeclaration, unauthorized access, scraping outside documented APIs, and misrepresenting Service outputs as guaranteed clearance or legal approval.",
      ],
    },
    {
      id: "fees",
      title: "13. Fees, billing, and taxes",
      paragraphs: [
        "Paid subscriptions, usage-based charges, and trials are described on our pricing page or order form. By subscribing, you authorize us and our payment processor to charge applicable fees.",
        "Fees are exclusive of taxes unless stated otherwise. You are responsible for applicable taxes, duties, and withholdings.",
        "Except where required by law or explicitly stated in writing, fees are non-refundable. Failure to pay may result in suspension or termination.",
        "We may change pricing with at least thirty (30) days notice for subscription plans. Changes apply at the next renewal unless you cancel before the effective date.",
      ],
    },
    {
      id: "availability",
      title: "14. Availability and support",
      paragraphs: [
        "We strive for reliable operation but do not guarantee uninterrupted, error-free, or secure access. Maintenance, upgrades, third-party outages, network failures, and force majeure events may affect the Service.",
        "Support levels depend on your plan. Response times are targets, not guarantees.",
        `Customer support: ${SUPPORT_CONTACT_EMAIL}.`,
        "You are responsible for maintaining backups of Customer Data where required for your business continuity. While we perform regular backups, we do not guarantee recovery of specific data.",
      ],
    },
    {
      id: "ip",
      title: "15. Intellectual property",
      paragraphs: [
        "Passport owns the Service, software, models, documentation, branding, and all related intellectual property, except Customer Data and your pre-existing materials.",
        "These Terms grant you a limited, non-exclusive, non-transferable, revocable license to use the Service during your subscription in accordance with these Terms.",
        "You may not copy, modify, distribute, sell, lease, reverse engineer, or create derivative works of the Service except as expressly permitted by law or in writing by us.",
        "Feedback and suggestions you provide may be used without restriction or compensation to you.",
      ],
    },
    {
      id: "confidentiality",
      title: "16. Confidentiality",
      paragraphs: [
        "Each party may receive confidential information from the other. The receiving party will use reasonable care to protect confidential information and use it only for purposes of the relationship, except as required by law.",
        "Customer Data is your confidential information. Our security practices are described in the Privacy Policy.",
      ],
    },
    {
      id: "indemnification",
      title: "17. Indemnification",
      paragraphs: [
        "You will defend, indemnify, and hold harmless Passport, its affiliates, officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys fees) arising out of or related to: (a) your Customer Data or use of the Service; (b) your violation of these Terms or the Policies; (c) your violation of law, including trade, customs, export control, sanctions, or data protection laws; (d) customs penalties, seizures, or disputes resulting from your filings or shipments; (e) disputes with collaborators, counterparties, or authorities; or (f) negligence or willful misconduct by you or your users.",
        "We will promptly notify you of claims subject to indemnification and cooperate at your expense. We may participate with our own counsel at our expense.",
      ],
    },
    {
      id: "disclaimers",
      title: "18. Disclaimers",
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE AND ALL OUTPUTS ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.',
        "WE DISCLAIM ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, COMPLETENESS, AND THAT THE SERVICE WILL MEET YOUR REQUIREMENTS OR PRODUCE ANY PARTICULAR RESULT.",
        "WE DO NOT WARRANT THAT VERIFICATION, REGULATORY CHECKS, SANCTIONS SCREENING, TRACKING DATA, HS CODE SUGGESTIONS, OR AI EXTRACTIONS ARE COMPLETE, CURRENT, ERROR-FREE, OR SUITABLE FOR ANY JURISDICTION OR FILING.",
      ],
    },
    {
      id: "liability",
      title: "19. Limitation of liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, PASSPORT WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, GOODWILL, DATA, BUSINESS INTERRUPTION, CUSTOMS DELAYS, SEIZURES, PENALTIES, OR REPUTATIONAL HARM, EVEN IF ADVISED OF THE POSSIBILITY.",
        "OUR AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS WILL NOT EXCEED THE GREATER OF: (A) THE FEES YOU PAID TO US FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED US DOLLARS (USD 100).",
        "These limitations apply regardless of the theory of liability and even if any remedy fails of its essential purpose. Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted by law.",
      ],
    },
    {
      id: "export-control",
      title: "20. Export control and sanctions",
      paragraphs: [
        "You represent that you are not located in, organized under the laws of, or ordinarily resident in a country or region subject to comprehensive sanctions, and are not a denied or restricted party on applicable government lists.",
        "You will not use the Service to violate export control, import restriction, or sanctions laws, or to facilitate transactions with prohibited persons or destinations.",
        "We may block access where required by law or where we reasonably suspect prohibited use.",
      ],
    },
    {
      id: "termination",
      title: "21. Term and termination",
      paragraphs: [
        "These Terms remain in effect while you use the Service. You may stop using the Service at any time and may request account closure through settings or by contacting us.",
        "We may suspend or terminate access immediately for breach, legal requirement, non-payment, or risk to the Service or third parties.",
        "Upon termination, your license ends. We may delete Customer Data after any post-termination retention period described in the Privacy Policy, except where retention is required by law.",
        "Sections that by nature should survive (including fees owed, Customer Data representations, indemnification, disclaimers, limitation of liability, governing law, and dispute resolution) survive termination.",
      ],
    },
    {
      id: "law",
      title: "22. Governing law",
      paragraphs: [
        `These Terms are governed by the laws of ${LEGAL_GOVERNING_LAW}, without regard to conflict-of-law rules that would apply another jurisdiction's laws, except where mandatory consumer or data protection law in your country requires otherwise.`,
      ],
    },
    {
      id: "disputes",
      title: "23. Dispute resolution",
      paragraphs: [
        `Before initiating formal proceedings, you agree to contact ${LEGAL_CONTACT_EMAIL} and attempt good-faith resolution for at least thirty (30) days.`,
        "If informal resolution fails, disputes will be resolved by binding arbitration or courts as permitted under applicable law in " + LEGAL_GOVERNING_LAW + ", unless mandatory law requires otherwise.",
        "TO THE EXTENT PERMITTED BY LAW, YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS, COLLECTIVE, OR REPRESENTATIVE ACTION AGAINST PASSPORT.",
        "Nothing prevents either party from seeking injunctive relief for unauthorized use of intellectual property or breach of confidentiality.",
      ],
    },
    {
      id: "general",
      title: "24. General provisions",
      bullets: [
        "Entire agreement: These Terms and the Policies constitute the entire agreement regarding the Service and supersede prior understandings on the same subject.",
        "Assignment: You may not assign these Terms without our written consent. We may assign to an affiliate or in connection with a merger, acquisition, or sale of assets.",
        "Severability: If any provision is unenforceable, the remainder stays in effect.",
        "No waiver: Failure to enforce a provision is not a waiver of future enforcement.",
        "Force majeure: We are not liable for delays or failures due to events beyond reasonable control.",
        "Notices: We may provide notices via the Service, email to your account address, or legal contact details you provide.",
      ],
    },
    {
      id: "changes",
      title: "25. Changes to these Terms",
      paragraphs: [
        "We may update these Terms. Material changes will be notified via the Service, email, or other reasonable means at least thirty (30) days before the effective date where practicable.",
        "Continued use after the effective date constitutes acceptance. If you do not agree, you must stop using the Service before changes take effect.",
      ],
    },
    {
      id: "contact",
      title: "26. Contact",
      paragraphs: [
        `Legal and contractual inquiries: ${LEGAL_CONTACT_EMAIL}.`,
        `Entity: ${LEGAL_ENTITY_NAME}.`,
      ],
    },
  ],
};
