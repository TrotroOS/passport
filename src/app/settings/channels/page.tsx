import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { getInboundConfig } from "@/lib/inbound/config";
import { ChannelsSettings } from "@/components/settings/channels-settings";

export default async function ChannelsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileForUser(supabase, user.id);
  const config = getInboundConfig();

  return (
    <>
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">Document channels</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Forward trade documents via email or WhatsApp instead of manual upload
      </p>
      <ChannelsSettings
        inboundEmail={config.inboundEmail}
        whatsappNumber={config.whatsappDisplay}
        userEmail={profile?.email ?? user.email ?? ""}
        userPhone={profile?.phone ?? null}
      />
    </>
  );
}
