import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { WebhooksManager } from "@/components/settings/webhooks-manager";
import { Button } from "@/components/ui/button";
import type { WebhookSubscription } from "@/types/database";

export default async function WebhooksSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("email, organizations(name)")
    .eq("id", user!.id)
    .single();

  const { data: webhooks } = await supabase
    .from("webhook_subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <h1 className="mb-2 text-2xl font-bold">Webhooks</h1>
        <p className="mb-6 text-muted-foreground">
          Configure real-time event notifications for your organization
        </p>
        <div className="mb-4 flex gap-4 text-sm">
          <Link href="/settings/channels" className="text-primary hover:underline">
            Document channels
          </Link>
          <Link href="/settings/api-keys" className="text-primary hover:underline">
            API Keys
          </Link>
          <Link href="/settings/api-docs" className="text-primary hover:underline">
            API Documentation
          </Link>
        </div>
        <WebhooksManager
          initialWebhooks={(webhooks ?? []) as WebhookSubscription[]}
        />
      </main>
    </div>
  );
}
