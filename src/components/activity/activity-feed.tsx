"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AuditEventList,
  type AuditEventItem,
} from "@/components/audit/audit-event-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ActivityFeed({ limit = 30 }: { limit?: number }) {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/activity?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <AuditEventList
      events={events}
      showShipmentLink
      emptyMessage="No activity yet. Compliance actions on shipments and documents will appear here."
    />
  );
}

export function ActivityFeedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Organization-wide compliance and shipment audit trail
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActivityFeed limit={20} />
      </CardContent>
    </Card>
  );
}
