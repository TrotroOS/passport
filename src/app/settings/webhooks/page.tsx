import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { WebhooksManager } from "@/components/settings/webhooks-manager";
import type { WebhookSubscription } from "@/types/database";

export default async function WebhooksSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileForUser(supabase, user.id);
  if (!profile?.organization_id) redirect("/dashboard");

  const { data: webhooks } = await supabase
    .from("webhook_subscriptions")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return (
    <>
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">Webhooks</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Configure real-time event notifications for your organization
      </p>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/settings/api-keys" className="text-primary hover:underline">
          API keys
        </Link>
        <Link href="/settings/api-docs" className="text-primary hover:underline">
          API documentation
        </Link>
        <Link href="/settings/channels" className="text-primary hover:underline">
          Document channels
        </Link>
      </div>
      <WebhooksManager initialWebhooks={(webhooks ?? []) as WebhookSubscription[]} />
    </>
  );
}
