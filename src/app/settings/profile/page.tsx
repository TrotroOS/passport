import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { getUserProfile } from "@/lib/user/user-profile";
import { AppHeader } from "@/components/layout/app-header";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { Button } from "@/components/ui/button";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileForUser(supabase, user.id);
  const fullProfile = await getUserProfile(user.id);

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
            <ArrowLeft className="me-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>
        {fullProfile ? (
          <ProfileSettings
            initialProfile={{
              email: fullProfile.email,
              full_name: fullProfile.full_name,
              phone: fullProfile.phone,
              preferred_language: fullProfile.preferred_language,
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
