"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/help", label: "Help" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/channels", label: "Channels" },
  { href: "/settings/api-keys", label: "API keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/api-docs", label: "API docs" },
  { href: "/legal", label: "Legal" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            pathname === link.href || pathname.startsWith(`${link.href}/`)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
