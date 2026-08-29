import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { getAppUrl } from "@/lib/app-url";
import type { ApiKey } from "@/types/database";

export default async function ApiKeysSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileForUser(supabase, user.id);
  if (!profile?.organization_id) redirect("/dashboard");

  const { data: keys } = await supabase
    .from("api_keys")
    .select(
      "id, organization_id, name, prefix, scopes, is_active, last_used_at, expires_at, created_at, updated_at"
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  const initialKeys = (keys ?? []).map((key) => ({
    ...key,
    key_hash: "",
  })) as ApiKey[];

  return (
    <>
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">API Keys</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Create and manage API keys for external system integrations
      </p>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/settings/api-docs" className="text-primary hover:underline">
          API documentation
        </Link>
        <Link href="/settings/webhooks" className="text-primary hover:underline">
          Webhooks
        </Link>
        <Link href="/settings/channels" className="text-primary hover:underline">
          Document channels
        </Link>
      </div>
      <ApiKeysManager initialKeys={initialKeys} appBaseUrl={getAppUrl()} />
    </>
  );
}
