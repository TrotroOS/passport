"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
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

interface ShareCollaboratorDialogProps {
  shipmentId: string;
}

async function copyInviteLink(url: string) {
  await navigator.clipboard.writeText(url);
  toast.success("Invitation link copied");
}

function showInviteResult(data: {
  email_sent?: boolean;
  email_configured?: boolean;
  invitation_url?: string;
  is_external?: boolean;
}) {
  if (data.email_sent) {
    toast.success(
      data.is_external
        ? "Invitation email sent — they can create a Passport account to join"
        : "Collaboration invitation email sent"
    );
    return;
  }

  if (data.invitation_url) {
    toast.success("Invitation created", {
      description: data.email_configured
        ? "Email could not be delivered. Copy the invite link and send it manually."
        : "Email is not configured locally. Copy the invite link and send it to your collaborator.",
      action: {
        label: "Copy link",
        onClick: () => {
          void copyInviteLink(data.invitation_url!);
        },
      },
    });
    void copyInviteLink(data.invitation_url);
    return;
  }

  toast.success("Invitation created");
}

export function ShareCollaboratorDialog({ shipmentId }: ShareCollaboratorDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "commenter" | "editor">("viewer");
  const [loading, setLoading] = useState(false);

  async function invite() {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Origin": window.location.origin,
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to send invitation");
        return;
      }
      showInviteResult(data);
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Invite collaborator</h3>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="collab-email">Email address</Label>
          <Input
            id="collab-email"
            type="email"
            placeholder="broker@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Invite anyone by email. If outbound email is not configured, Passport
            will give you a link to copy and send manually.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer — view and comment</SelectItem>
              <SelectItem value="commenter">Commenter — view, comment, upload</SelectItem>
              <SelectItem value="editor">Editor — upload, tasks, broker confirm</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={invite} disabled={loading}>
            Send invitation
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
