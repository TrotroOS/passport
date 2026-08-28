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

interface AdminErrorFiltersProps {
  organizations: Org[];
  initial: {
    severity?: string;
    organization_id?: string;
    from?: string;
    to?: string;
  };
}

export function AdminErrorFilters({ organizations, initial }: AdminErrorFiltersProps) {
  const router = useRouter();

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        for (const [key, value] of Array.from(fd.entries())) {
          if (typeof value === "string" && value.trim() && value !== "all") {
            params.set(key, value.trim());
          }
        }
        router.push(`/admin/errors?${params.toString()}`);
      }}
    >
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Severity</label>
        <Select name="severity" defaultValue={initial.severity ?? "all"}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
