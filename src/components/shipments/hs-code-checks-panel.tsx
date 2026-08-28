"use client";

import { useEffect, useState } from "react";
import { Tags } from "lucide-react";
import type { HsCodeVerificationCheck } from "@/types/database";
import { formatDate, formatStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HsCodeChecksPanelProps {
  shipmentId: string;
  products: Array<{ id: string; name: string; hs_code: string | null; hs_code_status: string }>;
}

function checkBadgeVariant(status: string) {
  switch (status) {
    case "passed":
      return "success" as const;
    case "failed":
      return "destructive" as const;
    case "needs_review":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

export function HsCodeChecksPanel({ shipmentId, products }: HsCodeChecksPanelProps) {
  const [checks, setChecks] = useState<
    (HsCodeVerificationCheck & { products?: { name: string } | null })[]
  >([]);

  useEffect(() => {
    fetch(`/api/shipments/${shipmentId}/hs-code-checks`)
      .then((res) => res.json())
      .then((data) => setChecks(data.checks ?? []))
      .catch(() => undefined);
  }, [shipmentId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">HS Code Verification</CardTitle>
        </div>
        <CardDescription>
          Classification checks per product — advisory suggestions require broker confirmation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length > 0 ? (
          <ul className="space-y-2">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium">{product.name}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-muted-foreground">
                    {product.hs_code ?? "—"}
                  </span>
                  <Badge variant="outline">
                    {formatStatus(product.hs_code_status ?? "not_verified")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No products to classify</p>
        )}

        {checks.length > 0 ? (
          <ul className="space-y-2 border-t pt-4">
            {checks.map((check) => (
              <li key={check.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {check.products?.name ?? "Product"} —{" "}
                    {formatStatus(check.check_type)}
                  </span>
                  <Badge variant={checkBadgeVariant(check.status)}>
                    {formatStatus(check.status)}
                  </Badge>
                </div>
                {(check.details as { message?: string })?.message ? (
                  <p className="mt-1 text-muted-foreground">
                    {(check.details as { message?: string }).message}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(check.created_at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run HS verification on products to see classification checks here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
