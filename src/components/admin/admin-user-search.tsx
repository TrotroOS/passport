"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminUserSearchProps {
  initialQuery: string;
}

export function AdminUserSearch({ initialQuery }: AdminUserSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/admin/users?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by email or name..."
        className="max-w-sm border-input bg-card text-foreground"
      />
      <Button type="submit" variant="outline" className="border-input">
        Search
      </Button>
    </form>
  );
}
