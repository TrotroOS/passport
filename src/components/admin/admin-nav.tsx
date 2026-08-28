"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-medium transition-colors",
        "shrink-0 px-2.5 py-1.5 text-xs md:w-full md:px-3 md:py-2 md:text-sm",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function AdminNav() {
  return (
    <nav
      aria-label="Admin navigation"
      className={cn(
        "shrink-0 border-b bg-background md:w-56 md:rounded-lg md:border md:bg-card md:p-2 md:shadow-sm",
        "md:sticky md:top-20 md:self-start"
      )}
    >
      <ul
        className={cn(
          "flex list-none gap-1 overflow-x-auto px-2 py-2",
          "md:flex-col md:gap-0 md:space-y-0.5 md:overflow-visible md:p-0"
        )}
      >
        {ADMIN_SECTIONS.map((item) => (
          <li key={item.href} className="shrink-0 md:w-full">
            <NavLink {...item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { ADMIN_SECTIONS as ADMIN_NAV_ITEMS };
