import {
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

export async function GET(request: Request) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("organization_id");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = ctx.admin
    .from("shipments")
    .select("*, organizations(name), passport_scores(overall_score), risk_assessments(overall_risk_score, risk_level)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (orgId) query = query.eq("organization_id", orgId);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data: shipments } = await query;

  const enriched = (shipments ?? []).map((s) => {
    const scores = s.passport_scores as { overall_score: number }[] | null;
    const risks = s.risk_assessments as { overall_risk_score: number; risk_level: string }[] | null;
    const latestScore = Array.isArray(scores) ? scores[0] : null;
    const latestRisk = Array.isArray(risks) ? risks[0] : null;
    const org = s.organizations as { name: string } | null;

    return {
      id: s.id,
      shipment_ref: s.shipment_ref,
      organization_id: s.organization_id,
      organization_name: org?.name ?? "—",
      origin_country: s.origin_country,
      destination_country: s.destination_country,
      status: s.status,
      passport_score: latestScore?.overall_score ?? null,
      risk_level: latestRisk?.risk_level ?? null,
      created_at: s.created_at,
    };
  });

  return adminSuccess({ shipments: enriched });
}
