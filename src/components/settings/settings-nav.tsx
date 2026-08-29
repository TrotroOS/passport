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

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href.startsWith("/settings") && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-md font-medium transition-colors",
        "shrink-0 px-2.5 py-1.5 text-xs md:w-full md:px-3 md:py-2 md:text-sm",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function SettingsNav() {
  return (
    <nav
      aria-label="Settings navigation"
      className={cn(
        "shrink-0 border-b bg-background md:w-52 md:rounded-lg md:border md:bg-card md:p-2 md:shadow-sm",
        "md:sticky md:top-[4.5rem] md:self-start lg:top-20"
      )}
    >
      <p className="hidden px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
        Settings
      </p>
      <ul
        className={cn(
          "flex list-none gap-1 overflow-x-auto px-2 py-2",
          "md:flex-col md:gap-0 md:space-y-0.5 md:overflow-visible md:p-0"
        )}
      >
        {links.map((link) => (
          <li key={link.href} className="shrink-0 md:w-full">
            <NavLink {...link} />
          </li>
        ))}
      </ul>
      <p className="px-2 pb-2 text-[11px] text-muted-foreground md:hidden">
        Swipe to see more sections
      </p>
    </nav>
  );
}
