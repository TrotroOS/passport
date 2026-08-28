"use client";

import { useRouter } from "next/navigation";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Aggregate {
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
  name?: string;
}

interface AdminAiUsageViewProps {
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    errorRate: number;
  };
  byProvider: Record<string, Aggregate>;
  byModel: Record<string, Aggregate>;
  byOrg: Record<string, Aggregate & { name: string }>;
  initialFrom: string;
  initialTo: string;
}

function AggregateTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; data: Aggregate }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 font-semibold text-foreground">{title}</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Requests</th>
            <th className="pb-2">Tokens</th>
            <th className="pb-2">Cost</th>
            <th className="pb-2">Errors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground/90">
          {rows.map(({ key, data }) => (
            <tr key={key}>
              <td className="py-2">{data.name ?? key}</td>
              <td className="py-2 tabular-nums">{data.requests}</td>
              <td className="py-2 tabular-nums">{data.tokens.toLocaleString()}</td>
              <td className="py-2 tabular-nums">${data.cost.toFixed(4)}</td>
              <td className="py-2 tabular-nums">{data.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminAiUsageView({
  summary,
  byProvider,
  byModel,
  byOrg,
  initialFrom,
  initialTo,
}: AdminAiUsageViewProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const params = new URLSearchParams();
          const from = fd.get("from");
          const to = fd.get("to");
          if (from) params.set("from", `${from}T00:00:00.000Z`);
          if (to) params.set("to", `${to}T23:59:59.999Z`);
          router.push(`/admin/ai-usage?${params.toString()}`);
        }}
      >
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <Input name="from" type="date" defaultValue={initialFrom} className="border-input bg-card" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <Input name="to" type="date" defaultValue={initialTo} className="border-input bg-card" />
        </div>
        <Button type="submit" variant="outline" className="border-input">
          Apply
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Total requests" value={summary.totalRequests} />
        <AdminStatCard label="Total tokens" value={summary.totalTokens.toLocaleString()} />
        <AdminStatCard label="Total cost" value={`$${summary.totalCost.toFixed(2)}`} />
        <AdminStatCard label="Error rate" value={`${(summary.errorRate * 100).toFixed(1)}%`} />
      </div>

      <AggregateTable
        title="By provider"
        rows={Object.entries(byProvider).map(([key, data]) => ({ key, data }))}
      />
      <AggregateTable
        title="By model"
        rows={Object.entries(byModel).map(([key, data]) => ({ key, data }))}
      />
      <AggregateTable
        title="By organization"
        rows={Object.entries(byOrg).map(([key, data]) => ({
          key,
          data: { ...data, name: data.name },
        }))}
      />
    </div>
  );
}
