import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { AdminAiUsageView } from "@/components/admin/admin-ai-usage-view";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function AdminAiUsagePage({ searchParams }: PageProps) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { from, to } = await searchParams;

  let query = ctx.admin
    .from("ai_provider_logs")
    .select("*, organizations(name)")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data: logs } = await query.limit(5000);

  const byProvider: Record<string, { requests: number; tokens: number; cost: number; errors: number }> = {};
  const byModel: Record<string, { requests: number; tokens: number; cost: number; errors: number }> = {};
  const byOrg: Record<string, { requests: number; tokens: number; cost: number; errors: number; name: string }> = {};

  for (const log of logs ?? []) {
    const tokens = (log.input_tokens ?? 0) + (log.output_tokens ?? 0);
    const cost = Number(log.cost) || 0;
    const isError = log.status === "error" || log.status === "rate_limited";

    if (!byProvider[log.provider]) {
      byProvider[log.provider] = { requests: 0, tokens: 0, cost: 0, errors: 0 };
    }
    byProvider[log.provider].requests++;
    byProvider[log.provider].tokens += tokens;
    byProvider[log.provider].cost += cost;
    if (isError) byProvider[log.provider].errors++;

    const modelKey = `${log.provider}/${log.model}`;
    if (!byModel[modelKey]) {
      byModel[modelKey] = { requests: 0, tokens: 0, cost: 0, errors: 0 };
    }
    byModel[modelKey].requests++;
    byModel[modelKey].tokens += tokens;
    byModel[modelKey].cost += cost;
    if (isError) byModel[modelKey].errors++;

    const orgId = log.organization_id ?? "unknown";
    const orgName =
      log.organizations && typeof log.organizations === "object" && "name" in log.organizations
        ? (log.organizations as { name: string }).name
        : "Unknown";
    if (!byOrg[orgId]) {
      byOrg[orgId] = { requests: 0, tokens: 0, cost: 0, errors: 0, name: orgName };
    }
    byOrg[orgId].requests++;
    byOrg[orgId].tokens += tokens;
    byOrg[orgId].cost += cost;
    if (isError) byOrg[orgId].errors++;
  }

  const totalRequests = logs?.length ?? 0;
  const totalErrors = (logs ?? []).filter(
    (l) => l.status === "error" || l.status === "rate_limited"
  ).length;

  const summary = {
    totalRequests,
    totalTokens: (logs ?? []).reduce(
      (s, l) => s + (l.input_tokens ?? 0) + (l.output_tokens ?? 0),
      0
    ),
    totalCost: (logs ?? []).reduce((s, l) => s + (Number(l.cost) || 0), 0),
    errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Model usage</h1>
      <AdminAiUsageView
        summary={summary}
        byProvider={byProvider}
        byModel={byModel}
        byOrg={byOrg}
        initialFrom={from?.slice(0, 10) ?? ""}
        initialTo={to?.slice(0, 10) ?? ""}
      />
    </div>
  );
}
