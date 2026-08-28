import { requirePlatformAdmin, adminSuccess, adminError } from "@/lib/admin/require-platform-admin";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { data: messages, error } = await ctx.admin
    .from("inbound_messages")
    .select(
      "id, organization_id, user_id, shipment_id, channel_type, sender_address, subject, processed, processed_at, error_message, received_at, organizations(name), users(email)"
    )
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) {
    return adminError(error.message, 500);
  }

  return adminSuccess({ messages: messages ?? [] });
}
