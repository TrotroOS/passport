import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitFeedbackSchema } from "@/lib/validations";
import { logError } from "@/lib/logging/error-logger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = submitFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const { data: feedback, error } = await supabase
      .from("feedback")
      .insert({
        organization_id: profile?.organization_id ?? null,
        user_id: user.id,
        type: parsed.data.type,
        message: parsed.data.message,
      })
      .select()
      .single();

    if (error || !feedback) {
      await logError({
        organizationId: profile?.organization_id,
        userId: user.id,
        route: "/api/feedback",
        method: "POST",
        errorMessage: error?.message ?? "Failed to submit feedback",
        severity: "error",
      });
      return NextResponse.json(
        { error: error?.message ?? "Failed to submit feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (err) {
    await logError({
      route: "/api/feedback",
      method: "POST",
      errorMessage: err instanceof Error ? err.message : "Unexpected error",
      stackTrace: err instanceof Error ? err.stack : undefined,
      severity: "error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
