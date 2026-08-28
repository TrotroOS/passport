import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";

export interface PlatformAdminContext {
  userId: string;
  email: string;
  admin: ReturnType<typeof createAdminClient>;
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("is_platform_admin")
    .eq("id", userId)
    .single();

  return data?.is_platform_admin === true;
}

export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("is_platform_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) return null;

  return {
    userId: user.id,
    email: profile.email,
    admin,
  };
}

export async function requirePlatformAdmin(): Promise<
  PlatformAdminContext | Response
> {
  const ctx = await getPlatformAdminContext();
  if (!ctx) {
    return apiErrorResponse(
      new ApiError("FORBIDDEN", "Platform admin access required", 403)
    );
  }
  return ctx;
}

export function adminSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function adminError(message: string, status = 400): Response {
  return Response.json({ success: false, error: { message } }, { status });
}
