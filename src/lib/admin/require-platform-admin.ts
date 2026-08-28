import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";

export interface PlatformAdminContext {
  userId: string;
  email: string;
  admin: ReturnType<typeof createAdminClient>;
}

/** Read platform-admin flag for the signed-in user only (RLS-scoped, fail closed). */
async function readSessionPlatformAdminFlag(): Promise<{
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("users")
    .select("is_platform_admin, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return null;

  return {
    userId: user.id,
    email: profile.email,
    isPlatformAdmin: profile.is_platform_admin === true,
  };
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const session = await readSessionPlatformAdminFlag();
  if (!session || session.userId !== userId) return false;
  return session.isPlatformAdmin;
}

export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  const session = await readSessionPlatformAdminFlag();
  if (!session?.isPlatformAdmin) return null;

  return {
    userId: session.userId,
    email: session.email,
    admin: createAdminClient(),
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
