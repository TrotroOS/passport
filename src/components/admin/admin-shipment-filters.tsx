"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Org {
  id: string;
  name: string;
}

interface AdminShipmentFiltersProps {
  organizations: Org[];
  initial: {
    organization_id?: string;
    status?: string;
    from?: string;
    to?: string;
  };
}

export function AdminShipmentFilters({ organizations, initial }: AdminShipmentFiltersProps) {
  const router = useRouter();

  function apply(form: HTMLFormElement) {
    const fd = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of Array.from(fd.entries())) {
      if (typeof value === "string" && value.trim() && value !== "all") {
        params.set(key, value.trim());
      }
    }
    router.push(`/admin/shipments?${params.toString()}`);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Organization</label>
        <Select name="organization_id" defaultValue={initial.organization_id ?? "all"}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {organizations.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <Select name="status" defaultValue={initial.status ?? "all"}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="documents_uploaded">Documents uploaded</SelectItem>
            <SelectItem value="in_review">In review</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input
          name="from"
          type="date"
          defaultValue={initial.from?.slice(0, 10) ?? ""}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input
          name="to"
          type="date"
          defaultValue={initial.to?.slice(0, 10) ?? ""}
        />
      </div>
      <Button type="submit" variant="outline" className="border-input">
        Filter
      </Button>
    </form>
  );
}
