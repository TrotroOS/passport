"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal";
import type { NotificationPreferences } from "@/types/database";

interface ProfileSettingsProps {
  initialProfile: {
    email: string;
    full_name: string | null;
    phone: string | null;
    preferred_language: Locale;
  };
}

export function ProfileSettings({ initialProfile }: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(initialProfile.full_name ?? "");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [language, setLanguage] = useState<Locale>(initialProfile.preferred_language);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_alerts: true,
    tracking_updates: true,
    compliance_alerts: true,
    weekly_digest: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences);
      })
      .catch(() => undefined);
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      const [profileRes, notifRes] = await Promise.all([
        fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            preferred_language: language,
          }),
        }),
        fetch("/api/user/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        }),
      ]);

      if (!profileRes.ok) {
        const data = await profileRes.json();
        throw new Error(data.error ?? "Failed to save profile");
      }
      if (!notifRes.ok) {
        const data = await notifRes.json();
        throw new Error(data.error ?? "Failed to save notifications");
      }

      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function togglePref(key: keyof NotificationPreferences) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details and language preference</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={initialProfile.email} disabled className="mt-1 bg-slate-50" />
          </div>
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233…"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Locale)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {locales.map((loc) => (
                <option key={loc} value={loc}>
                  {localeLabels[loc]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what alerts you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              ["email_alerts", "Email alerts", "Compliance and shipment notifications"],
              ["tracking_updates", "Tracking updates", "Container delays and delivery events"],
              ["compliance_alerts", "Compliance alerts", "Score drops and critical discrepancies"],
              ["weekly_digest", "Weekly digest", "Summary of org compliance performance"],
            ] as const
          ).map(([key, title, desc]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
            >
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => togglePref(key)}
                className="mt-1"
              />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer support</CardTitle>
          <CardDescription>Account help, billing questions, and technical issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="block text-sm font-medium text-primary hover:underline"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
          <p className="text-sm text-muted-foreground">
            See step-by-step fixes for common issues before emailing support.
          </p>
          <Link
            href="/help"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Help & troubleshooting →
          </Link>
        </CardContent>
      </Card>

      <Button onClick={saveProfile} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
