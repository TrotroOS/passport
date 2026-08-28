"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { DocumentAbbreviationRow } from "@/types/database";
import { DOCUMENT_TYPES, formatStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminDocumentAbbreviationsManagerProps {
  initialAbbreviations: DocumentAbbreviationRow[];
}

export function AdminDocumentAbbreviationsManager({
  initialAbbreviations,
}: AdminDocumentAbbreviationsManagerProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialAbbreviations);
  const [showForm, setShowForm] = useState(false);
  const [abbreviation, setAbbreviation] = useState("");
  const [canonicalDocType, setCanonicalDocType] = useState<string>("invoice");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function createAbbreviation() {
    if (!abbreviation.trim()) {
      toast.error("Abbreviation is required");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/document-abbreviations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abbreviation: abbreviation.trim(),
          canonical_doc_type: canonicalDocType,
          description: description.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error?.message ?? data.error ?? "Create failed");
        return;
      }

      setRows((prev) =>
        [...prev, data.data.abbreviation].sort((a, b) =>
          a.abbreviation.localeCompare(b.abbreviation)
        )
      );
      setAbbreviation("");
      setDescription("");
      setShowForm(false);
      toast.success("Abbreviation created");
      router.refresh();
    } catch {
      toast.error("Create failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const response = await fetch(`/api/admin/document-abbreviations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error?.message ?? "Update failed");
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, is_active: !isActive } : row
      )
    );
    toast.success(isActive ? "Abbreviation deactivated" : "Abbreviation activated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage trade document abbreviations used for automated document classification.
        </p>
        <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add abbreviation"}
        </Button>
      </div>

      {showForm ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Abbreviation</Label>
              <Input
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                placeholder="CI"
              />
            </div>
            <div className="space-y-2">
              <Label>Canonical document type</Label>
              <Select value={canonicalDocType} onValueChange={setCanonicalDocType}>
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
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Commercial Invoice"
              />
            </div>
          </div>
          <Button className="mt-4" onClick={createAbbreviation} disabled={isSaving}>
            Save abbreviation
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-card">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground/90">Abbreviation</th>
              <th className="px-4 py-3 text-left font-medium text-foreground/90">Canonical type</th>
              <th className="px-4 py-3 text-left font-medium text-foreground/90">Description</th>
              <th className="px-4 py-3 text-left font-medium text-foreground/90">Status</th>
              <th className="px-4 py-3 text-right font-medium text-foreground/90">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-muted/30">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono font-semibold">{row.abbreviation}</td>
                <td className="px-4 py-3">{formatStatus(row.canonical_doc_type)}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={row.is_active ? "success" : "secondary"}>
                    {row.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(row.id, row.is_active)}
                  >
                    {row.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
