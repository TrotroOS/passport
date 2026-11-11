import { cookies } from "next/headers";

export async function hasSupabaseAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return store.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}
