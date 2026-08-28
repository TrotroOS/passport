import {
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { fetchAdminStats } from "@/lib/admin/stats";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const stats = await fetchAdminStats(ctx.admin);
  return adminSuccess(stats);
}
