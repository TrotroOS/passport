"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  FileWarning,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ComplianceAlert } from "@/lib/analytics/compliance-alerts";

function AlertIcon({ category }: { category: ComplianceAlert["category"] }) {
  switch (category) {
    case "screening":
      return <ShieldAlert className="h-4 w-4 shrink-0" />;
    case "score":
      return <TrendingDown className="h-4 w-4 shrink-0" />;
    case "document":
      return <FileWarning className="h-4 w-4 shrink-0" />;
    default:
      return <AlertTriangle className="h-4 w-4 shrink-0" />;
  }
}

function severityVariant(severity: ComplianceAlert["severity"]) {
  switch (severity) {
    case "critical":
      return "destructive" as const;
    case "warning":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

export function ComplianceAlertsPanel() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/compliance-alerts?dateRange=90d&limit=8");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="h-24 animate-pulse pt-6" />
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
            <Bell className="h-4 w-4" />
            Compliance status
          </CardTitle>
          <CardDescription className="text-emerald-800">
            No critical alerts — your shipments look healthy
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Compliance alerts
              {criticalCount > 0 ? (
                <Badge variant="destructive">{criticalCount} critical</Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              Action items requiring attention across your organization
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/analytics">View analytics</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Link
                href={alert.actionUrl}
                className="flex items-start gap-3 rounded-md border p-3 transition hover:bg-slate-50"
              >
                <span
                  className={
                    alert.severity === "critical"
                      ? "text-red-600"
                      : alert.severity === "warning"
                        ? "text-amber-600"
                        : "text-slate-500"
                  }
                >
                  <AlertIcon category={alert.category} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{alert.title}</span>
                    <Badge variant={severityVariant(alert.severity)} className="text-xs">
                      {alert.shipmentRef}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
