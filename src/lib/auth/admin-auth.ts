import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export function shouldAutoConfirmEmail(): boolean {
  if (process.env.AUTO_CONFIRM_EMAIL === "false") return false;
  return (
    process.env.AUTO_CONFIRM_EMAIL === "true" ||
    process.env.NODE_ENV === "development"
  );
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

export async function confirmAuthUserByEmail(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const user = await findAuthUserByEmail(email);
  if (!user) return false;
  if (user.email_confirmed_at) return true;

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });

  return !error;
}
