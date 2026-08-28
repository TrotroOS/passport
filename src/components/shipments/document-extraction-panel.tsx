"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  ScanSearch,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Document,
  DocumentExtraction,
  ProcessingStatus,
} from "@/types/database";
import {
  formatDate,
  formatProcessingStatus,
  formatStatus,
  processingStatusVariant,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DocumentWithExtraction extends Document {
  latestExtraction?: DocumentExtraction | null;
}

interface DocumentExtractionPanelProps {
  documents: DocumentWithExtraction[];
}

const TERMINAL_PROCESSING_STATUSES = new Set([
  "processed",
  "needs_review",
  "failed",
]);

async function waitForDocumentProcessing(documentId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 45; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(`/api/documents/${documentId}`);
    if (!response.ok) continue;
    const data = await response.json();
    const status = data.document?.processing_status as string | undefined;
    if (status && TERMINAL_PROCESSING_STATUSES.has(status)) {
      return true;
    }
  }
  return false;
}

function StatusIcon({ status }: { status: ProcessingStatus }) {
  switch (status) {
    case "processed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    case "needs_review":
      return <ScanSearch className="h-4 w-4 text-amber-600" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function isLowConfidenceField(
  field: string,
  extraction: DocumentExtraction | null | undefined
): boolean {
  if (!extraction) return false;
  const lowFields = extraction.extracted_data?._low_confidence_fields;
  if (Array.isArray(lowFields)) {
    return lowFields.includes(field);
  }
  return extraction.needs_human_review;
}

function ExtractionFields({
  document,
  extraction,
  onSaved,
}: {
  document: Document;
  extraction: DocumentExtraction;
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(
    document.processing_status === "needs_review"
  );
  const [fields, setFields] = useState<Record<string, unknown>>(() => {
    const data = { ...extraction.extracted_data };
    delete data._low_confidence_fields;
    delete data._validation_warnings;
    delete data._doc_type;
    delete data._normalized_at;
    return data;
  });
  const [isSaving, setIsSaving] = useState(false);

  const entries = Object.entries(fields).filter(([k]) => !k.startsWith("_"));

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/extraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraction_id: extraction.id,
          confirmed_data: fields,
          doc_type: extraction.extraction_type,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      toast.success("Extraction saved");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  if (entries.length === 0) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Extracted fields</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {entries.map(([key, value]) => {
              const isWarning = isLowConfidenceField(key, extraction);
              const isEmpty =
                value === null ||
                value === undefined ||
                value === "" ||
                (Array.isArray(value) && value.length === 0);

              if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
                return (
                  <div
                    key={key}
                    className={`sm:col-span-2 rounded-md border p-3 ${
                      isWarning || isEmpty ? "border-amber-300 bg-amber-50" : "bg-slate-50"
                    }`}
                  >
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      {formatStatus(key)}
                    </Label>
                    <pre className="mt-1 max-h-32 overflow-auto text-xs">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className={`space-y-1 rounded-md border p-2 ${
                    isWarning || isEmpty ? "border-amber-300 bg-amber-50" : ""
                  }`}
                >
                  <Label htmlFor={`${document.id}-${key}`} className="text-xs">
                    {formatStatus(key)}
                    {(isWarning || isEmpty) && (
                      <span className="ml-1 text-amber-600">(review)</span>
                    )}
                  </Label>
                  <Input
                    id={`${document.id}-${key}`}
                    value={String(value ?? "")}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={isWarning || isEmpty ? "border-amber-300" : ""}
                  />
                </div>
              );
            })}
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-1 h-3 w-3" />
            {isSaving ? "Saving..." : "Save corrections"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function DocumentExtractionPanel({
  documents,
}: DocumentExtractionPanelProps) {
  const router = useRouter();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const active = documents.filter(
      (doc) =>
        doc.processing_status === "pending" ||
        doc.processing_status === "processing"
    );
    if (active.length === 0) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      const results = await Promise.all(
        active.map((doc) =>
          fetch(`/api/documents/${doc.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null)
        )
      );
      const finished = results.some(
        (result) =>
          result?.document?.processing_status &&
          TERMINAL_PROCESSING_STATUSES.has(result.document.processing_status)
      );
      if (finished) {
        router.refresh();
        clearInterval(interval);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [documents, router]);

  async function triggerProcessing(documentId: string) {
    setProcessingIds((prev) => new Set(prev).add(documentId));
    try {
      const response = await fetch(`/api/documents/${documentId}/process`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.status === 409) {
        toast.error(data.error ?? "Document is already processing");
        return;
      }

      if (!response.ok && response.status !== 202) {
        toast.error(data.error ?? "Processing failed");
        return;
      }

      toast.success("Processing started");
      const finished = await waitForDocumentProcessing(documentId);
      if (finished) {
        router.refresh();
      } else {
        toast.message("Still processing — refresh shortly if results do not appear");
      }
    } catch {
      toast.error("Processing failed");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const status = doc.processing_status ?? "pending";
        const isProcessing =
          processingIds.has(doc.id) || status === "processing";
        const extraction = doc.latestExtraction;
        const showExtraction =
          extraction &&
          (status === "processed" || status === "needs_review");

        return (
          <Card key={doc.id} className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <StatusIcon status={status} />
                  <div className="min-w-0">
                    <CardTitle className="break-words text-base">
                      {formatStatus(doc.doc_type)}
                      {doc.doc_type_ai && doc.doc_type_ai !== doc.doc_type && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          Detected: {formatStatus(doc.doc_type_ai)}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {formatDate(doc.created_at)} · {doc.mime_type}
                      {doc.doc_type_confidence != null && (
                        <> · {Math.round(doc.doc_type_confidence * 100)}% confidence</>
                      )}
                    </CardDescription>
                    {status === "failed" && doc.processing_error && (
                      <p className="mt-1 text-sm text-red-600">
                        {doc.processing_error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant={processingStatusVariant(status)}>
                    {formatProcessingStatus(status)}
                  </Badge>
                  {!isProcessing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerProcessing(doc.id)}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Reprocess
                    </Button>
                  )}
                  {isProcessing && (
                    <Button variant="ghost" size="sm" disabled>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Processing
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {showExtraction && (
              <CardContent className="pt-0">
                {extraction.needs_human_review && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This extraction needs human review — check highlighted fields.
                  </div>
                )}
                {extraction.is_arbiter_approved && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <Check className="h-4 w-4 shrink-0" />
                    Arbiter approved this extraction.
                  </div>
                )}
                <ExtractionFields
                  document={doc}
                  extraction={extraction}
                  onSaved={() => window.location.reload()}
                />
              </CardContent>
            )}

            {status === "pending" && !isProcessing && (
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerProcessing(doc.id)}
                >
                  Start processing
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
