"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Shield, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PartyScreening } from "@/types/database";

interface PartyScreeningPanelProps {
  shipmentId: string;
}

function statusVariant(status: PartyScreening["match_status"]) {
  switch (status) {
    case "confirmed_match":
      return "destructive" as const;
    case "potential_match":
      return "warning" as const;
    default:
      return "success" as const;
  }
}

function statusLabel(status: PartyScreening["match_status"]) {
  switch (status) {
    case "confirmed_match":
      return "Match";
    case "potential_match":
      return "Review";
    default:
      return "Clear";
  }
}

export function PartyScreeningPanel({ shipmentId }: PartyScreeningPanelProps) {
  const [screenings, setScreenings] = useState<PartyScreening[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/screen-parties`);
      if (res.ok) {
        const data = await res.json();
        setScreenings(data.screenings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runScreening() {
    setRunning(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/screen-parties`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Screening failed");
      setScreenings(data.screenings ?? []);
      const matches = (data.screenings ?? []).filter(
        (s: PartyScreening) => s.match_status !== "clear"
      ).length;
      toast.success(
        matches > 0
          ? `Screening complete — ${matches} match(es) require review`
          : "All parties cleared"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Screening failed");
    } finally {
      setRunning(false);
    }
  }

  const hasMatches = screenings.some((s) => s.match_status !== "clear");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {hasMatches ? (
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              ) : (
                <Shield className="h-5 w-5 text-emerald-600" />
              )}
              Sanctions screening
            </CardTitle>
            <CardDescription>
              Denied-party screening against OFAC, UN, and high-risk entity lists
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={runScreening} disabled={running}>
            {running ? "Screening…" : "Run screening"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading screenings…</p>
        ) : screenings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add parties and run screening to check against sanctions lists.
          </p>
        ) : (
          <ul className="space-y-3">
            {screenings.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {s.match_status === "clear" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <span className="font-medium">{s.screened_name}</span>
                    <Badge variant={statusVariant(s.match_status)}>
                      {statusLabel(s.match_status)}
                    </Badge>
                  </div>
                  {s.match_status !== "clear" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(s.match_details as { matched_entity?: string }).matched_entity
                        ? `Matched: ${(s.match_details as { matched_entity: string }).matched_entity}`
                        : null}
                      {s.match_score > 0 ? ` · ${s.match_score}% confidence` : null}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {hasMatches ? (
          <p className="mt-3 text-xs text-amber-800">
            Review matches before proceeding with customs clearance. Escalate confirmed matches
            to your compliance officer.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
