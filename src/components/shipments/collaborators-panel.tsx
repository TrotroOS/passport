"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ShipmentCollaborator } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CollaboratorsPanelProps {
  shipmentId: string;
  collaborators: ShipmentCollaborator[];
  canManage: boolean;
}

function invitationUrl(collaboratorId: string): string {
  return `${window.location.origin}/invitations/${collaboratorId}`;
}

export function CollaboratorsPanel({
  shipmentId,
  collaborators,
  canManage,
}: CollaboratorsPanelProps) {
  const router = useRouter();
  const t = useTranslations("collaborators");
  const localizedStatus = useLocalizedStatus();

  async function copyLink(collaboratorId: string) {
    await navigator.clipboard.writeText(invitationUrl(collaboratorId));
    toast.success(t("linkCopied"));
  }

  async function resendInvite(collaboratorId: string) {
    const response = await fetch(
      `/api/shipments/${shipmentId}/collaborators/${collaboratorId}/resend`,
      {
        method: "POST",
        headers: { "X-App-Origin": window.location.origin },
      }
    );
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? t("resendFailed"));
      return;
    }

    if (data.email_sent) {
      toast.success(t("resent"));
      return;
    }

    if (data.invitation_url) {
      await navigator.clipboard.writeText(data.invitation_url);
      toast.success(t("copyLinkInstead"), {
        description: data.email_error
          ? `${t("copyLinkInsteadDescription")} (${data.email_error})`
          : t("copyLinkInsteadDescription"),
      });
      return;
    }

    toast.error(t("resendFailed"));
  }

  async function revoke(collaboratorId: string) {
    const response = await fetch(
      `/api/shipments/${shipmentId}/collaborators/${collaboratorId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      toast.error(t("revokeFailed"));
      return;
    }
    toast.success(t("revoked"));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noCollaborators")}</p>
        ) : (
          <ul className="space-y-3">
            {collaborators.map((collaborator) => (
              <li
                key={collaborator.id}
                className="flex items-start justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">
                    {collaborator.users?.full_name ??
                      collaborator.users?.email ??
                      collaborator.invitee_email ??
                      t("anonymousUser")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {collaborator.users?.email ?? collaborator.invitee_email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {collaborator.organizations?.name ??
                      (collaborator.invitee_email && !collaborator.users
                        ? t("pendingExternal")
                        : t("externalOrg"))}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {localizedStatus(collaborator.role)}
                    </Badge>
                    <Badge
                      variant={
                        collaborator.status === "active"
                          ? "success"
                          : collaborator.status === "pending"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {localizedStatus(collaborator.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("invited", { date: formatDate(collaborator.invited_at) })}
                  </p>
                  {collaborator.status === "pending" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("pendingHint")}
                    </p>
                  ) : null}
                </div>
                {canManage && collaborator.status !== "revoked" ? (
                  <div className="flex flex-col gap-2">
                    {collaborator.status === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(collaborator.id)}
                        >
                          {t("copyLink")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendInvite(collaborator.id)}
                        >
                          {t("resend")}
                        </Button>
                      </>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke(collaborator.id)}
                    >
                      {t("revoke")}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
