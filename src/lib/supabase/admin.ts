import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseUrl } from "@/lib/supabase/env";

let cachedAdmin: SupabaseClient | null = null;

export function createAdminClient() {
  if (cachedAdmin) {
    return cachedAdmin;
  }

  cachedAdmin = createClient(
    requireSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return cachedAdmin;
}
