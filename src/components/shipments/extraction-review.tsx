"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { toast } from "sonner";
import type {
  ArbiterEvent,
  Document,
  DocumentExtraction,
} from "@/types/database";
import { DOCUMENT_TYPES, formatStatus } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExtractionReviewProps {
  document: Document;
  extraction: DocumentExtraction;
  arbiterEvents: ArbiterEvent[];
  shipmentId: string;
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "error":
      return <X className="h-4 w-4 text-red-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
}

export function ExtractionReview({
  document,
  extraction,
  arbiterEvents,
  shipmentId,
}: ExtractionReviewProps) {
  const router = useRouter();
  const [docType, setDocType] = useState<string>(
    extraction.extraction_type
  );
  const [fields, setFields] = useState<Record<string, unknown>>(
    extraction.extracted_data ?? {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editableFields = Object.entries(fields).filter(
    ([key]) => !key.startsWith("_")
  );

  function updateField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/documents/${document.id}/extraction`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extraction_id: extraction.id,
            confirmed_data: fields,
            doc_type: docType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Failed to confirm extraction");
        return;
      }

      toast.success("Extraction confirmed");
      router.push(`/shipments/${shipmentId}`);
      router.refresh();
    } catch {
      toast.error("Failed to confirm extraction");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
          <CardDescription>
            AI-detected document type and confidence score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatStatus(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Confidence</Label>
              <div className="flex h-10 items-center gap-2">
                <Badge
                  variant={
                    (extraction.confidence ?? 0) >= 0.85 ? "success" : "warning"
                  }
                >
                  {Math.round((extraction.confidence ?? 0) * 100)}%
                </Badge>
                {extraction.is_arbiter_approved ? (
                  <span className="text-sm text-emerald-600">Arbiter approved</span>
                ) : (
                  <span className="text-sm text-amber-600">Needs review</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>User label: {formatStatus(document.doc_type)}</span>
            {document.doc_type_ai && (
              <span>Detected type: {formatStatus(document.doc_type_ai)}</span>
            )}
            {document.detected_abbreviation &&
            document.detected_abbreviation !== document.doc_type_ai ? (
              <span>Abbreviation detected: {document.detected_abbreviation}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extracted fields</CardTitle>
          <CardDescription>
            Review and edit extracted data before confirming
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editableFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No fields were extracted
            </p>
          ) : (
            <div className="space-y-4">
              {editableFields.map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key}>{formatStatus(key)}</Label>
                  {Array.isArray(value) || typeof value === "object" ? (
                    <pre className="max-h-40 overflow-auto rounded-md border bg-slate-50 p-3 text-xs">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <Input
                      id={key}
                      value={String(value ?? "")}
                      onChange={(e) => updateField(key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {arbiterEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arbiter validation</CardTitle>
            <CardDescription>
              Deterministic rules applied to extracted fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {arbiterEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-3 rounded-md border p-3 text-sm"
                >
                  <SeverityIcon severity={event.severity} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.rule_description}</span>
                      <Badge variant={event.passed ? "success" : "warning"}>
                        {event.passed ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                    {Object.keys(event.details).length > 0 && (
                      <pre className="mt-1 text-xs text-muted-foreground">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={handleConfirm} disabled={isSubmitting}>
          <Check className="mr-2 h-4 w-4" />
          {isSubmitting ? "Confirming..." : "Confirm extraction"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/shipments/${shipmentId}`)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
