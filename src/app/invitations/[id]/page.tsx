import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { InvitationAcceptPanel } from "@/components/shipments/invitation-accept-panel";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";

interface InvitationPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getUserProfileForUser(supabase, user.id) : null;
  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <InvitationAcceptPanel invitationId={id} isAuthenticated={!!user} />
      </main>
    </div>
  );
}
