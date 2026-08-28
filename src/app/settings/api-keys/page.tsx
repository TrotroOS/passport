import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/lib/app-url";
import type { ApiKey } from "@/types/database";

export default async function ApiKeysSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("email, role, organizations(name)")
    .eq("id", user!.id)
    .single();

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, organization_id, name, key_hash, prefix, scopes, is_active, last_used_at, expires_at, created_at, updated_at")
    .order("created_at", { ascending: false });

  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  const appBaseUrl = getAppUrl();

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
        <h1 className="mb-2 text-2xl font-bold">API Keys</h1>
        <p className="mb-6 text-muted-foreground">
          Manage API keys for external system integrations
        </p>
        <div className="mb-4 flex gap-4 text-sm">
          <Link href="/settings/channels" className="text-primary hover:underline">
            Document channels
          </Link>
          <Link href="/settings/webhooks" className="text-primary hover:underline">
            Webhooks
          </Link>
          <Link href="/settings/api-docs" className="text-primary hover:underline">
            API Documentation
          </Link>
        </div>
        <ApiKeysManager
          initialKeys={(keys ?? []) as ApiKey[]}
          appBaseUrl={appBaseUrl}
        />
      </main>
    </div>
  );
}
