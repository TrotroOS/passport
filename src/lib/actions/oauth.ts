"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthCallbackUrl } from "@/lib/auth/auth-redirect";
import { isSafeRedirectPath } from "@/lib/collaboration/link-pending-invitations";

const OAUTH_PROVIDERS = ["google", "apple"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

function isOAuthProvider(value: FormDataEntryValue | null): value is OAuthProvider {
  return typeof value === "string" && OAUTH_PROVIDERS.includes(value as OAuthProvider);
}

export async function signInWithOAuthAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (!isOAuthProvider(provider)) {
    redirect("/login?error=oauth_provider");
  }

  const intent = formData.get("intent");
  if (intent === "signup") {
    const acceptedTerms = formData.get("acceptTerms");
    const termsAccepted =
      acceptedTerms === "on" ||
      acceptedTerms === "true" ||
      acceptedTerms === "1";
    if (!termsAccepted) {
      redirect("/signup?error=oauth_terms");
    }
  }

  const next = formData.get("next");
  const nextPath = typeof next === "string" && isSafeRedirectPath(next) ? next : null;
  const redirectTo = getAuthCallbackUrl(nextPath);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams:
        provider === "google"
          ? { prompt: "select_account", access_type: "online" }
          : undefined,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=oauth_start&provider=${provider}`);
  }

  redirect(data.url);
}
