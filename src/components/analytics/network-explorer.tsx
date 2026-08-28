"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, Search } from "lucide-react";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PartyRow = { name: string; role: string; count: number };

type ShipmentRow = {
  id: string;
  shipment_ref: string;
  status: string;
  origin_country: string | null;
  destination_country: string | null;
};

export function NetworkExplorer() {
  const localizedStatus = useLocalizedStatus();
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [queryLabel, setQueryLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/network")
      .then((r) => r.json())
      .then((data) => setParties(data.parties ?? []))
      .finally(() => setLoading(false));
  }, []);

  const runSearch = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setSearching(true);
    setQueryLabel(name.trim());
    try {
      const params = new URLSearchParams({
        entityType: "party_by_name",
        entityId: name.trim(),
      });
      const res = await fetch(`/api/analytics/network?${params}`);
      const data = await res.json();
      setResults(data.shipments ?? []);
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Trade network explorer
          </CardTitle>
          <CardDescription>
            Find shipments linked by supplier, buyer, or party name across your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search party name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(search)}
            />
            <Button type="button" onClick={() => runSearch(search)} disabled={searching}>
              <Search className="me-2 h-4 w-4" />
              Search
            </Button>
          </div>

          {!loading && parties.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Frequent parties
              </p>
              <div className="flex flex-wrap gap-2">
                {parties.map((p) => (
                  <Button
                    key={`${p.role}-${p.name}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch(p.name);
                      runSearch(p.name);
                    }}
                  >
                    {p.name}
                    <Badge variant="secondary" className="ms-2">
                      {localizedStatus(p.role)} · {p.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {queryLabel ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {results.length} shipment{results.length === 1 ? "" : "s"} for &ldquo;{queryLabel}&rdquo;
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked shipments found.</p>
            ) : (
              <ul className="space-y-2">
                {results.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/shipments/${s.id}`}
                      className="flex items-center justify-between rounded-md border p-3 transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium">{s.shipment_ref}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.origin_country ?? "—"} → {s.destination_country ?? "—"}
                        </p>
                      </div>
                      <Badge variant="outline">{localizedStatus(s.status)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
