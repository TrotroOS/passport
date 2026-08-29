import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { linkPendingInvitationsForUser } from "@/lib/collaboration/link-pending-invitations";
import {
  getUserPreferredLanguage,
  localeCookieOptions,
} from "@/lib/i18n/user-locale";
import {
  provisionUserProfile,
  resolveOAuthFullName,
} from "@/lib/auth/provision-user-profile";

export async function completeOAuthSignIn(user: User): Promise<{ error?: string }> {
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return { error: "Your sign-in provider did not share an email address." };
  }

  const fullName = resolveOAuthFullName(user.user_metadata);
  const provision = await provisionUserProfile({
    userId: user.id,
    email,
    fullName,
    registrationMetadata: {
      provider: user.app_metadata.provider ?? user.app_metadata.providers?.[0] ?? "oauth",
    },
  });

  if (!provision.ok) {
    return { error: provision.error };
  }

  const admin = createAdminClient();
  const locale = await getUserPreferredLanguage(user.id);
  const cookieStore = await cookies();
  cookieStore.set(localeCookieOptions(locale));

  if (!provision.created) {
    await writeAuditEvent(admin, {
      organizationId: provision.organizationId,
      userId: user.id,
      action: "user.login",
      entityType: "user",
      entityId: user.id,
      metadata: {
        email,
        provider: user.app_metadata.provider ?? "oauth",
      },
    });
  }

  await linkPendingInvitationsForUser(user.id, email);

  return {};
}
