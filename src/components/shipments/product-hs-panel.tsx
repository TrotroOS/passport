"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { HsCodeStatus, HsCodeSuggestion, Product } from "@/types/database";
import { formatStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductHsPanelProps {
  product: Product;
  canEdit: boolean;
}

function statusBadgeVariant(status: HsCodeStatus) {
  switch (status) {
    case "verified":
      return "success" as const;
    case "conflict":
      return "destructive" as const;
    case "missing":
      return "warning" as const;
    case "suggested":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function ProductHsPanel({ product, canEdit }: ProductHsPanelProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<HsCodeSuggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${product.id}/hs-suggestions`)
      .then((res) => res.json())
      .then((data) => setSuggestions(data.suggestions ?? []))
      .catch(() => undefined);
  }, [product.id]);

  async function suggest() {
    setLoadingSuggest(true);
    try {
      const response = await fetch(`/api/products/${product.id}/suggest-hs`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to generate suggestions");
        return;
      }
      setSuggestions(data.suggestions ?? []);
      toast.success("HS code suggestions generated");
      router.refresh();
    } finally {
      setLoadingSuggest(false);
    }
  }

  async function verify() {
    setLoadingVerify(true);
    try {
      const response = await fetch(`/api/products/${product.id}/verify-hs`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Verification failed");
        return;
      }
      toast.success("HS code verification complete");
      router.refresh();
    } finally {
      setLoadingVerify(false);
    }
  }

  async function selectSuggestion(suggestionId: string) {
    setSelectingId(suggestionId);
    try {
      const response = await fetch(`/api/products/${product.id}/select-hs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, markVerified: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to apply HS code");
        return;
      }
      toast.success("HS code applied — confirm with your customs broker");
      router.refresh();
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <li className="rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{product.name}</div>
          {product.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
          ) : null}
        </div>
        <Badge variant={statusBadgeVariant(product.hs_code_status ?? "not_verified")}>
          HS {formatStatus(product.hs_code_status ?? "not_verified")}
        </Badge>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Current HS code</Label>
          <Input
            value={product.hs_code ?? ""}
            readOnly
            placeholder="Not assigned"
            className="h-9"
          />
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          {product.quantity != null ? (
            <p>
              Qty: {product.quantity} {product.unit ?? ""}
            </p>
          ) : null}
          {product.country_of_origin ? (
            <p>Origin: {product.country_of_origin}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        HS code suggestions are advisory. Confirm the final classification with your licensed
        customs broker before filing.
      </p>

      {canEdit ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={suggest} disabled={loadingSuggest}>
            {loadingSuggest ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Suggest HS codes
          </Button>
          <Button size="sm" variant="ghost" onClick={verify} disabled={loadingVerify}>
            {loadingVerify ? "Verifying..." : "Verify HS code"}
          </Button>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Suggested classifications</p>
          <ul className="space-y-2">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="rounded-md border bg-muted/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold">{suggestion.hs_code}</span>
                    {suggestion.is_selected ? (
                      <Badge variant="success" className="ml-2">
                        Selected
                      </Badge>
                    ) : null}
                  </div>
                  {suggestion.confidence != null ? (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(Number(suggestion.confidence) * 100)}% confidence
                    </span>
                  ) : null}
                </div>
                {suggestion.description_match ? (
                  <p className="mt-1 text-muted-foreground">
                    {suggestion.description_match}
                  </p>
                ) : null}
                {suggestion.confidence != null ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, Math.round(Number(suggestion.confidence) * 100))}%`,
                      }}
                    />
                  </div>
                ) : null}
                {canEdit && !suggestion.is_selected ? (
                  <Button
                    size="sm"
                    className="mt-2"
                    variant="secondary"
                    disabled={selectingId === suggestion.id}
                    onClick={() => selectSuggestion(suggestion.id)}
                  >
                    Use this code
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
