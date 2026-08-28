import type { LegalDocument } from "./types";
import { acceptableUsePolicy } from "./documents/acceptable-use";
import { complianceDisclaimer } from "./documents/compliance-disclaimer";
import { cookiePolicy } from "./documents/cookie-policy";
import { dataProcessingAgreement } from "./documents/data-processing";
import { privacyPolicy } from "./documents/privacy-policy";
import { termsOfService } from "./documents/terms-of-service";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  termsOfService,
  privacyPolicy,
  complianceDisclaimer,
  cookiePolicy,
  acceptableUsePolicy,
  dataProcessingAgreement,
];

export const LEGAL_DOCUMENTS_BY_SLUG = Object.fromEntries(
  LEGAL_DOCUMENTS.map((doc) => [doc.slug, doc])
) as Record<string, LegalDocument>;

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS_BY_SLUG[slug];
}

export type { LegalDocument, LegalSection } from "./types";
export {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  LEGAL_GOVERNING_LAW,
  LEGAL_LAST_UPDATED,
  SUPPORT_CONTACT_EMAIL,
} from "./types";
