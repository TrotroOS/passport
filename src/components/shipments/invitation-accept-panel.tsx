"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatStatus } from "@/lib/utils";

interface InvitationAcceptPanelProps {
  invitationId: string;
  isAuthenticated: boolean;
}

interface InvitationDetails {
  id: string;
  role: string;
  status: string;
  invited_at: string;
  owner_organization_name: string | null;
  is_external?: boolean;
  invitee_email?: string | null;
  shipment: {
    id: string;
    shipment_ref: string;
    origin_country: string | null;
    destination_country: string | null;
    status: string;
  } | null;
}

export function InvitationAcceptPanel({
  invitationId,
  isAuthenticated,
}: InvitationAcceptPanelProps) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const returnPath = `/invitations/${invitationId}`;

  useEffect(() => {
    const endpoint = isAuthenticated
      ? `/api/invitations/${invitationId}`
      : `/api/invitations/${invitationId}/preview`;

    fetch(endpoint)
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.invitation ?? null;
      })
      .then(setInvitation)
      .finally(() => setLoading(false));
  }, [invitationId, isAuthenticated]);

  async function accept() {
    setActing(true);
    try {
      const response = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to accept invitation");
        return;
      }
      toast.success("Invitation accepted");
      router.push(`/shipments/${data.shipment_id}`);
      router.refresh();
    } finally {
      setActing(false);
    }
  }

  async function decline() {
    setActing(true);
    try {
      const response = await fetch(`/api/invitations/${invitationId}/decline`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to decline invitation");
        return;
      }
      toast.success("Invitation declined");
      router.push("/dashboard");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading invitation...</p>;
  }

  if (!invitation) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Invitation not found or you do not have access.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment collaboration invitation</CardTitle>
        <CardDescription>
          {isAuthenticated
            ? "Review the invitation details before accepting access"
            : "Sign in or create a Passport account to accept this invitation"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-4 text-sm">
          <p>
            <span className="font-medium">Shipment:</span>{" "}
            {invitation.shipment?.shipment_ref ?? "—"}
          </p>
          <p>
            <span className="font-medium">Owner organization:</span>{" "}
            {invitation.owner_organization_name ?? "—"}
          </p>
          <p>
            <span className="font-medium">Route:</span>{" "}
            {invitation.shipment?.origin_country ?? "—"} →{" "}
            {invitation.shipment?.destination_country ?? "—"}
          </p>
          {invitation.is_external && invitation.invitee_email ? (
            <p className="mt-2 text-muted-foreground">
              Invited email: {invitation.invitee_email}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{formatStatus(invitation.role)}</Badge>
            <Badge variant="secondary">{formatStatus(invitation.status)}</Badge>
            {invitation.is_external ? (
              <Badge variant="warning">New to Passport</Badge>
            ) : null}
          </div>
        </div>

        {!isAuthenticated && invitation.status === "pending" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a free Passport account or sign in with the invited email to
              collaborate on this shipment.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/signup?next=${encodeURIComponent(returnPath)}`}>
                  Create account
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/login?next=${encodeURIComponent(returnPath)}`}>
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        ) : invitation.status === "pending" ? (
          <div className="flex gap-2">
            <Button onClick={accept} disabled={acting}>
              Accept invitation
            </Button>
            <Button variant="outline" onClick={decline} disabled={acting}>
              Decline
            </Button>
          </div>
        ) : invitation.status === "active" && invitation.shipment ? (
          <Button asChild>
            <Link href={`/shipments/${invitation.shipment.id}`}>Open shipment</Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            This invitation is no longer active.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
