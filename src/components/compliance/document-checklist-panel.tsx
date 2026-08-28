"use client";

import Link from "next/link";
import { CheckCircle2, Circle, FileWarning } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocumentChecklist } from "@/lib/compliance/document-checklist";

interface DocumentChecklistPanelProps {
  checklist: DocumentChecklist;
  shipmentId: string;
}

export function DocumentChecklistPanel({
  checklist,
  shipmentId,
}: DocumentChecklistPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileWarning className="h-5 w-5" />
          Document checklist
        </CardTitle>
        <CardDescription>
          Required trade documents for corridor {checklist.corridor} ·{" "}
          {checklist.requiredComplete}/{checklist.requiredTotal} complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">{checklist.completionPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${checklist.completionPercent}%` }}
            />
          </div>
        </div>
        <ul className="space-y-2">
          {checklist.items.map((item) => (
            <li
              key={item.docType}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                {item.status === "complete" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : item.status === "optional" ? (
                  <Circle className="h-4 w-4 text-slate-400" />
                ) : (
                  <Circle className="h-4 w-4 text-amber-500" />
                )}
                <span className={item.status === "missing" ? "text-amber-900" : ""}>
                  {item.label}
                </span>
                {!item.required ? (
                  <span className="text-xs text-muted-foreground">(optional)</span>
                ) : null}
              </div>
              {item.documentId ? (
                <Link
                  href={`/shipments/${shipmentId}/documents/${item.documentId}`}
                  className="text-xs text-primary hover:underline"
                >
                  View
                </Link>
              ) : item.status === "missing" ? (
                <span className="text-xs text-amber-600">Required</span>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
