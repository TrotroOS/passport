"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReadinessShipment } from "@/lib/readiness/readiness-dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ReadinessList({
  title,
  icon,
  items,
  variant,
}: {
  title: string;
  icon: React.ReactNode;
  items: ReadinessShipment[];
  variant: "success" | "warning" | "destructive";
}) {
  const t = useTranslations("readiness");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant={variant === "success" ? "success" : variant === "warning" ? "warning" : "destructive"}>
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/shipments/${s.id}`}
                  className="block rounded-md border p-3 transition hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.shipment_ref}</span>
                    {s.overallScore != null ? (
                      <Badge variant="outline">{s.overallScore}/100</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.readiness_reasons.join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ReadinessDashboardPanel() {
  const t = useTranslations("readiness");
  const [ready, setReady] = useState<ReadinessShipment[]>([]);
  const [almost, setAlmost] = useState<ReadinessShipment[]>([]);
  const [blocked, setBlocked] = useState<ReadinessShipment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/readiness");
      if (res.ok) {
        const data = await res.json();
        setReady(data.ready ?? []);
        setAlmost(data.almost ?? []);
        setBlocked(data.blocked ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="grid gap-4 lg:grid-cols-3">{[1, 2, 3].map((i) => (
      <Card key={i}><CardContent className="h-40 animate-pulse pt-6" /></Card>
    ))}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ReadinessList
          title={t("ready")}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          items={ready}
          variant="success"
        />
        <ReadinessList
          title={t("almost")}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          items={almost}
          variant="warning"
        />
        <ReadinessList
          title={t("blocked")}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          items={blocked}
          variant="destructive"
        />
      </div>
    </div>
  );
}
