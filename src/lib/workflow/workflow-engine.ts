import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import type {
  Discrepancy,
  Document,
  DocumentExtraction,
  HsCodeVerificationCheck,
  Product,
  Regulation,
  ShipmentTrackingEvent,
  VerificationCheck,
  WorkflowTask,
} from "@/types/database";
import { formatDocumentTypeLabel } from "@/lib/regulatory/document-matching";

const CORE_DOC_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "import_declaration",
];

export interface TaskDefinition {
  title: string;
  description: string;
  task_type: WorkflowTask["task_type"];
  priority: WorkflowTask["priority"];
  related_document_id?: string;
  related_regulation_id?: string;
}

function taskKey(task: TaskDefinition): string {
  return `${task.task_type}::${task.title}`;
}

function buildRegulatoryTasks(
  failedChecks: Array<{
    regulation_id: string | null;
    status: string;
    check_type: string;
    details: Record<string, unknown>;
  }>,
  regulationsById: Map<string, Regulation>
): TaskDefinition[] {
  const tasks: TaskDefinition[] = [];

  for (const check of failedChecks) {
    if (check.status !== "failed" || !check.regulation_id) continue;

    const regulation = regulationsById.get(check.regulation_id);
    const details = check.details;
    const requiredType = details.required_document_type as string | undefined;
    const authority = (details.authority as string) ?? regulation?.authority ?? "authority";
    const ruleType = details.rule_type as string | undefined;

    if (requiredType === "hs_code") {
      tasks.push({
        title: "Provide HS code classification for all products",
        description: "All imported goods must have correct HS code classification per GRA Customs requirements.",
        task_type: "provide_info",
        priority: "high",
        related_regulation_id: check.regulation_id,
      });
    } else if (requiredType) {
      const label = formatDocumentTypeLabel(requiredType);
      tasks.push({
        title: `Obtain required document: ${label}`,
        description: regulation?.description ?? `Upload ${label} to satisfy regulatory requirement from ${authority}.`,
        task_type: "obtain_document",
        priority: ruleType === "permit_required" ? "urgent" : "high",
        related_regulation_id: check.regulation_id,
      });
    } else if (ruleType === "inspection_required") {
      tasks.push({
        title: `Schedule inspection with ${authority}`,
        description: regulation?.description ?? `Inspection required by ${authority}.`,
        task_type: "contact_authority",
        priority: "high",
        related_regulation_id: check.regulation_id,
      });
    } else if (ruleType === "registration_required") {
      tasks.push({
        title: `Complete registration with ${authority}`,
        description: regulation?.description ?? `Registration required with ${authority}.`,
        task_type: "verify_permit",
        priority: "high",
        related_regulation_id: check.regulation_id,
      });
    }
  }

  return tasks;
}

function buildDiscrepancyTasks(discrepancies: Discrepancy[]): TaskDefinition[] {
  return discrepancies
    .filter((d) => d.status === "open" && d.severity === "critical")
    .map((d) => ({
      title: `Resolve discrepancy: ${d.description.slice(0, 80)}`,
      description: d.description,
      task_type: "resolve_discrepancy" as const,
      priority: "urgent" as const,
    }));
}

function buildMissingDocTasks(checks: VerificationCheck[]): TaskDefinition[] {
  const tasks: TaskDefinition[] = [];

  for (const docType of CORE_DOC_TYPES) {
    const missing = checks.find(
      (c) => c.check_id === `doc_missing_${docType}` && c.status === "failed"
    );
    if (missing) {
      tasks.push({
        title: `Upload missing document: ${formatDocumentTypeLabel(docType)}`,
        description: `Core trade document ${formatDocumentTypeLabel(docType)} is required for shipment clearance.`,
        task_type: "obtain_document",
        priority: "high",
      });
    }
  }

  return tasks;
}

function buildExtractionReviewTasks(
  documents: Document[],
  extractionsByDocId: Map<string, DocumentExtraction>
): TaskDefinition[] {
  const tasks: TaskDefinition[] = [];

  for (const doc of documents) {
    const extraction = extractionsByDocId.get(doc.id);
    const needsReview =
      doc.processing_status === "needs_review" ||
      extraction?.needs_human_review === true;

    if (needsReview) {
      const label = doc.file_path.split("/").pop() ?? doc.doc_type;
      tasks.push({
        title: `Review extraction for document ${label}`,
        description: "AI extraction requires human review before it can be used for compliance checks.",
        task_type: "provide_info",
        priority: "medium",
        related_document_id: doc.id,
      });
    }
  }

  return tasks;
}

function buildHsCodeTasks(
  products: Product[],
  hsChecks: HsCodeVerificationCheck[]
): TaskDefinition[] {
  const checksByProduct = new Map<string, HsCodeVerificationCheck[]>();
  for (const check of hsChecks) {
    const list = checksByProduct.get(check.product_id) ?? [];
    list.push(check);
    checksByProduct.set(check.product_id, list);
  }

  const tasks: TaskDefinition[] = [];

  for (const product of products) {
    if (product.hs_code_status === "verified") continue;

    const productChecks = checksByProduct.get(product.id) ?? [];
    const needsReview =
      !product.hs_code?.trim() ||
      product.hs_code_status === "missing" ||
      product.hs_code_status === "conflict" ||
      productChecks.some(
        (c) =>
          c.status === "failed" ||
          c.status === "needs_review" ||
          c.status === "warning"
      );

    if (!needsReview) continue;

    const priority =
      !product.hs_code?.trim() || product.hs_code_status === "missing"
        ? "high"
        : product.hs_code_status === "conflict"
          ? "high"
          : "medium";

    tasks.push({
      title: `Verify HS Code for product: ${product.name}`,
      description:
        "Confirm the correct HS classification with your customs broker. AI suggestions are advisory only.",
      task_type: "verify_hs_code",
      priority,
    });
  }

  return tasks;
}

function buildTrackingTasks(
  trackingEvents: ShipmentTrackingEvent[]
): TaskDefinition[] {
  const tasks: TaskDefinition[] = [];

  const hasCustomsPending = trackingEvents.some(
    (e) =>
      e.event_type === "customs_clearance" &&
      !trackingEvents.some((later) => later.event_type === "delivery")
  );

  const hasDischarged = trackingEvents.some(
    (e) => e.event_type === "container_discharged"
  );
  const hasDelivered = trackingEvents.some((e) => e.event_type === "delivery");

  const hasDelay = trackingEvents.some(
    (e) =>
      e.event_type === "delay" ||
      (e.description?.toLowerCase().includes("delay") ?? false)
  );

  const hasDeparted = trackingEvents.some(
    (e) => e.event_type === "vessel_departed"
  );
  const hasArrived = trackingEvents.some(
    (e) => e.event_type === "vessel_arrived"
  );

  if (hasCustomsPending) {
    tasks.push({
      title: "Monitor customs clearance",
      description:
        "Tracking shows customs clearance in progress. Follow up with your customs broker.",
      task_type: "other",
      priority: "high",
    });
  }

  if (hasDischarged && !hasDelivered) {
    tasks.push({
      title: "Coordinate delivery",
      description:
        "Container has been discharged at port. Arrange last-mile delivery with your logistics provider.",
      task_type: "other",
      priority: "medium",
    });
  }

  if (hasDelay) {
    tasks.push({
      title: "Review shipment delay",
      description:
        "A delay was reported in tracking data. Assess impact on clearance timeline and notify stakeholders.",
      task_type: "other",
      priority: "urgent",
    });
  }

  if (hasDeparted && !hasArrived) {
    const departed = trackingEvents.find((e) => e.event_type === "vessel_departed");
    if (departed?.event_date) {
      const daysSince =
        (Date.now() - new Date(departed.event_date).getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince > 14) {
        tasks.push({
          title: "Verify vessel ETA — overdue departure",
          description:
            "Vessel departed but has not arrived within the expected window. Confirm ETA with the carrier.",
          task_type: "other",
          priority: "high",
        });
      }
    }
  }

  return tasks;
}

export async function generateWorkflowTasks(
  shipmentId: string
): Promise<{ created: number; updated: number; completed: number }> {
  return recalculateTasks(shipmentId);
}

export async function recalculateTasks(
  shipmentId: string
): Promise<{ created: number; updated: number; completed: number }> {
  const admin = createAdminClient();
  let created = 0;
  let updated = 0;
  let completed = 0;

  const [
    { data: failedRegChecks },
    { data: discrepancies },
    { data: verificationChecks },
    { data: documents },
    { data: existingTasks },
    { data: products },
    { data: hsChecks },
    { data: trackingEvents },
  ] = await Promise.all([
    admin
      .from("regulatory_checks")
      .select("*")
      .eq("shipment_id", shipmentId)
      .eq("status", "failed"),
    admin.from("discrepancies").select("*").eq("shipment_id", shipmentId),
    admin.from("verification_checks").select("*").eq("shipment_id", shipmentId),
    admin.from("documents").select("*").eq("shipment_id", shipmentId),
    admin.from("workflow_tasks").select("*").eq("shipment_id", shipmentId),
    admin.from("products").select("*").eq("shipment_id", shipmentId),
    admin
      .from("hs_code_verification_checks")
      .select("*")
      .eq("shipment_id", shipmentId),
    admin
      .from("shipment_tracking_events")
      .select("*")
      .eq("shipment_id", shipmentId),
  ]);

  const regulationIds = (failedRegChecks ?? [])
    .map((c) => c.regulation_id)
    .filter(Boolean) as string[];

  const { data: regulations } = regulationIds.length
    ? await admin.from("regulations").select("*").in("id", regulationIds)
    : { data: [] };

  const regulationsById = new Map<string, Regulation>();
  for (const reg of regulations ?? []) {
    regulationsById.set(reg.id, reg as Regulation);
  }

  const docIds = (documents ?? []).map((d) => d.id);
  const extractionsByDocId = new Map<string, DocumentExtraction>();

  if (docIds.length > 0) {
    const { data: extData } = await admin
      .from("document_extractions")
      .select("*")
      .in("document_id", docIds)
      .order("created_at", { ascending: false });

    for (const ext of extData ?? []) {
      if (!extractionsByDocId.has(ext.document_id)) {
        extractionsByDocId.set(ext.document_id, ext as DocumentExtraction);
      }
    }
  }

  const desiredTasks: TaskDefinition[] = [
    ...buildRegulatoryTasks(failedRegChecks ?? [], regulationsById),
    ...buildDiscrepancyTasks((discrepancies ?? []) as Discrepancy[]),
    ...buildMissingDocTasks((verificationChecks ?? []) as VerificationCheck[]),
    ...buildExtractionReviewTasks(
      (documents ?? []) as Document[],
      extractionsByDocId
    ),
    ...buildHsCodeTasks(
      (products ?? []) as Product[],
      (hsChecks ?? []) as HsCodeVerificationCheck[]
    ),
    ...buildTrackingTasks((trackingEvents ?? []) as ShipmentTrackingEvent[]),
  ];

  const desiredKeys = new Set(desiredTasks.map(taskKey));
  const existingByKey = new Map<string, WorkflowTask>();

  for (const task of (existingTasks ?? []) as WorkflowTask[]) {
    existingByKey.set(`${task.task_type}::${task.title}`, task);
  }

  for (const def of desiredTasks) {
    const key = taskKey(def);
    const existing = existingByKey.get(key);

    if (existing) {
      if (existing.status === "done" || existing.status === "not_applicable") {
        await admin
          .from("workflow_tasks")
          .update({ status: "open", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        updated++;
      }
      continue;
    }

    const { error } = await admin.from("workflow_tasks").insert({
      shipment_id: shipmentId,
      title: def.title,
      description: def.description,
      task_type: def.task_type,
      priority: def.priority,
      status: "open",
      related_document_id: def.related_document_id ?? null,
      related_regulation_id: def.related_regulation_id ?? null,
    });

    if (!error) created++;
  }

  for (const task of (existingTasks ?? []) as WorkflowTask[]) {
    const key = `${task.task_type}::${task.title}`;
    if (
      !desiredKeys.has(key) &&
      (task.status === "open" || task.status === "in_progress")
    ) {
      await admin
        .from("workflow_tasks")
        .update({
          status: "done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      completed++;
    }
  }

  return { created, updated, completed };
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: WorkflowTask["status"],
  userId: string
): Promise<{ success: boolean; task?: WorkflowTask; error?: string }> {
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("workflow_tasks")
    .select("*, shipments(organization_id)")
    .eq("id", taskId)
    .single();

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const { data: updated, error } = await admin
    .from("workflow_tasks")
    .update({ status: newStatus })
    .eq("id", taskId)
    .select()
    .single();

  if (error || !updated) {
    return { success: false, error: error?.message ?? "Failed to update task" };
  }

  const shipment = task.shipments as { organization_id: string };

  await writeAuditEvent(admin, {
    organizationId: shipment.organization_id,
    userId,
    action: "workflow_task.status_updated",
    entityType: "workflow_task",
    entityId: taskId,
    shipmentId: task.shipment_id,
    metadata: {
      previous_status: task.status,
      new_status: newStatus,
      task_title: task.title,
    },
  });

  const { dispatchWebhook } = await import("@/lib/webhooks/webhook-service");
  dispatchWebhook(shipment.organization_id, "workflow.task_updated", {
    shipment_id: task.shipment_id,
    task_id: taskId,
    previous_status: task.status,
    new_status: newStatus,
    task_title: task.title,
  }).catch((err) => console.error("[Webhook] workflow.task_updated failed:", err));

  return { success: true, task: updated as WorkflowTask };
}
