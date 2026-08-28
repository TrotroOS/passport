export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const LEGAL_ENTITY_NAME =
  process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME ?? "Passport Trade Compliance";
export const LEGAL_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? "legal@passport.trade";
export const SUPPORT_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "trotroosapp@gmail.com";
export const LEGAL_LAST_UPDATED = "2026-08-28";
export const LEGAL_GOVERNING_LAW =
  process.env.NEXT_PUBLIC_LEGAL_GOVERNING_LAW ?? "Ghana";
