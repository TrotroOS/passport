import type { LegalDocument } from "../types";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_LAST_UPDATED } from "../types";

export const cookiePolicy: LegalDocument = {
  slug: "cookie-policy",
  title: "Cookie Policy",
  description:
    "How Passport uses cookies, local storage, and similar technologies.",
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: "what",
      title: "1. Introduction",
      paragraphs: [
        `${LEGAL_ENTITY_NAME} ("Passport") uses cookies and similar technologies on our website and application. This Cookie Policy explains what they are, how we use them, and your choices.`,
        "This policy should be read with our Privacy Policy and Terms of Service.",
      ],
    },
    {
      id: "what-are",
      title: "2. What are cookies and local storage?",
      paragraphs: [
        "Cookies are small text files placed on your device by your browser. Local storage and session storage are browser mechanisms that store data on your device.",
        "We use these technologies to operate the Service, remember preferences, and maintain security.",
      ],
    },
    {
      id: "essential",
      title: "3. Strictly necessary cookies and storage",
      paragraphs: [
        "These are required for the Service to function. They cannot be disabled in the app without breaking core features:",
      ],
      bullets: [
        "Authentication session cookies (Supabase Auth) — maintain your signed-in session and protect against cross-site request forgery.",
        "NEXT_LOCALE — stores your selected language (English, French, Portuguese, Arabic).",
        "Security and load-balancing cookies from our hosting provider — route traffic and protect availability.",
      ],
    },
    {
      id: "functional",
      title: "4. Functional storage",
      paragraphs: [
        "We may store UI preferences (such as sidebar state or table filters) in local storage to improve your experience. This data remains on your device and is not used for advertising.",
      ],
    },
    {
      id: "payment",
      title: "5. Payment-related cookies",
      paragraphs: [
        "If you subscribe to a paid plan, Stripe or another payment processor may set cookies on checkout pages to prevent fraud and process payments. Those cookies are governed by the processor privacy policy.",
      ],
    },
    {
      id: "analytics-cookies",
      title: "6. Analytics and monitoring",
      paragraphs: [
        "We may use privacy-respecting product analytics or error monitoring (e.g. Sentry) to understand usage and fix defects. Where required by law, we will request consent before non-essential analytics cookies.",
        "If we enable such tools, we will update this policy and, where applicable, provide a consent mechanism.",
      ],
    },
    {
      id: "third-party",
      title: "7. Third-party content",
      paragraphs: [
        "Embedded content or links to third-party sites may set their own cookies. We do not control third-party cookies.",
      ],
    },
    {
      id: "manage",
      title: "8. Your choices",
      bullets: [
        "Use Sign out in the app to clear session cookies tied to your account.",
        "Adjust browser settings to block or delete cookies. Blocking essential cookies may prevent login.",
        "Clear local storage through browser settings to reset UI preferences.",
        "For privacy rights requests, contact " + LEGAL_CONTACT_EMAIL + ".",
      ],
    },
    {
      id: "changes-cookie",
      title: "9. Changes",
      paragraphs: [
        "We may update this Cookie Policy. Check the Last updated date at the top of this page.",
      ],
    },
  ],
};
