import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Request-scoped session user. Dedupes Auth calls in a single RSC render. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
