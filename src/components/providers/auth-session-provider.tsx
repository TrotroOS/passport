"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Refresh server-rendered auth UI when Supabase session changes. */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = createClient();
      const result = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          router.refresh();
        }
      });
      subscription = result.data.subscription;
    } catch {
      // Browser auth env not configured — email/password server actions still work.
    }

    return () => subscription?.unsubscribe();
  }, [router]);

  return children;
}
