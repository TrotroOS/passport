import { NextResponse } from "next/server";
import { z } from "zod";
import { runApiKeyDevelopmentCheck } from "@/lib/api/api-key-development-check";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";

const testApiKeySchema = z.object({
  key: z.string().min(1, "API key is required"),
  runLiveRequest: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = testApiKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const baseUrl = getAppUrl();
  const maskedKey = `${parsed.data.key.trim().slice(0, 12)}…`;

  const result = await runApiKeyDevelopmentCheck(parsed.data.key, {
    baseUrl,
    runLiveRequest: parsed.data.runLiveRequest,
  });

  if (
    result.context &&
    result.context.organizationId !== profile.organization_id
  ) {
    return NextResponse.json(
      {
        error: "This API key belongs to a different organization",
        checks: result.checks,
        allPassed: false,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    checks: result.checks,
    allPassed: result.allPassed,
    scopes: result.context?.scopes ?? [],
    liveStatus: result.liveStatus,
    shipmentCount: result.shipmentCount,
    curl: `curl -s -H "Authorization: Bearer ${maskedKey}" "${baseUrl}/api/v1/shipments?limit=5"`,
  });
}
