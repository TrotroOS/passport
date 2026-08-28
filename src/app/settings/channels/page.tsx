import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { getInboundConfig } from "@/lib/inbound/config";
import { AppHeader } from "@/components/layout/app-header";
import { ChannelsSettings } from "@/components/settings/channels-settings";
import { Button } from "@/components/ui/button";

export default async function ChannelsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getUserProfileForUser(supabase, user.id);
  const config = getInboundConfig();

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
        <h1 className="mb-2 text-2xl font-bold">Document channels</h1>
        <p className="mb-6 text-muted-foreground">
          Forward trade documents via email or WhatsApp instead of manual upload
        </p>
        <ChannelsSettings
          inboundEmail={config.inboundEmail}
          whatsappNumber={config.whatsappDisplay}
          userEmail={profile?.email ?? user.email ?? ""}
          userPhone={profile?.phone ?? null}
        />
      </main>
    </div>
  );
}
