import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SCOPES,
  generateApiKey,
} from "@/lib/api/api-key-auth";
import { createApiKeySchema } from "@/lib/validations";

export async function GET() {
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

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, prefix, scopes, is_active, last_used_at, expires_at, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createApiKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { key, prefix, hash } = generateApiKey();
  const scopes = parsed.data.scopes ?? [...DEFAULT_SCOPES];

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      key_hash: hash,
      prefix,
      scopes,
    })
    .select("id, name, prefix, scopes, is_active, created_at")
    .single();

  if (error || !apiKey) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create API key" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    api_key: apiKey,
    key,
    message: "Store this key securely. It will not be shown again.",
  });
}
