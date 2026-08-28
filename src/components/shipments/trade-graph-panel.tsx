"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  List,
  Share2,
} from "lucide-react";
import type { ShipmentGraph } from "@/lib/graph/trade-graph";
import { formatStatus } from "@/lib/utils";
import { TradeGraphVisual } from "@/components/shipments/trade-graph-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TradeGraphPanelProps {
  graph: ShipmentGraph;
}

function GraphSection({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {title}
        </span>
        <Badge variant="secondary">{count}</Badge>
      </button>
      {open && <div className="border-t px-3 py-2">{children}</div>}
    </div>
  );
}

export function TradeGraphPanel({ graph }: TradeGraphPanelProps) {
  const [view, setView] = useState<"visual" | "list">("visual");
  const shipment = graph.shipment as {
    shipment_ref: string;
    origin_country: string | null;
    destination_country: string | null;
    status: string;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Trade Graph</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={view === "visual" ? "default" : "outline"}
              onClick={() => setView("visual")}
            >
              <Share2 className="me-1 h-4 w-4" />
              Graph
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "default" : "outline"}
              onClick={() => setView("list")}
            >
              <List className="me-1 h-4 w-4" />
              List
            </Button>
          </div>
        </div>
        <CardDescription>
          Relationship view across parties, products, documents, and checks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-slate-50 p-3">
          <p className="font-medium">{shipment.shipment_ref}</p>
          <p className="text-sm text-muted-foreground">
            {shipment.origin_country ?? "—"} → {shipment.destination_country ?? "—"}
          </p>
          <Badge variant="outline" className="mt-1">
            {formatStatus(shipment.status)}
          </Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            {graph.edges.length} relationships
          </p>
        </div>

        {view === "visual" ? (
          <TradeGraphVisual graph={graph} />
        ) : (
          <TradeGraphListSections graph={graph} />
        )}
      </CardContent>
    </Card>
  );
}

function TradeGraphListSections({ graph }: TradeGraphPanelProps) {
  return (
    <div className="space-y-3">
        <GraphSection title="Parties" count={graph.parties.length}>
          {graph.parties.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {graph.parties.map((p) => (
                <li key={String(p.id)} className="flex justify-between">
                  <span>{String(p.name)}</span>
                  <Badge variant="outline">{formatStatus(String(p.role))}</Badge>
                </li>
              ))}
            </ul>
          )}
        </GraphSection>

        <GraphSection title="Products" count={graph.products.length}>
          {graph.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {graph.products.map((p) => (
                <li key={String(p.id)}>
                  {String(p.name)}
                  {p.hs_code ? (
                    <span className="ml-2 text-muted-foreground">
                      HS: {String(p.hs_code)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </GraphSection>

        <GraphSection title="Documents" count={graph.documents.length}>
          {graph.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {graph.documents.map((d) => (
                <li key={String(d.id)} className="flex justify-between">
                  <span>{formatStatus(String(d.doc_type))}</span>
                  <Badge variant="outline">
                    {formatStatus(String(d.processing_status ?? "pending"))}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </GraphSection>

        <GraphSection
          title="Verification Checks"
          count={graph.verification_checks.length}
          defaultOpen={false}
        >
          <ul className="space-y-1 text-sm">
            {graph.verification_checks.map((c) => (
              <li key={String(c.id)} className="flex justify-between">
                <span>{String(c.check_id)}</span>
                <Badge variant="outline">{formatStatus(String(c.status))}</Badge>
              </li>
            ))}
          </ul>
        </GraphSection>

        <GraphSection
          title="Regulatory Checks"
          count={graph.regulatory_checks.length}
          defaultOpen={false}
        >
          <ul className="space-y-1 text-sm">
            {graph.regulatory_checks.map((c) => (
              <li key={String(c.id)} className="flex justify-between">
                <span>{String(c.check_type)}</span>
                <Badge variant="outline">{formatStatus(String(c.status))}</Badge>
              </li>
            ))}
          </ul>
        </GraphSection>

        <GraphSection
          title="Workflow Tasks"
          count={graph.workflow_tasks.length}
          defaultOpen={false}
        >
          <ul className="space-y-1 text-sm">
            {graph.workflow_tasks.map((t) => (
              <li key={String(t.id)} className="flex justify-between gap-2">
                <span className="truncate">{String(t.title)}</span>
                <Badge variant="outline">{formatStatus(String(t.status))}</Badge>
              </li>
            ))}
          </ul>
        </GraphSection>
    </div>
  );
}
