import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAdminStats, type AdminDashboardStats } from "@/lib/admin/stats";

export interface AdminAttentionCounts {
  openFeedback: number;
  errorsLast24h: number;
  failedInbound: number;
  platformAdmins: number;
  pendingDocuments: number;
  activeRegulations: number;
  activeAbbreviations: number;
}

export interface AdminRecentError {
  id: string;
  severity: string;
  error_message: string;
  created_at: string;
  route: string | null;
}

export interface AdminRecentFeedback {
  id: string;
  type: string;
  message: string;
  created_at: string;
  users: { email: string } | null;
}

export interface AdminMigrationCheck {
  id: string;
  label: string;
  ok: boolean;
}

export interface AdminDashboardOverview {
  stats: AdminDashboardStats;
  attention: AdminAttentionCounts;
  recentErrors: AdminRecentError[];
  recentFeedback: AdminRecentFeedback[];
  migrations: AdminMigrationCheck[];
  appUrl: string;
}

async function tableOk(admin: SupabaseClient, table: string): Promise<boolean> {
  const { error } = await admin.from(table).select("id").limit(1);
  return !error;
}

async function columnOk(
  admin: SupabaseClient,
  table: string,
  column: string
): Promise<boolean> {
  const { error } = await admin.from(table).select(column).limit(1);
  return !error;
}

async function fetchMigrationChecks(
  admin: SupabaseClient
): Promise<AdminMigrationCheck[]> {
  const [
    adminColumn,
    inbound,
    abbreviations,
    ngCorridor,
    billing,
    externalInvites,
  ] = await Promise.all([
    columnOk(admin, "users", "is_platform_admin"),
    tableOk(admin, "inbound_messages"),
    tableOk(admin, "document_abbreviations"),
    admin.from("jurisdictions").select("code").eq("code", "NG").maybeSingle(),
    columnOk(admin, "organizations", "stripe_customer_id"),
    columnOk(admin, "shipment_collaborators", "invitee_email"),
  ]);

  return [
    { id: "009", label: "Platform admin & feedback", ok: adminColumn },
    { id: "011", label: "Inbound channels", ok: inbound },
    { id: "012", label: "Document abbreviations", ok: abbreviations },
    {
      id: "020",
      label: "NG/KE regulatory corridors",
      ok: Boolean(ngCorridor.data),
    },
    { id: "021", label: "Stripe billing", ok: billing },
    { id: "022", label: "External collaborator invites", ok: externalInvites },
  ];
}


export async function fetchAdminDashboardOverview(
  admin: SupabaseClient
): Promise<AdminDashboardOverview> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    stats,
    { count: openFeedback },
    { count: errorsLast24h },
    { count: failedInbound },
    { count: platformAdmins },
    { count: pendingDocuments },
    { count: activeRegulations },
    { count: activeAbbreviations },
    { data: recentErrors },
    { data: recentFeedback },
    migrations,
  ] = await Promise.all([
    fetchAdminStats(admin),
    admin
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since24h),
    admin
      .from("inbound_messages")
      .select("*", { count: "exact", head: true })
      .not("error_message", "is", null),
    admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_platform_admin", true),
    admin
      .from("documents")
      .select("*", { count: "exact", head: true })
      .in("processing_status", ["pending", "processing", "needs_review"]),
    admin
      .from("regulations")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("document_abbreviations")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("error_logs")
      .select("id, severity, error_message, created_at, route")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("feedback")
      .select("id, type, message, created_at, users(email)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
    fetchMigrationChecks(admin),
  ]);

  return {
    stats,
    attention: {
      openFeedback: openFeedback ?? 0,
      errorsLast24h: errorsLast24h ?? 0,
      failedInbound: failedInbound ?? 0,
      platformAdmins: platformAdmins ?? 0,
      pendingDocuments: pendingDocuments ?? 0,
      activeRegulations: activeRegulations ?? 0,
      activeAbbreviations: activeAbbreviations ?? 0,
    },
    recentErrors: (recentErrors ?? []) as AdminRecentError[],
    recentFeedback: (recentFeedback ?? []).map((item) => {
      const users = item.users;
      const user =
        users && typeof users === "object" && "email" in users
          ? (users as { email: string })
          : Array.isArray(users) && users[0]
            ? (users[0] as { email: string })
            : null;
      return {
        id: item.id as string,
        type: item.type as string,
        message: item.message as string,
        created_at: item.created_at as string,
        users: user,
      };
    }),
    migrations,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}
