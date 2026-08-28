import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ShipmentDutyEstimate } from "@/lib/trade/duty-estimator";
import { Calculator } from "lucide-react";

interface DutyEstimateCardProps {
  estimate: ShipmentDutyEstimate;
}

export function DutyEstimateCard({ estimate }: DutyEstimateCardProps) {
  if (estimate.products.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Landed cost estimate
        </CardTitle>
        <CardDescription>
          Estimated import duty, VAT, and levies ({estimate.currency}) ·{" "}
          {estimate.originCountry ?? "—"} → {estimate.destinationCountry ?? "—"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">CIF value</p>
            <p className="text-lg font-semibold">
              ${estimate.subtotalCif.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Import duty</p>
            <p className="text-lg font-semibold">${estimate.totalDuty.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">VAT (15%)</p>
            <p className="text-lg font-semibold">${estimate.totalVat.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total landed</p>
            <p className="text-lg font-bold text-primary">
              ${estimate.grandTotal.toLocaleString()}
            </p>
          </div>
        </div>

        {estimate.products.length > 1 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Product</th>
                  <th className="pb-2 pr-3 font-medium">HS</th>
                  <th className="pb-2 pr-3 font-medium">CIF</th>
                  <th className="pb-2 pr-3 font-medium">Duty %</th>
                  <th className="pb-2 font-medium">Landed</th>
                </tr>
              </thead>
              <tbody>
                {estimate.products.map((p) => (
                  <tr key={p.productId} className="border-b">
                    <td className="py-2 pr-3">{p.productName}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{p.hsCode ?? "—"}</td>
                    <td className="py-2 pr-3">${p.cifValue.toLocaleString()}</td>
                    <td className="py-2 pr-3">{p.dutyRate}%</td>
                    <td className="py-2">${p.totalLanded.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">{estimate.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
