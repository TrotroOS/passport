"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  className?: string;
}

async function copyInviteLink(url: string, copiedMessage: string) {
  await navigator.clipboard.writeText(url);
  toast.success(copiedMessage);
}

function showInviteResult(
  data: {
    email_sent?: boolean;
    email_configured?: boolean;
    invitation_url?: string;
    is_external?: boolean;
    email_error?: string;
  },
  t: ReturnType<typeof useTranslations<"collaborators">>
) {
  if (data.email_sent) {
    toast.success(
      data.is_external ? t("inviteSentExternal") : t("inviteSent")
    );
    return;
  }

  if (data.invitation_url) {
    const description = data.email_error
      ? `${data.email_configured ? t("inviteEmailFailed") : t("inviteEmailNotConfigured")} ${data.email_error}`
      : data.email_configured
        ? t("inviteEmailFailed")
        : t("inviteEmailNotConfigured");

    toast.success(t("inviteCreated"), {
      description,
      action: {
        label: t("copyLink"),
        onClick: () => {
          void copyInviteLink(data.invitation_url!, t("linkCopied"));
        },
      },
    });
    void copyInviteLink(data.invitation_url, t("linkCopied"));
    return;
  }

  toast.success(t("inviteCreated"));
}

export function ShareCollaboratorDialog({ shipmentId, className }: ShareCollaboratorDialogProps) {
  const router = useRouter();
  const t = useTranslations("collaborators");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "commenter" | "editor">("viewer");
  const [loading, setLoading] = useState(false);

  async function invite() {
    if (!email.trim()) {
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
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("inviteFailed"));
        return;
      }
      showInviteResult(data, t);
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t("inviteFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className={cn("w-full sm:w-auto", className)}>
        <Share2 className="mr-2 h-4 w-4 shrink-0" />
        {t("share")}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{t("inviteTitle")}</h3>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="collab-email">{t("inviteEmailLabel")}</Label>
          <Input
            id="collab-email"
            type="email"
            placeholder={t("inviteEmailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("inviteEmailHint")}</p>
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
        <div className="flex gap-2">
          <Button onClick={invite} disabled={loading}>
            {t("sendInvitation")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
