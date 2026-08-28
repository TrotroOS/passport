import { NextResponse } from "next/server";
import { mobileSignup } from "@/lib/auth/mobile-auth";
import { ApiError } from "@/lib/errors/api-error";
import { getClientIp } from "@/lib/request-client";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";

export async function POST(request: Request) {
  try {
    try {
      await checkRateLimit(`auth:signup:${getClientIp(request)}`, "auth_signup");
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const body = await request.json();
    const result = await mobileSignup(
      body.email ?? "",
      body.password ?? "",
      body.fullName ?? "",
      body.acceptTerms === true || body.acceptTerms === "true"
    );

    if ("error" in result) {
      const status = result.needsEmailConfirm ? 201 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ session: result.session, user: result.user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
