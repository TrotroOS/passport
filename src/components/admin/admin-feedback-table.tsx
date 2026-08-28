"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatStatus } from "@/lib/utils";
import type { Feedback, FeedbackStatus } from "@/types/database";

interface FeedbackWithRelations extends Feedback {
  users?: { email: string; full_name: string | null } | null;
  organizations?: { name: string } | null;
}

interface AdminFeedbackTableProps {
  items: FeedbackWithRelations[];
}

export function AdminFeedbackTable({ items }: AdminFeedbackTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<FeedbackStatus>("open");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(item: FeedbackWithRelations) {
    setEditingId(item.id);
    setStatus(item.status);
    setAdminNotes(item.admin_notes ?? "");
  }

  async function save(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: adminNotes || null }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast.error(data.error?.message ?? "Update failed");
      return;
    }

    toast.success("Feedback updated");
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-primary">{formatStatus(item.type)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{formatStatus(item.status)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{formatDate(item.created_at)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-input"
              onClick={() => (editingId === item.id ? setEditingId(null) : startEdit(item))}
            >
              {editingId === item.id ? "Cancel" : "Update"}
            </Button>
          </div>
          <p className="mb-2 text-sm text-foreground/90">
            {item.users?.email ?? "Unknown user"}
            {item.organizations?.name ? ` · ${item.organizations.name}` : ""}
          </p>
          <p className="whitespace-pre-wrap text-foreground">{item.message}</p>
          {item.admin_notes && editingId !== item.id && (
            <p className="mt-2 text-sm text-muted-foreground">Notes: {item.admin_notes}</p>
          )}
          {editingId === item.id && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
                <SelectTrigger className="w-48 ">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Admin notes..."
              />
              <Button size="sm" onClick={() => save(item.id)} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-muted-foreground">No feedback submissions yet.</p>
      )}
    </div>
  );
}
