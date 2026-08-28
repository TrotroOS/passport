import { createClient } from "@supabase/supabase-js";
import { requireSupabaseUrl } from "@/lib/supabase/env";

export function createAdminClient() {
  return createClient(
    requireSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
