"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseInviteEmails } from "@/lib/collaboration/parse-invite-emails";
import type { CollaboratorParticipantType } from "@/types/database";

interface ShareCollaboratorDialogProps {
  shipmentId: string;
  className?: string;
  /** When true, render inline form only (no toggle button). */
  inline?: boolean;
}

type InviteResult = {
  email: string;
  success: boolean;
  error?: string;
  email_sent?: boolean;
  invitation_url?: string;
};

async function copyInviteLink(url: string, copiedMessage: string) {
  await navigator.clipboard.writeText(url);
  toast.success(copiedMessage);
}

function defaultRoleForParticipant(
  participantType: CollaboratorParticipantType
): "viewer" | "commenter" | "editor" {
  if (participantType === "customs_broker") return "editor";
  if (participantType === "freight_forwarder") return "commenter";
  return "viewer";
}

export function ShareCollaboratorDialog({
  shipmentId,
  className,
  inline = false,
}: ShareCollaboratorDialogProps) {
  const router = useRouter();
  const t = useTranslations("collaborators");
  const [open, setOpen] = useState(inline);
  const [emailsRaw, setEmailsRaw] = useState("");
  const [role, setRole] = useState<"viewer" | "commenter" | "editor">("editor");
  const [participantType, setParticipantType] =
    useState<CollaboratorParticipantType>("customs_broker");
  const [loading, setLoading] = useState(false);

  function handleParticipantTypeChange(value: CollaboratorParticipantType) {
    setParticipantType(value);
    setRole(defaultRoleForParticipant(value));
  }

  function summarizeResults(results: InviteResult[]) {
    const sent = results.filter((result) => result.success);
    const failed = results.filter((result) => !result.success);

    if (sent.length === 1 && failed.length === 0) {
      const result = sent[0];
      if (result.email_sent) {
        toast.success(t("inviteSent"));
      } else if (result.invitation_url) {
        toast.success(t("inviteCreated"), {
          description: t("inviteEmailNotConfigured"),
          action: {
            label: t("copyLink"),
            onClick: () => {
              void copyInviteLink(result.invitation_url!, t("linkCopied"));
            },
          },
        });
        void copyInviteLink(result.invitation_url, t("linkCopied"));
      } else {
        toast.success(t("inviteCreated"));
      }
      return;
    }

    if (sent.length > 0) {
      toast.success(t("batchInviteSuccess", { count: sent.length }));
    }

    if (failed.length > 0) {
      toast.error(t("batchInvitePartialFailure", { count: failed.length }), {
        description: failed.map((result) => `${result.email}: ${result.error}`).join("\n"),
      });
    }
  }

  async function invite() {
    const emails = parseInviteEmails(emailsRaw);
    if (emails.length === 0) {
      toast.error(t("emailRequired"));
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
        body: JSON.stringify({
          invites: emails.map((email) => ({
            email,
            role,
            participant_type: participantType,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok && !data.results) {
        toast.error(data.error ?? t("inviteFailed"));
        return;
      }

      const results = (data.results ?? []) as InviteResult[];
      summarizeResults(results);
      setEmailsRaw("");
      if (!inline) {
        setOpen(false);
      }
      router.refresh();
    } catch {
      toast.error(t("inviteFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!open && !inline) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("w-full sm:w-auto", className)}
      >
        <Share2 className="mr-2 h-4 w-4 shrink-0" />
        {t("share")}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 shadow-sm",
        inline ? "border-dashed" : "",
        className
      )}
    >
      <h3 className="mb-1 text-sm font-semibold">{t("inviteTitle")}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{t("inviteMultiHint")}</p>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="collab-emails">{t("inviteEmailsLabel")}</Label>
          <Textarea
            id="collab-emails"
            placeholder={t("inviteEmailsPlaceholder")}
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{t("inviteEmailHint")}</p>
        </div>
        <div className="space-y-2">
          <Label>{t("inviteParticipantTypeLabel")}</Label>
          <Select
            value={participantType}
            onValueChange={(value) =>
              handleParticipantTypeChange(value as CollaboratorParticipantType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customs_broker">{t("participantCustomsBroker")}</SelectItem>
              <SelectItem value="freight_forwarder">
                {t("participantFreightForwarder")}
              </SelectItem>
              <SelectItem value="collaborator">{t("participantCollaborator")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("inviteRoleLabel")}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
              <SelectItem value="commenter">{t("roleCommenter")}</SelectItem>
              <SelectItem value="editor">{t("roleEditor")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={invite} disabled={loading}>
            {t("sendInvitations")}
          </Button>
          {!inline ? (
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
