"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", key: "jumpOverview" as const },
  { id: "people", key: "jumpPeople" as const },
  { id: "cargo", key: "jumpCargo" as const },
  { id: "documents", key: "jumpDocuments" as const },
  { id: "tracking", key: "jumpTracking" as const },
  { id: "checks", key: "jumpChecks" as const },
  { id: "activity", key: "jumpActivity" as const },
];

export function ShipmentJumpNav() {
  const t = useTranslations("nav");
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (el): el is HTMLElement => el != null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.2, 0.4, 0.6] }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label={t("onThisShipment")}
      className="no-print sticky top-14 z-30 -mx-4 mb-6 border-b bg-background/95 px-4 py-2 backdrop-blur sm:top-16 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 print:hidden"
    >
      <ul className="flex gap-1 overflow-x-auto pb-1">
        {SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              className={cn(
                "inline-flex rounded-full px-3 py-1.5 text-xs font-medium",
                active === section.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t(section.key)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
