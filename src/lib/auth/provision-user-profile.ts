import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { organizationNameFromEmail, uniqueSlug } from "@/lib/utils";

export interface ProvisionUserProfileInput {
  userId: string;
  email: string;
  fullName: string;
  registrationMetadata?: Record<string, unknown>;
}

export type ProvisionUserProfileResult =
  | { ok: true; organizationId: string; created: boolean }
  | { ok: false; error: string };

export async function provisionUserProfile(
  input: ProvisionUserProfileInput
): Promise<ProvisionUserProfileResult> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existingProfile } = await admin
    .from("users")
    .select("id, organization_id")
    .eq("id", input.userId)
    .maybeSingle();

  if (existingProfile?.organization_id) {
    return {
      ok: true,
      organizationId: existingProfile.organization_id,
      created: false,
    };
  }

  const orgName = organizationNameFromEmail(email, input.fullName);
  const slug = uniqueSlug(orgName);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, slug })
    .select()
    .single();

  if (orgError || !org) {
    return {
      ok: false,
      error: orgError?.message ?? "Failed to create organization",
    };
  }

  const firstUserIsAdmin = process.env.FIRST_USER_IS_ADMIN === "true";
  const { count: existingUserCount } = await admin
    .from("users")
    .select("*", { count: "exact", head: true });

  const makePlatformAdmin =
    firstUserIsAdmin && (existingUserCount ?? 0) === 0;

  const profileInsert: Record<string, unknown> = {
    id: input.userId,
    email,
    full_name: input.fullName,
    organization_id: org.id,
    role: "owner",
  };

  if (makePlatformAdmin) {
    profileInsert.is_platform_admin = true;
  }

  let { error: userError } = await admin.from("users").insert(profileInsert);

  if (userError?.message?.includes("is_platform_admin")) {
    delete profileInsert.is_platform_admin;
    ({ error: userError } = await admin.from("users").insert(profileInsert));
  }

  if (userError) {
    return { ok: false, error: userError.message };
  }

  await writeAuditEvent(admin, {
    organizationId: org.id,
    userId: input.userId,
    action: "organization.created",
    entityType: "organization",
    entityId: org.id,
    metadata: { name: orgName, slug },
  });

  await writeAuditEvent(admin, {
    organizationId: org.id,
    userId: input.userId,
    action: "user.registered",
    entityType: "user",
    entityId: input.userId,
    metadata: {
      email,
      role: "owner",
      auth_provider: "oauth",
      ...input.registrationMetadata,
    },
  });

  return { ok: true, organizationId: org.id, created: true };
}

export function resolveOAuthFullName(metadata: Record<string, unknown> | undefined): string {
  const candidates = [
    metadata?.full_name,
    metadata?.name,
    metadata?.given_name,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "Passport User";
}
