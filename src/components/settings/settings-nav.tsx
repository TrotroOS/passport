"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/channels", label: "Channels" },
  { href: "/settings/api-keys", label: "API keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/settings/api-docs", label: "API docs" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/help", label: "Help" },
  { href: "/legal", label: "Legal" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="marketing-scroll-x -mx-4 flex gap-2 overflow-x-auto border-b px-4 pb-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition",
            pathname === link.href || pathname.startsWith(`${link.href}/`)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
