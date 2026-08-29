import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/user/user-profile";
import { ProfileSettings } from "@/components/settings/profile-settings";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullProfile = await getUserProfile(user.id);

  return (
    <>
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">Profile</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Manage your account details and preferences
      </p>
      {fullProfile ? (
        <ProfileSettings
          initialProfile={{
            email: fullProfile.email,
            full_name: fullProfile.full_name,
            phone: fullProfile.phone,
            preferred_language: fullProfile.preferred_language,
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Unable to load your profile. Refresh the page or contact support.
        </p>
      )}
    </>
  );
}
