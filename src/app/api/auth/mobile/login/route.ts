import { NextResponse } from "next/server";
import { mobileLogin } from "@/lib/auth/mobile-auth";
import { ApiError } from "@/lib/errors/api-error";
import { getClientIp } from "@/lib/request-client";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";

export async function POST(request: Request) {
  try {
    try {
      await checkRateLimit(`auth:login:${getClientIp(request)}`, "auth_login");
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const body = await request.json();
    const result = await mobileLogin(body.email ?? "", body.password ?? "");

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ session: result.session, user: result.user });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
