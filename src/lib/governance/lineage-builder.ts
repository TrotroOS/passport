import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSourceId } from "./source-registry";

export interface LineageNode {
  id: string;
  type: string;
  label: string;
  sourceId?: string;
  sourceName?: string;
  confidence?: number;
  timestamp?: string;
}

export interface LineageEdge {
  from: string;
  to: string;
  label: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  summary: {
    documentCount: number;
    extractionCount: number;
    provenanceEventCount: number;
    verificationRunCount: number;
    sourcesUsed: string[];
  };
}

/** Build a data lineage graph for a shipment from existing records. */
export async function buildShipmentLineage(shipmentId: string): Promise<LineageGraph> {
  const admin = createAdminClient();
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const sourcesUsed = new Set<string>();

  const { data: shipment } = await admin
    .from("shipments")
    .select("id, shipment_ref")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    return {
      nodes: [],
      edges: [],
      summary: {
        documentCount: 0,
        extractionCount: 0,
        provenanceEventCount: 0,
        verificationRunCount: 0,
        sourcesUsed: [],
      },
    };
  }

  const rootId = `shipment:${shipmentId}`;
  nodes.push({
    id: rootId,
    type: "shipment",
    label: shipment.shipment_ref,
  });

  const { data: documents } = await admin
    .from("documents")
    .select("id, file_name, doc_type, ingestion_source, created_at")
    .eq("shipment_id", shipmentId);

  for (const doc of documents ?? []) {
    const docId = `document:${doc.id}`;
    nodes.push({
      id: docId,
      type: "document",
      label: doc.file_name ?? doc.doc_type,
      sourceId: doc.ingestion_source ?? "manual",
      sourceName: doc.ingestion_source ?? "manual upload",
      timestamp: doc.created_at,
    });
    edges.push({ from: rootId, to: docId, label: "has_document" });

    const { data: extractions } = await admin
      .from("document_extractions")
      .select("id, extraction_type, confidence, is_arbiter_approved, needs_human_review, created_at")
      .eq("document_id", doc.id)
      .order("created_at", { ascending: false })
      .limit(1);

    for (const ext of extractions ?? []) {
      const extId = `extraction:${ext.id}`;
      nodes.push({
        id: extId,
        type: "extraction",
        label: ext.extraction_type,
        sourceId: "openai",
        sourceName: "OpenAI extraction",
        confidence: ext.confidence ?? undefined,
        timestamp: ext.created_at,
      });
      sourcesUsed.add("openai");
      sourcesUsed.add("passport-arbiter");
      edges.push({ from: docId, to: extId, label: "extracted_by" });
    }
  }

  const { data: provenance } = await admin
    .from("data_provenance_events")
    .select("id, source_id, field_path, confidence, recorded_at, trusted_sources(name)")
    .eq("shipment_id", shipmentId)
    .order("recorded_at", { ascending: false })
    .limit(50);

  for (const event of provenance ?? []) {
    sourcesUsed.add(event.source_id);
    const provId = `provenance:${event.id}`;
    const sourceName =
      event.trusted_sources &&
      typeof event.trusted_sources === "object" &&
      "name" in event.trusted_sources
        ? (event.trusted_sources as { name: string }).name
        : event.source_id;
    nodes.push({
      id: provId,
      type: "provenance",
      label: event.field_path ?? "record",
      sourceId: event.source_id,
      sourceName,
      confidence: event.confidence ?? undefined,
      timestamp: event.recorded_at,
    });
  }

  const { data: scores } = await admin
    .from("passport_scores")
    .select("id, overall_score, created_at")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false })
    .limit(1);

  for (const score of scores ?? []) {
    const scoreId = `score:${score.id}`;
    nodes.push({
      id: scoreId,
      type: "passport_score",
      label: `Passport Score ${score.overall_score}`,
      sourceId: "passport-arbiter",
      sourceName: "Passport Score engine",
      timestamp: score.created_at,
    });
    sourcesUsed.add("passport-arbiter");
    edges.push({ from: rootId, to: scoreId, label: "scored_by" });
  }

  let screenings: Array<{
    id: string;
    screened_name: string;
    list_source: string;
    match_score: number;
    screened_at: string;
  }> = [];

  try {
    const { data } = await admin
      .from("party_screenings")
      .select("id, screened_name, list_source, match_score, screened_at")
      .eq("shipment_id", shipmentId);
    screenings = data ?? [];
  } catch {
    // party_screenings may be missing before migration 018
  }

  for (const s of screenings) {
    const src = resolveSourceId(s.list_source);
    sourcesUsed.add(src);
    const screenId = `screening:${s.id}`;
    nodes.push({
      id: screenId,
      type: "screening",
      label: s.screened_name,
      sourceId: src,
      confidence: s.match_score ? s.match_score / 100 : undefined,
      timestamp: s.screened_at,
    });
    edges.push({ from: rootId, to: screenId, label: "screened_against" });
  }

  const { count: verificationCount } = await admin
    .from("verification_checks")
    .select("id", { count: "exact", head: true })
    .eq("shipment_id", shipmentId);

  return {
    nodes,
    edges,
    summary: {
      documentCount: documents?.length ?? 0,
      extractionCount: nodes.filter((n) => n.type === "extraction").length,
      provenanceEventCount: provenance?.length ?? 0,
      verificationRunCount: verificationCount ?? 0,
      sourcesUsed: [...sourcesUsed],
    },
  };
}
