import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { completeOAuthSignIn } from "@/lib/auth/complete-oauth-sign-in";
import { resolvePostAuthPath } from "@/lib/auth/auth-redirect";
import { isSafeRedirectPath } from "@/lib/collaboration/link-pending-invitations";
import { getAppUrl } from "@/lib/app-url";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function loginErrorRedirect(code: string, message?: string) {
  const loginErrorUrl = new URL("/login", getAppUrl());
  loginErrorUrl.searchParams.set("error", code);
  if (message) {
    loginErrorUrl.searchParams.set("message", message);
  }
  return NextResponse.redirect(loginErrorUrl);
}

function successRedirect(request: NextRequest, redirectPath: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (process.env.NODE_ENV === "development") {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (forwardedHost) {
    return NextResponse.redirect(new URL(redirectPath, `${forwardedProto}://${forwardedHost}`));
  }

  return NextResponse.redirect(new URL(redirectPath, getAppUrl()));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const oauthError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const next = url.searchParams.get("next");
  const redirectPath =
    next && isSafeRedirectPath(next) ? next : resolvePostAuthPath(null);

  if (oauthError) {
    return loginErrorRedirect("oauth_denied", oauthError);
  }

  const response = NextResponse.next({ request });
  const supabase = createRouteHandlerClient(request, response);

  if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (verifyError) {
      return loginErrorRedirect("oauth_exchange", verifyError.message);
    }
  } else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return loginErrorRedirect("oauth_exchange", exchangeError.message);
    }
  } else {
    return loginErrorRedirect("oauth_missing_code");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return loginErrorRedirect("oauth_user");
  }

  const completion = await completeOAuthSignIn(user);
  if (completion.error) {
    await supabase.auth.signOut();
    return loginErrorRedirect("oauth_profile", completion.error);
  }

  const redirectResponse = successRedirect(request, redirectPath);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
