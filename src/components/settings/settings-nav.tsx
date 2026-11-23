"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

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
  const t = useTranslations("nav");
  const links = [
    { href: "/settings/profile", label: t("settingsProfile") },
    { href: "/settings/activity", label: t("activity") },
    { href: "/settings/channels", label: t("settingsChannels") },
    { href: "/settings/api-keys", label: t("apiKeys") },
    { href: "/settings/webhooks", label: t("settingsWebhooks") },
    { href: "/settings/api-docs", label: t("settingsApiDocs") },
    { href: "/settings/billing", label: t("settingsBilling") },
    { href: "/help", label: t("help") },
    { href: "/legal", label: t("legal") },
  ];

  return (
    <nav
      aria-label={t("settings")}
      className={cn(
        "shrink-0 border-b bg-background md:w-52 md:rounded-lg md:border md:bg-card md:p-2 md:shadow-sm",
        "md:sticky md:top-[4.5rem] md:self-start lg:top-20"
      )}
    >
      <p className="hidden px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
        {t("settings")}
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
    </nav>
  );
}
