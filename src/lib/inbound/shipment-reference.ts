/** Extract shipment reference strings from email/WhatsApp message text. */
export function extractShipmentReferences(text: string): string[] {
  if (!text?.trim()) return [];

  const refs = new Set<string>();

  const patterns = [
    // GH-IMP-2026-0042, GH IMP 2026 0042
    /\b(GH[-\s][A-Z]{2,10}[-\s]\d{4}[-\s]\d{2,6})\b/gi,
    // GH-2026-0042
    /\b(GH[-\s]?\d{4}[-\s]?\d{4,6})\b/gi,
    // GH1234 compact
    /\b(GH[-\s]?\d{4,8})\b/gi,
    // REF: ..., SHIPMENT REF: ..., Shipment: ...
    /(?:SHIPMENT\s+)?(?:REF(?:ERENCE)?|SHIP(?:MENT)?)[:\s#]+\s*([A-Z0-9][A-Z0-9\-\/]{2,40})/gi,
    /#([A-Z]{2,4}[-\s]?\d{3,8})/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(text)) !== null) {
      const raw = (match[1] ?? match[0]).trim();
      const cleaned = raw
        .toUpperCase()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (cleaned.length >= 4) refs.add(cleaned);
    }
  }

  return Array.from(refs);
}

export function normalizeReferenceForLookup(ref: string): string {
  return ref.toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
}
