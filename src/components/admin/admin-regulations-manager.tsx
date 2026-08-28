"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatStatus } from "@/lib/utils";

const RULE_TYPES = [
  "document_required",
  "permit_required",
  "inspection_required",
  "registration_required",
  "restriction",
] as const;

interface Jurisdiction {
  id: string;
  code: string;
  name: string;
}

interface ProductCategory {
  id: string;
  code: string;
  name: string;
}

interface RegulationRow {
  id: string;
  title: string;
  rule_type: string;
  is_active: boolean;
  effective_date: string | null;
  authority: string | null;
  jurisdictions?: { code: string; name: string } | null;
  product_categories?: { code: string; name: string } | null;
}

interface AdminRegulationsManagerProps {
  regulations: RegulationRow[];
  jurisdictions: Jurisdiction[];
  productCategories: ProductCategory[];
}

export function AdminRegulationsManager({
  regulations,
  jurisdictions,
  productCategories,
}: AdminRegulationsManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    jurisdiction_id: "",
    product_category_id: "",
    title: "",
    description: "",
    rule_type: "document_required" as (typeof RULE_TYPES)[number],
    required_document_type: "",
    authority: "",
    source_url: "",
    source_text: "",
    effective_date: "",
    expiry_date: "",
    confidence: "0.9",
    is_active: true,
  });

  async function createRegulation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      jurisdiction_id: form.jurisdiction_id || null,
      product_category_id: form.product_category_id || null,
      title: form.title,
      description: form.description || null,
      rule_type: form.rule_type,
      required_document_type: form.required_document_type || null,
      authority: form.authority || null,
      source_url: form.source_url || null,
      source_text: form.source_text || null,
      effective_date: form.effective_date || null,
      expiry_date: form.expiry_date || null,
      confidence: parseFloat(form.confidence) || 0.9,
      is_active: form.is_active,
    };

    const res = await fetch("/api/admin/regulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error?.message ?? "Failed to create regulation");
      return;
    }

    toast.success("Regulation created");
    setShowForm(false);
    router.refresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/regulations/${id}`, {
      method: isActive ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: isActive ? undefined : JSON.stringify({ is_active: true }),
    });

    if (!res.ok) {
      toast.error("Failed to update regulation");
      return;
    }

    toast.success(isActive ? "Regulation deactivated" : "Regulation activated");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add regulation"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={createRegulation}
          className="mb-6 space-y-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Jurisdiction</Label>
              <Select
                value={form.jurisdiction_id}
                onValueChange={(v) => setForm((f) => ({ ...f, jurisdiction_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {jurisdictions.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name} ({j.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product category</Label>
              <Select
                value={form.product_category_id}
                onValueChange={(v) => setForm((f) => ({ ...f, product_category_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rule type</Label>
              <Select
                value={form.rule_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, rule_type: v as (typeof RULE_TYPES)[number] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatStatus(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Required document type</Label>
              <Input
                value={form.required_document_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, required_document_type: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Authority</Label>
              <Input
                value={form.authority}
                onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective date</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
              />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create regulation"}
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Jurisdiction</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Rule type</th>
              <th className="px-4 py-3">Authority</th>
              <th className="px-4 py-3">Effective</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-muted/30">
            {regulations.map((reg) => (
              <tr key={reg.id} className="hover:bg-card">
                <td className="px-4 py-3 text-foreground">{reg.title}</td>
                <td className="px-4 py-3 text-foreground/90">
                  {reg.jurisdictions?.code ?? "—"}
                </td>
                <td className="px-4 py-3 text-foreground/90">
                  {reg.product_categories?.name ?? "—"}
                </td>
                <td className="px-4 py-3">{formatStatus(reg.rule_type)}</td>
                <td className="px-4 py-3 text-foreground/90">{reg.authority ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {reg.effective_date ? formatDate(reg.effective_date) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={reg.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                    {reg.is_active ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-input text-xs"
                    onClick={() => toggleActive(reg.id, reg.is_active)}
                  >
                    {reg.is_active ? "Deactivate" : "Activate"}
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
