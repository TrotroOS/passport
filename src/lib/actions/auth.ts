"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logging/error-logger";
import {
  getUserPreferredLanguage,
  localeCookieOptions,
} from "@/lib/i18n/user-locale";
import {
  confirmAuthUserByEmail,
  findAuthUserByEmail,
  shouldAutoConfirmEmail,
} from "@/lib/auth/admin-auth";
import { linkPendingInvitationsForUser, isSafeRedirectPath } from "@/lib/collaboration/link-pending-invitations";
import {
  getOrganizationIdForUser,
  insertShipmentForUser,
  ORG_NOT_FOUND_MESSAGE,
} from "@/lib/auth/get-organization-id";
import {
  formatShipmentInsertError,
  isDuplicateShipmentRefError,
} from "@/lib/shipments/shipment-errors";
import { screenAndStoreParty } from "@/lib/compliance/party-screening";
import type { Party } from "@/types/database";
import {
  organizationNameFromEmail,
  uniqueSlug,
} from "@/lib/utils";
import {
  loginSchema,
  signupServerSchema,
  createShipmentSchema,
  createPartySchema,
  createProductSchema,
} from "@/lib/validations";

export type ActionResult = {
  success: boolean;
  error?: string;
};

function resolvePostAuthRedirect(formData: FormData): string {
  const next = formData.get("next");
  if (typeof next === "string" && isSafeRedirectPath(next)) {
    return next;
  }
  return "/dashboard";
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
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

  if (error) {
    await logError({
      route: "/login",
      method: "POST",
      errorMessage: error.message,
      severity: "warning",
      metadata: { email: parsed.data.email },
    });
    return { success: false, error: error.message };
  }

  const admin = createAdminClient();
  const userId = signInData.user?.id;
  if (userId) {
    const locale = await getUserPreferredLanguage(userId);
    const cookieStore = await cookies();
    cookieStore.set(localeCookieOptions(locale));

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
      });
    }

    await linkPendingInvitationsForUser(userId, parsed.data.email);
  }

  redirect(resolvePostAuthRedirect(formData));
}

export async function signupAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = signupServerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    acceptTerms: formData.get("acceptTerms"),
    referralSource: formData.get("referralSource") || undefined,
    utmSource: formData.get("utmSource") || undefined,
    utmMedium: formData.get("utmMedium") || undefined,
    utmCampaign: formData.get("utmCampaign") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { email, password, fullName } = parsed.data;
  const admin = createAdminClient();
  const supabase = await createClient();

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
        success: false,
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
      return {
        success: false,
        error: createError?.message ?? "Failed to create account",
      };
    }

    userId = created.user.id;
  } else {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create account" };
    }

    userId = authData.user.id;

    if (authData.session) {
      // fall through to org setup, then redirect below
    } else {
      return {
        success: true,
        error: "Account created. Please check your email to confirm your account, then log in.",
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
    return { success: false, error: orgError?.message ?? "Failed to create organization" };
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
    return { success: false, error: userError.message };
  }

  await writeAuditEvent(admin, {
    organizationId: org.id,
    userId,
    action: "organization.created",
    entityType: "organization",
    entityId: org.id,
    metadata: { name: orgName, slug },
  });

  await writeAuditEvent(admin, {
    organizationId: org.id,
    userId,
    action: "user.registered",
    entityType: "user",
    entityId: userId,
    metadata: {
      email,
      role: "owner",
      referral_source: parsed.data.referralSource ?? null,
      utm_source: parsed.data.utmSource ?? null,
      utm_medium: parsed.data.utmMedium ?? null,
      utm_campaign: parsed.data.utmCampaign ?? null,
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      success: true,
      error: "Account created. Please sign in.",
    };
  }

  await linkPendingInvitationsForUser(userId, email);

  redirect(resolvePostAuthRedirect(formData));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createShipmentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult & { shipmentId?: string }> {
  const parsed = createShipmentSchema.safeParse({
    shipment_ref: formData.get("shipment_ref"),
    origin_country: formData.get("origin_country") || null,
    destination_country: formData.get("destination_country") || null,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const organizationId = await getOrganizationIdForUser(supabase, user.id);

  if (!organizationId) {
    return { success: false, error: ORG_NOT_FOUND_MESSAGE };
  }

  let { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      ...parsed.data,
      organization_id: organizationId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error?.message?.includes("row-level security")) {
    const fallback = await insertShipmentForUser(
      supabase,
      user.id,
      organizationId,
      parsed.data
    );
    shipment = fallback.data;
    error = fallback.error as typeof error;
  }

  if (isDuplicateShipmentRefError(error)) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("shipments")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("shipment_ref", parsed.data.shipment_ref)
      .maybeSingle();

    if (existing?.id) {
      redirect(`/shipments/${existing.id}`);
    }

    return { success: false, error: formatShipmentInsertError(error) };
  }

  if (error || !shipment) {
    return { success: false, error: formatShipmentInsertError(error) };
  }

  await writeAuditEvent(supabase, {
    organizationId,
    userId: user.id,
    action: "shipment.created",
    entityType: "shipment",
    entityId: shipment.id,
    shipmentId: shipment.id,
    metadata: { shipment_ref: shipment.shipment_ref },
  });

  revalidatePath("/dashboard");
  redirect(`/shipments/${shipment.id}`);
}

export async function createPartyAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = createPartySchema.safeParse({
    shipment_id: formData.get("shipment_id"),
    role: formData.get("role"),
    name: formData.get("name"),
    country: formData.get("country") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    tin: formData.get("tin") || null,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const organizationId = await getOrganizationIdForUser(supabase, user.id);

  if (!organizationId) {
    return { success: false, error: ORG_NOT_FOUND_MESSAGE };
  }

  const { data: party, error } = await supabase
    .from("parties")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !party) {
    return { success: false, error: error?.message ?? "Failed to create party" };
  }

  await writeAuditEvent(supabase, {
    organizationId,
    userId: user.id,
    action: "party.created",
    entityType: "party",
    entityId: party.id,
    shipmentId: party.shipment_id,
    metadata: { role: party.role, name: party.name },
  });

  try {
    await screenAndStoreParty(party as Party, organizationId, user.id);
  } catch {
    // Screening table may not exist until migration 018 is applied
  }

  revalidatePath(`/shipments/${party.shipment_id}`);
  return { success: true };
}

export async function createProductAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = createProductSchema.safeParse({
    shipment_id: formData.get("shipment_id"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    hs_code: formData.get("hs_code") || null,
    quantity: formData.get("quantity") || null,
    unit: formData.get("unit") || null,
    unit_price: formData.get("unit_price") || null,
    currency: formData.get("currency") || "USD",
    total_value: formData.get("total_value") || null,
    country_of_origin: formData.get("country_of_origin") || null,
    product_category_id: formData.get("product_category_id") || null,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const organizationId = await getOrganizationIdForUser(supabase, user.id);

  if (!organizationId) {
    return { success: false, error: ORG_NOT_FOUND_MESSAGE };
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      ...parsed.data,
      hs_code_status: parsed.data.hs_code?.trim() ? "not_verified" : "missing",
    })
    .select()
    .single();

  if (error || !product) {
    return { success: false, error: error?.message ?? "Failed to create product" };
  }

  const { recalculateTasks } = await import("@/lib/workflow/workflow-engine");
  recalculateTasks(product.shipment_id).catch(() => undefined);

  await writeAuditEvent(supabase, {
    organizationId,
    userId: user.id,
    action: "product.created",
    entityType: "product",
    entityId: product.id,
    shipmentId: product.shipment_id,
    metadata: { name: product.name, hs_code: product.hs_code },
  });

  revalidatePath(`/shipments/${product.shipment_id}`);
  return { success: true };
}
