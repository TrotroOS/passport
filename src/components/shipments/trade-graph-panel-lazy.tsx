"use client";

import dynamic from "next/dynamic";
import type { ShipmentGraph } from "@/lib/graph/trade-graph";

const TradeGraphPanel = dynamic(
  () =>
    import("@/components/shipments/trade-graph-panel").then((mod) => ({
      default: mod.TradeGraphPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-lg border bg-slate-50" />
    ),
  }
);

export function TradeGraphPanelLazy({ graph }: { graph: ShipmentGraph }) {
  return <TradeGraphPanel graph={graph} />;
}
