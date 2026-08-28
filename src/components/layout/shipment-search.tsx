"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  shipment_ref: string;
  status: string;
  origin_country: string | null;
  destination_country: string | null;
  match_type: "ref" | "party" | "container";
  match_label: string;
}

export function ShipmentSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/shipments/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    function onFocusSearch() {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    window.addEventListener("passport:focus-search", onFocusSearch);
    return () => window.removeEventListener("passport:focus-search", onFocusSearch);
  }, []);

  return (
    <div className="relative hidden md:block">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-44 justify-start gap-2 text-muted-foreground lg:w-56"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">{t("placeholder")}</span>
        <kbd className="ms-auto hidden rounded border bg-muted px-1 text-[10px] lg:inline">/</kbd>
      </Button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed left-1/2 top-20 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border bg-popover p-3 shadow-lg">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                autoFocus
                placeholder={t("inputPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-9"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && results[0]) {
                    router.push(`/shipments/${results[0].id}`);
                    setOpen(false);
                  }
                }}
              />
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto">
              {loading ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">{t("searching")}</p>
              ) : results.length === 0 && query.length >= 2 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">{t("noResults")}</p>
              ) : (
                <ul className="space-y-1">
                  {results.map((r) => (
                    <li key={`${r.id}-${r.match_type}-${r.match_label}`}>
                      <Link
                        href={`/shipments/${r.id}`}
                        className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-accent"
                        onClick={() => setOpen(false)}
                      >
                        <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium">{r.shipment_ref}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.match_type}: {r.match_label} · {r.origin_country ?? "—"} →{" "}
                            {r.destination_country ?? "—"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
