"use client";

import { useMemo } from "react";
import type { ShipmentGraph } from "@/lib/graph/trade-graph";

const NODE_COLORS: Record<string, string> = {
  shipment: "#2563eb",
  party: "#8b5cf6",
  product: "#059669",
  document: "#f59e0b",
  check: "#64748b",
  discrepancy: "#ef4444",
  task: "#06b6d4",
  score: "#10b981",
  risk: "#f97316",
};

function nodeType(id: string): string {
  return id.split(":")[0] ?? "unknown";
}

function nodeLabel(id: string, graph: ShipmentGraph): string {
  const [, entityId] = id.split(":");
  if (id.startsWith("shipment:")) {
    const s = graph.shipment as { shipment_ref?: string };
    return s.shipment_ref ?? "Shipment";
  }
  if (id.startsWith("party:")) {
    const p = graph.parties.find((x) => String(x.id) === entityId);
    return String(p?.name ?? "Party").slice(0, 18);
  }
  if (id.startsWith("product:")) {
    const p = graph.products.find((x) => String(x.id) === entityId);
    return String(p?.name ?? "Product").slice(0, 18);
  }
  if (id.startsWith("document:")) {
    const d = graph.documents.find((x) => String(x.id) === entityId);
    return String(d?.doc_type ?? "Doc").slice(0, 14);
  }
  if (id.startsWith("check:")) return "Check";
  if (id.startsWith("discrepancy:")) return "Issue";
  if (id.startsWith("task:")) return "Task";
  if (id.startsWith("score:")) return "Score";
  if (id.startsWith("risk:")) return "Risk";
  return id.slice(0, 12);
}

interface TradeGraphVisualProps {
  graph: ShipmentGraph;
}

export function TradeGraphVisual({ graph }: TradeGraphVisualProps) {
  const layout = useMemo(() => {
    const nodeIds = new Set<string>();
    for (const e of graph.edges) {
      nodeIds.add(e.from);
      nodeIds.add(e.to);
    }
    if (graph.passport_score) nodeIds.add(`score:${graph.shipment.id ?? "latest"}`);
    if (graph.risk_assessment) nodeIds.add(`risk:${graph.shipment.id ?? "latest"}`);

    const centerId = `shipment:${String((graph.shipment as { id?: string }).id ?? "")}`;
    const others = Array.from(nodeIds).filter((id) => id !== centerId);
    const width = 520;
    const height = 360;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;

    const positions = new Map<string, { x: number; y: number }>();
    positions.set(centerId, { x: cx, y: cy });

    others.forEach((id, i) => {
      const angle = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions.set(id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });

    return { positions, width, height, centerId };
  }, [graph]);

  const { positions, width, height, centerId } = layout;

  return (
    <div className="app-contained-scroll rounded-md border bg-slate-50 p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-full"
        role="img"
        aria-label="Trade relationship graph"
      >
        {graph.edges.map((edge, i) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}
        {Array.from(positions.entries()).map(([id, pos]) => {
          const type = nodeType(id);
          const isCenter = id === centerId;
          const r = isCenter ? 22 : 14;
          const fill = NODE_COLORS[type] ?? "#94a3b8";
          return (
            <g key={id}>
              <circle cx={pos.x} cy={pos.y} r={r} fill={fill} opacity={0.9} />
              <text
                x={pos.x}
                y={pos.y + r + 12}
                textAnchor="middle"
                fontSize={isCenter ? 11 : 9}
                fill="#334155"
              >
                {nodeLabel(id, graph)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        {Object.entries(NODE_COLORS)
          .slice(0, 5)
          .map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {type}
            </span>
          ))}
      </div>
    </div>
  );
}
