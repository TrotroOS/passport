import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminDashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  totalShipments: number;
  totalDocumentsProcessed: number;
  totalInboundMessages: number;
  totalAiCost: number;
  totalErrors: number;
  activeUsersLast7Days: number;
}

export async function fetchAdminStats(
  admin: SupabaseClient
): Promise<AdminDashboardStats> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString();

  const [
    { count: totalOrganizations },
    { count: totalUsers },
    { count: totalShipments },
    { count: totalDocumentsProcessed },
    { count: totalInboundMessages },
    { data: aiLogs },
    { count: totalErrors },
    { data: recentLogins },
  ] = await Promise.all([
    admin.from("organizations").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("shipments").select("*", { count: "exact", head: true }),
    admin
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("processing_status", "processed"),
    admin.from("inbound_messages").select("*", { count: "exact", head: true }),
    admin.from("ai_provider_logs").select("cost"),
    admin.from("error_logs").select("*", { count: "exact", head: true }),
    admin
      .from("audit_events")
      .select("user_id")
      .eq("action", "user.login")
      .gte("created_at", since),
  ]);

  const totalAiCost = (aiLogs ?? []).reduce(
    (sum, row) => sum + (Number(row.cost) || 0),
    0
  );

  const activeUserIds = new Set(
    (recentLogins ?? []).map((e) => e.user_id).filter(Boolean)
  );

  return {
    totalOrganizations: totalOrganizations ?? 0,
    totalUsers: totalUsers ?? 0,
    totalShipments: totalShipments ?? 0,
    totalDocumentsProcessed: totalDocumentsProcessed ?? 0,
    totalInboundMessages: totalInboundMessages ?? 0,
    totalAiCost: Math.round(totalAiCost * 100) / 100,
    totalErrors: totalErrors ?? 0,
    activeUsersLast7Days: activeUserIds.size,
  };
}
