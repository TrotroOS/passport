"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useHasSupabaseAuthCookie } from "@/components/marketing/use-has-auth-cookie";

export function MarketingAuthHref({
  guestHref,
  memberHref,
  guestLabel,
  memberLabel,
  children,
}: {
  guestHref: string;
  memberHref: string;
  guestLabel: string;
  memberLabel: string;
  children?: ReactNode;
}) {
  const isAuthenticated = useHasSupabaseAuthCookie();
  return (
    <Link href={isAuthenticated ? memberHref : guestHref}>
      {isAuthenticated ? memberLabel : guestLabel}
      {children}
    </Link>
  );
}

export function MarketingGuestOnly({ children }: { children: ReactNode }) {
  const isAuthenticated = useHasSupabaseAuthCookie();
  if (isAuthenticated) return null;
  return children;
}
