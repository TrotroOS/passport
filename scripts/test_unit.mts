/**
 * Unit tests for inbound helpers (no database required).
 * Run: npx tsx scripts/test_unit.mts
 */
import assert from "node:assert/strict";
import { extractShipmentReferences, normalizeReferenceForLookup } from "../src/lib/inbound/shipment-reference.ts";
import { normalizePhoneE164, parseEmailAddress } from "../src/lib/inbound/normalize.ts";
import { validateInboundAttachment, guessMimeType } from "../src/lib/inbound/validate-attachment.ts";
import { MAX_FILE_SIZE } from "../src/lib/utils.ts";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}`);
    throw err;
  }
}

console.log("Passport unit tests\n");

console.log("Shipment reference extraction");
test("extracts GH-IMP-2026-0042", () => {
  const refs = extractShipmentReferences("SHIPMENT REF: GH-IMP-2026-0042 invoice attached");
  assert.ok(refs.some((r) => r.includes("GH-IMP-2026-0042") || r.includes("GH-IMP")));
});
test("extracts REF prefix", () => {
  const refs = extractShipmentReferences("REF: GH1234");
  assert.ok(refs.length >= 1);
});
test("normalize reference lowercase", () => {
  assert.equal(normalizeReferenceForLookup("GH-IMP-2026-0042"), "gh-imp-2026-0042");
});

console.log("\nPhone & email normalization");
test("parse email from angle brackets", () => {
  assert.equal(parseEmailAddress("John <user@example.com>"), "user@example.com");
});
test("normalize Ghana phone", () => {
  assert.equal(normalizePhoneE164("0244123456"), "+233244123456");
});
test("normalize whatsapp prefix", () => {
  assert.equal(normalizePhoneE164("whatsapp:+233244123456"), "+233244123456");
});

console.log("\nAttachment validation");
test("accepts PDF", () => {
  assert.equal(validateInboundAttachment("application/pdf", 1024).valid, true);
});
test("rejects oversize file", () => {
  assert.equal(validateInboundAttachment("application/pdf", MAX_FILE_SIZE + 1).valid, false);
});
test("guess mime from extension", () => {
  assert.equal(guessMimeType("invoice.pdf"), "application/pdf");
});

console.log("\nSecurity: text sanitization & upload validation");
import { sanitizeUserText, isSafeHttpUrl } from "../src/lib/security/sanitize-text.ts";
import {
  sanitizeUploadFileName,
  validateUploadBuffer,
} from "../src/lib/security/validate-upload.ts";

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

test("sanitizeUserText strips HTML tags", () => {
  assert.equal(
    sanitizeUserText("<b>hello</b> <script>x</script>"),
    "hello x"
  );
});
test("sanitizeUserText removes control characters", () => {
  assert.equal(sanitizeUserText("hello\u0000world"), "helloworld");
});
test("isSafeHttpUrl accepts https links", () => {
  assert.equal(isSafeHttpUrl("https://example.com/doc"), true);
});
test("isSafeHttpUrl rejects javascript URLs", () => {
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
});
test("sanitizeUploadFileName rejects path traversal", () => {
  assert.equal(sanitizeUploadFileName("../invoice.pdf"), null);
  assert.equal(sanitizeUploadFileName("invoice.pdf"), "invoice.pdf");
});
test("validateUploadBuffer accepts PDF magic bytes", () => {
  const result = validateUploadBuffer(PDF_MAGIC, "invoice.pdf", "application/pdf");
  assert.equal(result.ok, true);
});
test("validateUploadBuffer rejects MIME/content mismatch", () => {
  const result = validateUploadBuffer(PDF_MAGIC, "photo.png", "image/png");
  assert.equal(result.ok, false);
});
test("validateUploadBuffer accepts PNG magic bytes", () => {
  const result = validateUploadBuffer(PNG_MAGIC, "scan.png", "image/png");
  assert.equal(result.ok, true);
});
test("validateUploadBuffer accepts JPEG magic bytes", () => {
  const result = validateUploadBuffer(JPEG_MAGIC, "photo.jpg", "image/jpeg");
  assert.equal(result.ok, true);
});
test("validateInboundAttachment verifies buffer signature", () => {
  assert.equal(
    validateInboundAttachment(
      "application/pdf",
      PDF_MAGIC.length,
      PDF_MAGIC,
      "invoice.pdf"
    ).valid,
    true
  );
  assert.equal(
    validateInboundAttachment(
      "image/png",
      PDF_MAGIC.length,
      PDF_MAGIC,
      "fake.png"
    ).valid,
    false
  );
});

console.log("\nAPI key helpers");
import {
  API_KEY_PREFIX,
  extractBearerToken,
  generateApiKey,
  hashApiKey,
} from "../src/lib/api/api-key-auth.ts";
import { validateApiKeyFormat, isLikelySameOriginSelfFetch } from "../src/lib/api/api-key-development-check.ts";
import { isValidApiScope } from "../src/lib/api/api-key-scopes.ts";

test("generateApiKey uses pk_live prefix", () => {
  const { key, prefix, hash } = generateApiKey();
  assert.ok(key.startsWith(API_KEY_PREFIX));
  assert.equal(prefix, key.slice(0, 12));
  assert.equal(hash, hashApiKey(key));
});
test("hashApiKey is deterministic", () => {
  assert.equal(hashApiKey("pk_live_test"), hashApiKey("pk_live_test"));
});
test("extractBearerToken parses Authorization header", () => {
  const request = new Request("http://localhost", {
    headers: { Authorization: "Bearer pk_live_abc123" },
  });
  assert.equal(extractBearerToken(request), "pk_live_abc123");
});
test("validateApiKeyFormat rejects empty key", () => {
  assert.equal(validateApiKeyFormat("").passed, false);
});
test("validateApiKeyFormat accepts valid prefix", () => {
  assert.equal(
    validateApiKeyFormat(`${API_KEY_PREFIX}${"a".repeat(40)}`).passed,
    true
  );
});
test("isValidApiScope accepts default scopes", () => {
  assert.equal(isValidApiScope("read:shipment"), true);
  assert.equal(isValidApiScope("invalid"), false);
});
test("isLikelySameOriginSelfFetch detects localhost in dev", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  assert.equal(isLikelySameOriginSelfFetch("http://localhost:3000"), true);
  assert.equal(isLikelySameOriginSelfFetch("https://api.passport.trade"), false);
  process.env.NODE_ENV = prev;
});

console.log("\nTrade abbreviations & incoterms");
import {
  buildAbbreviationLookup,
  detectAbbreviationFromFileName,
  mapClassificationToCanonical,
  DEFAULT_DOCUMENT_ABBREVIATIONS,
} from "../src/lib/trade/abbreviations.ts";
import {
  extractIncotermFromData,
  normalizeIncoterm,
} from "../src/lib/trade/incoterms.ts";

test("detectAbbreviationFromFileName maps CI to invoice", () => {
  const lookup = buildAbbreviationLookup(DEFAULT_DOCUMENT_ABBREVIATIONS);
  const result = detectAbbreviationFromFileName("CI_2026-0046.pdf", lookup);
  assert.equal(result.suggestedDocType, "invoice");
  assert.equal(result.abbreviation, "CI");
});
test("mapClassificationToCanonical maps BL to bill_of_lading", () => {
  const lookup = buildAbbreviationLookup(DEFAULT_DOCUMENT_ABBREVIATIONS);
  const mapped = mapClassificationToCanonical("BL", lookup, [
    "invoice",
    "packing_list",
    "bill_of_lading",
    "certificate",
    "import_declaration",
    "other",
  ]);
  assert.equal(mapped.docType, "bill_of_lading");
  assert.equal(mapped.detectedAbbreviation, "BL");
});
test("normalizeIncoterm parses labeled value", () => {
  assert.equal(normalizeIncoterm("Incoterm: FOB"), "FOB");
});
test("extractIncotermFromData reads invoice field", () => {
  assert.equal(extractIncotermFromData({ incoterm: "CIF" }), "CIF");
});

console.log("\nImport corridor jurisdiction");
import {
  isPlaceholderDestination,
  isSupportedImportDestination,
  normalizeDestinationCountry,
  resolveDestinationJurisdiction,
} from "../src/lib/regulatory/jurisdiction.ts";

test("resolveDestinationJurisdiction accepts corridor labels and codes", () => {
  assert.equal(resolveDestinationJurisdiction("Ghana"), "GH");
  assert.equal(resolveDestinationJurisdiction("gh"), "GH");
  assert.equal(resolveDestinationJurisdiction("Nigeria"), "NG");
  assert.equal(resolveDestinationJurisdiction("KE"), "KE");
  assert.equal(resolveDestinationJurisdiction("kenya"), "KE");
});

test("unsupported destinations are rejected", () => {
  assert.equal(resolveDestinationJurisdiction("Test"), null);
  assert.equal(isSupportedImportDestination("Test"), false);
  assert.equal(isPlaceholderDestination("Test"), true);
});

test("normalizeDestinationCountry stores canonical labels", () => {
  assert.equal(normalizeDestinationCountry("GH"), "Ghana");
  assert.equal(normalizeDestinationCountry("nigeria"), "Nigeria");
});

console.log("\nShipment collaboration permissions");
import { hasPermission } from "../src/lib/shipments/shipment-access.ts";

test("viewer can comment but not upload", () => {
  assert.equal(hasPermission({ level: "collaborator", role: "viewer" }, "comment"), true);
  assert.equal(hasPermission({ level: "collaborator", role: "viewer" }, "upload"), false);
});
test("owner cannot confirm as broker", () => {
  assert.equal(
    hasPermission({ level: "owner" }, "broker_confirm"),
    false
  );
});
test("editor can confirm broker readiness", () => {
  assert.equal(
    hasPermission({ level: "collaborator", role: "editor" }, "broker_confirm"),
    true
  );
  assert.equal(
    hasPermission({ level: "collaborator", role: "editor" }, "owner_confirm"),
    false
  );
});

console.log("\nHS code arbiter");
import {
  arbiterFilterSuggestions,
  arbiterValidateSelectedCode,
  isValidHsCodeFormat,
} from "../src/lib/hs-code/arbiter.ts";

test("isValidHsCodeFormat accepts 6-digit code", () => {
  assert.equal(isValidHsCodeFormat("847130"), true);
});
test("isValidHsCodeFormat rejects alphabetic code", () => {
  assert.equal(isValidHsCodeFormat("ABC"), false);
});
test("arbiterFilterSuggestions keeps valid numeric codes", () => {
  const filtered = arbiterFilterSuggestions([
    { hs_code: "8471.30", description_match: "Laptops", confidence: 0.9 },
    { hs_code: "BAD", description_match: "Invalid", confidence: 0.8 },
  ]);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.hs_code, "847130");
});

console.log("\nAnalytics date range");
import {
  dateRangeCutoff,
  parseAnalyticsDateRange,
} from "../src/lib/analytics/date-range.ts";

test("parseAnalyticsDateRange defaults to 30d", () => {
  assert.equal(parseAnalyticsDateRange(undefined), "30d");
});
test("dateRangeCutoff returns null for all", () => {
  assert.equal(dateRangeCutoff("all"), null);
});

console.log("\nFreight tracking helpers");
import {
  extractContainersFromBolData,
  normalizeContainerNumber,
} from "../src/lib/tracking/extract-containers-from-bol.ts";
import {
  deriveTrackingStatus,
  trackingEventDedupKey,
} from "../src/lib/tracking/status.ts";
import { calculateRouteRisk } from "../src/lib/risk/risk-engine.ts";

test("extractContainersFromBolData parses container list", () => {
  const result = extractContainersFromBolData({
    container_numbers: ["MSCU1234567", "TCLU7654321"],
    vessel: "MAERSK STAR",
    bill_of_lading_number: "BL-001",
  });
  assert.equal(result.container_numbers?.length, 2);
  assert.equal(result.vessel, "MAERSK STAR");
});
test("normalizeContainerNumber uppercases", () => {
  assert.equal(normalizeContainerNumber(" mscu1234567 "), "MSCU1234567");
});
test("deriveTrackingStatus returns Delivered after delivery event", () => {
  const status = deriveTrackingStatus([
    { event_type: "vessel_departed", event_date: "2026-01-01T00:00:00Z" },
    { event_type: "delivery", event_date: "2026-01-10T00:00:00Z" },
  ]);
  assert.equal(status, "Delivered");
});
test("trackingEventDedupKey is stable", () => {
  const key = trackingEventDedupKey(
    "ship-1",
    "MSCU123",
    "vessel_arrived",
    "2026-01-05T00:00:00Z"
  );
  assert.ok(key.includes("vessel_arrived"));
});
import { mapTerminal49ContainerToEvents } from "../src/lib/tracking/terminal49/map-events.ts";
import { inferCarrierScac } from "../src/lib/tracking/terminal49/client.ts";

test("mapTerminal49ContainerToEvents maps vessel arrival", () => {
  const events = mapTerminal49ContainerToEvents(
    {
      pod_arrived_at: "2026-02-01T08:00:00Z",
      pod_terminal: "Tema Port",
      shipping_line_name: "Maersk",
    },
    { pod_arrived_at: "2026-02-01T08:00:00Z" }
  );
  assert.equal(events.length, 1);
  assert.equal(events[0]?.event_type, "vessel_arrived");
  assert.equal(events[0]?.location, "Tema Port");
});
test("inferCarrierScac resolves common carrier names", () => {
  assert.equal(inferCarrierScac("Maersk"), "MAEU");
  assert.equal(inferCarrierScac("MAEU"), "MAEU");
  assert.equal(inferCarrierScac("unknown line"), undefined);
});
import { getTrackingConfig } from "../src/lib/tracking/config.ts";

test("getTrackingConfig returns demo for mock provider", () => {
  const prev = process.env.TRACKING_PROVIDER;
  process.env.TRACKING_PROVIDER = "mock";
  const cfg = getTrackingConfig();
  assert.equal(cfg.mode, "demo");
  assert.equal(cfg.isLive, false);
  if (prev === undefined) delete process.env.TRACKING_PROVIDER;
  else process.env.TRACKING_PROVIDER = prev;
});
test("calculateRouteRisk increases score on delay events", () => {
  const base = calculateRouteRisk("CN", "GH", []);
  const delayed = calculateRouteRisk("CN", "GH", [
    {
      id: "1",
      shipment_id: "s",
      container_number: "MSCU1",
      event_type: "delay",
      event_date: "2026-01-01T00:00:00Z",
      location: null,
      description: "Vessel delayed at port",
      source: "mock",
      raw_data: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  ]);
  assert.ok(delayed.score > base.score);
});

console.log("\nInternationalization helpers");
import { resolveLocale, aiLanguageInstruction } from "../src/lib/i18n/ai-language.ts";
import { formatNotificationMessage } from "../src/lib/i18n/messages.ts";

test("resolveLocale defaults to en", () => {
  assert.equal(resolveLocale(undefined), "en");
  assert.equal(resolveLocale("fr"), "fr");
});
test("aiLanguageInstruction empty for English", () => {
  assert.equal(aiLanguageInstruction("en"), "");
});
test("aiLanguageInstruction includes French for fr locale", () => {
  assert.ok(aiLanguageInstruction("fr").includes("French"));
});
test("formatNotificationMessage substitutes params", () => {
  const subject = formatNotificationMessage("en", "trackingUpdateSubject", {
    shipmentRef: "GH-001",
  });
  assert.ok(subject.includes("GH-001"));
});

console.log("\nCompliance & trade intelligence");
import { screenPartyName } from "../src/lib/compliance/party-screening.ts";
import { buildDocumentChecklist } from "../src/lib/compliance/document-checklist.ts";
import { estimateShipmentDuty } from "../src/lib/trade/duty-estimator.ts";

test("screenPartyName clears normal company", async () => {
  const result = await screenPartyName("Acme Trading Ltd");
  assert.ok(result);
  assert.equal(result.match_status, "clear");
});
test("screenPartyName flags watchlist entity", async () => {
  const result = await screenPartyName("Rosneft Oil Company");
  assert.ok(result);
  assert.notEqual(result.match_status, "clear");
});
test("buildDocumentChecklist tracks missing docs", () => {
  const checklist = buildDocumentChecklist(
    { origin_country: "CN", destination_country: "GH", incoterm: "CIF" },
    [{ id: "1", shipment_id: "s", organization_id: "o", doc_type: "invoice", file_name: "inv.pdf", file_path: "p", file_size: 1, mime_type: "application/pdf", ingestion_source: "manual", uploaded_by: null, processing_error: null, created_at: "" }]
  );
  assert.ok(checklist.requiredTotal > 1);
  assert.ok(checklist.completionPercent < 100);
});
test("estimateShipmentDuty calculates Ghana import", () => {
  const estimate = estimateShipmentDuty(
    [{ id: "p1", shipment_id: "s", name: "Widget", description: null, hs_code: "847130", quantity: 10, unit_price: 100, total_value: 1000, currency: "USD", category_id: null, hs_code_status: "verified", created_at: "" }],
    "CN",
    "GH"
  );
  assert.ok(estimate.grandTotal > estimate.subtotalCif);
  assert.ok(estimate.totalDuty > 0);
  assert.equal(estimate.corridorSupported, true);
});
test("estimateShipmentDuty skips unsupported corridors", () => {
  const estimate = estimateShipmentDuty(
    [{ id: "p1", shipment_id: "s", name: "Widget", description: null, hs_code: "847130", quantity: 10, unit_price: 100, total_value: 1000, currency: "USD", category_id: null, hs_code_status: "verified", created_at: "" }],
    "US",
    "DE"
  );
  assert.equal(estimate.corridorSupported, false);
  assert.equal(estimate.products.length, 0);
  assert.equal(estimate.grandTotal, 0);
});

console.log("\nApp URL helpers");
import {
  getInvitationUrl,
  isLocalhostAppUrl,
  resolveEmailAppUrl,
} from "../src/lib/app-url.ts";

test("isLocalhostAppUrl detects localhost", () => {
  assert.equal(isLocalhostAppUrl("http://localhost:3000"), true);
  assert.equal(isLocalhostAppUrl("https://passport-one-kappa.vercel.app"), false);
});
test("resolveEmailAppUrl ignores localhost browser origin", () => {
  const prevUrl = process.env.NEXT_PUBLIC_APP_URL;
  const prevEmail = process.env.EMAIL_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://passport-one-kappa.vercel.app";
  delete process.env.EMAIL_PUBLIC_APP_URL;
  assert.equal(
    getInvitationUrl("abc", "http://localhost:3000"),
    "https://passport-one-kappa.vercel.app/invitations/abc"
  );
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.EMAIL_PUBLIC_APP_URL = "https://passport-one-kappa.vercel.app";
  assert.equal(
    getInvitationUrl("abc", "http://localhost:3000"),
    "https://passport-one-kappa.vercel.app/invitations/abc"
  );
  if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = prevUrl;
  if (prevEmail === undefined) delete process.env.EMAIL_PUBLIC_APP_URL;
  else process.env.EMAIL_PUBLIC_APP_URL = prevEmail;
});

console.log("\nAuth redirect helpers");
import {
  getAuthCallbackUrl,
  resolvePostAuthPath,
} from "../src/lib/auth/auth-redirect.ts";

test("getAuthCallbackUrl uses production app URL", () => {
  const prevUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://passport-one-kappa.vercel.app";
  assert.equal(
    getAuthCallbackUrl(),
    "https://passport-one-kappa.vercel.app/auth/callback?next=%2Fdashboard"
  );
  if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = prevUrl;
});
test("getAuthCallbackUrl rejects unsafe next paths", () => {
  const prevUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://passport-one-kappa.vercel.app";
  assert.equal(
    getAuthCallbackUrl("//evil.com"),
    "https://passport-one-kappa.vercel.app/auth/callback?next=%2Fdashboard"
  );
  assert.equal(
    getAuthCallbackUrl("/shipments/abc-123"),
    "https://passport-one-kappa.vercel.app/auth/callback?next=%2Fshipments%2Fabc-123"
  );
  if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = prevUrl;
});
test("resolvePostAuthPath defaults to dashboard", () => {
  assert.equal(resolvePostAuthPath(null), "/dashboard");
  assert.equal(resolvePostAuthPath("/dashboard"), "/dashboard");
});

console.log("\nCollaborator participant types");
import {
  inviteCollaboratorSchema,
  collaboratorParticipantTypes,
} from "../src/lib/validations/index.ts";
import {
  isMissingParticipantTypeError,
} from "../src/lib/collaboration/schema-support.ts";

test("inviteCollaboratorSchema accepts customs_broker", () => {
  const parsed = inviteCollaboratorSchema.parse({
    email: "broker@example.com",
    role: "editor",
    participant_type: "customs_broker",
  });
  assert.equal(parsed.participant_type, "customs_broker");
});
test("inviteCollaboratorSchema defaults participant_type to collaborator", () => {
  const parsed = inviteCollaboratorSchema.parse({
    email: "user@example.com",
    role: "viewer",
  });
  assert.equal(parsed.participant_type, "collaborator");
});
test("collaboratorParticipantTypes includes broker and forwarder", () => {
  assert.ok(collaboratorParticipantTypes.includes("customs_broker"));
  assert.ok(collaboratorParticipantTypes.includes("freight_forwarder"));
});
test("isMissingParticipantTypeError detects schema cache message", () => {
  assert.equal(
    isMissingParticipantTypeError(
      "Could not find the 'participant_type' column of 'shipment_collaborators' in the schema cache"
    ),
    true
  );
});

console.log("\nSEO helpers");
import { absoluteUrl, getPublicSitemapPaths } from "../src/lib/seo/site.ts";

test("getPublicSitemapPaths includes home, help, and legal docs", () => {
  const paths = getPublicSitemapPaths();
  assert.ok(paths.includes("/"));
  assert.ok(paths.includes("/help"));
  assert.ok(paths.includes("/legal"));
  assert.ok(paths.some((path) => path.startsWith("/legal/")));
  assert.equal(paths.includes("/dashboard"), false);
});
test("absoluteUrl joins base and path", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  try {
    assert.equal(absoluteUrl("/help"), "https://example.com/help");
    assert.equal(absoluteUrl("/"), "https://example.com");
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = original;
  }
});

console.log("\nCustoms clearance classification");
import {
  classifyClearanceStage,
  mapClearanceStageToShipmentStatus,
} from "../src/lib/customs/classify-clearance.ts";

test("cleared_assistive when all checks pass", () => {
  const result = classifyClearanceStage({
    documentCount: 3,
    pendingDocuments: 0,
    productsTotal: 2,
    productsWithoutHs: 0,
    openDiscrepancies: 0,
    criticalDiscrepancies: 0,
    pendingTasks: 0,
    failedRegulatoryChecks: 0,
    overallScore: 82,
    riskLevel: "low",
    destinationSupported: true,
  });
  assert.equal(result.stage, "cleared_assistive");
});

test("blocked when no documents", () => {
  const result = classifyClearanceStage({
    documentCount: 0,
    pendingDocuments: 0,
    productsTotal: 0,
    productsWithoutHs: 0,
    openDiscrepancies: 0,
    criticalDiscrepancies: 0,
    pendingTasks: 0,
    failedRegulatoryChecks: 0,
    overallScore: null,
    riskLevel: null,
    destinationSupported: true,
  });
  assert.equal(result.stage, "blocked");
});

test("classifying while documents pending", () => {
  const result = classifyClearanceStage({
    documentCount: 2,
    pendingDocuments: 1,
    productsTotal: 1,
    productsWithoutHs: 0,
    openDiscrepancies: 0,
    criticalDiscrepancies: 0,
    pendingTasks: 0,
    failedRegulatoryChecks: 0,
    overallScore: null,
    riskLevel: null,
    destinationSupported: true,
  });
  assert.equal(result.stage, "classifying");
});

test("maps cleared_assistive to ready shipment status", () => {
  assert.equal(mapClearanceStageToShipmentStatus("cleared_assistive"), "ready");
});

console.log("\nAll unit tests passed.");
