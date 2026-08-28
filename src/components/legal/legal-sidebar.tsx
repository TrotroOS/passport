"use client";

import { usePathname } from "next/navigation";
import { LegalNav } from "@/components/legal/legal-nav";

export function LegalSidebar() {
  const pathname = usePathname();
  const slug = pathname.startsWith("/legal/") ? pathname.replace("/legal/", "") : undefined;

  return <LegalNav currentSlug={slug} />;
}
