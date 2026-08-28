"use client";

import { useState } from "react";
import { toast } from "sonner";
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

interface ChannelsSettingsProps {
  inboundEmail: string;
  whatsappNumber: string;
  userEmail: string;
  userPhone: string | null;
}

export function ChannelsSettings({
  inboundEmail,
  whatsappNumber,
  userEmail,
  userPhone: initialPhone,
}: ChannelsSettingsProps) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);

  async function savePhone() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Phone number saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save phone");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email forwarding</CardTitle>
          <CardDescription>
            Forward trade documents from your registered email ({userEmail})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Inbound address</Label>
            <p className="mt-1 rounded-md border bg-slate-100 px-3 py-2 font-mono text-sm">
              {inboundEmail}
            </p>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-medium">Example subject</p>
            <p className="mt-1 font-mono">SHIPMENT REF: GH-IMP-2026-0042 — Invoice attached</p>
            <p className="mt-3 text-blue-800">
              Attach PDF, PNG, JPG, DOCX, XLSX, or CSV files (max 20MB each). Include your
              shipment reference in the subject or body.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>
            Send documents to our WhatsApp Business number from your registered phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>WhatsApp number</Label>
            <p className="mt-1 rounded-md border bg-slate-100 px-3 py-2 font-mono text-sm">
              {whatsappNumber}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Your phone (E.164, e.g. +233XXXXXXXXX)</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233XXXXXXXXX"
              />
              <Button type="button" onClick={savePhone} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must match the number you use to message Passport on WhatsApp.
            </p>
          </div>
          <div className="rounded-md border bg-slate-50 p-4 text-sm">
            <p className="font-medium">Example message</p>
            <p className="mt-1 font-mono text-muted-foreground">
              GH-IMP-2026-0042 — packing list attached
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
