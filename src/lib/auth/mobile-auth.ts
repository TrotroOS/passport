import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseAnonKey, requireSupabaseUrl } from "@/lib/supabase/env";
import { writeAuditEvent } from "@/lib/audit";
import {
  confirmAuthUserByEmail,
  findAuthUserByEmail,
  shouldAutoConfirmEmail,
} from "@/lib/auth/admin-auth";
import {
  organizationNameFromEmail,
  uniqueSlug,
} from "@/lib/utils";
import { loginSchema, signupServerSchema } from "@/lib/validations";
import { getUserProfile, type UserProfile } from "@/lib/user/user-profile";
import type { Session } from "@supabase/supabase-js";

function anonClient() {
  return createSupabaseClient(requireSupabaseUrl(), requireSupabaseAnonKey());
}

export async function mobileLogin(
  email: string,
  password: string
): Promise<{ session: Session; user: UserProfile | null } | { error: string }> {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = anonClient();
  let { data: signInData, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (
    error &&
    shouldAutoConfirmEmail() &&
    error.message.toLowerCase().includes("email not confirmed")
  ) {
    const confirmed = await confirmAuthUserByEmail(parsed.data.email);
    if (confirmed) {
      ({ data: signInData, error } = await supabase.auth.signInWithPassword(parsed.data));
    }
  }

  if (error || !signInData.session) {
    return { error: error?.message ?? "Login failed" };
  }

  const admin = createAdminClient();
  const userId = signInData.user?.id;
  if (userId) {
    const { data: profile } = await admin
      .from("users")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (profile?.organization_id) {
      await writeAuditEvent(admin, {
        organizationId: profile.organization_id,
        userId,
        action: "user.login",
        entityType: "user",
        entityId: userId,
        metadata: { source: "mobile" },
      });
    }
  }

  const user = userId ? await getUserProfile(userId) : null;
  return { session: signInData.session, user };
}

export async function mobileSignup(
  email: string,
  password: string,
  fullName: string,
  acceptTerms?: boolean
): Promise<
  { session: Session; user: UserProfile | null } | { error: string; needsEmailConfirm?: boolean }
> {
  const parsed = signupServerSchema.safeParse({
    email,
    password,
    fullName,
    acceptTerms: acceptTerms === true ? true : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const supabase = anonClient();

  let userId: string;
  const existingAuthUser = await findAuthUserByEmail(email);

  if (existingAuthUser) {
    const { data: existingProfile } = await admin
      .from("users")
      .select("id")
      .eq("id", existingAuthUser.id)
      .maybeSingle();

    if (existingProfile) {
      return {
        error: "An account with this email already exists. Please sign in instead.",
      };
    }

    if (shouldAutoConfirmEmail()) {
      await admin.auth.admin.updateUserById(existingAuthUser.id, {
        email_confirm: true,
        password,
        user_metadata: { full_name: fullName },
      });
    }

    userId = existingAuthUser.id;
  } else if (shouldAutoConfirmEmail()) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created.user) {
      return { error: createError?.message ?? "Failed to create account" };
    }

    userId = created.user.id;
  } else {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: "Failed to create account" };
    }

    userId = authData.user.id;

    if (!authData.session) {
      return {
        error: "Account created. Please check your email to confirm, then sign in.",
        needsEmailConfirm: true,
      };
    }
  }

  const orgName = organizationNameFromEmail(email, fullName);
  const slug = uniqueSlug(orgName);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, slug })
    .select()
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? "Failed to create organization" };
  }

  const firstUserIsAdmin = process.env.FIRST_USER_IS_ADMIN === "true";
  const { count: existingUserCount } = await admin
    .from("users")
    .select("*", { count: "exact", head: true });

  const makePlatformAdmin =
    firstUserIsAdmin && (existingUserCount ?? 0) === 0;

  const profileInsert: Record<string, unknown> = {
    id: userId,
    email,
    full_name: fullName,
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
    return { error: userError.message };
  }

  await writeAuditEvent(admin, {
    organizationId: org.id,
    userId,
    action: "organization.created",
    entityType: "organization",
    entityId: org.id,
    metadata: { name: orgName, slug, source: "mobile" },
  });

  await writeAuditEvent(admin, {
    organizationId: org.id,
    userId,
    action: "user.registered",
    entityType: "user",
    entityId: userId,
    metadata: { email, role: "owner", source: "mobile" },
  });

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    return { error: "Account created. Please sign in." };
  }

  const user = await getUserProfile(userId);
  return { session: signInData.session, user };
}
