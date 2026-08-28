"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("shortcuts");
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "?" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      if (typing) return;

      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        window.dispatchEvent(new Event("passport:focus-search"));
        return;
      }

      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        router.push("/shipments/new");
        return;
      }

      if (e.key === "g" && !e.metaKey) {
        const next = (ev: KeyboardEvent) => {
          if (ev.key === "d") router.push("/dashboard");
          if (ev.key === "r") router.push("/readiness");
          if (ev.key === "c") router.push("/compliance/calendar");
          window.removeEventListener("keydown", next);
        };
        window.addEventListener("keydown", next, { once: true });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <>
      {children}
      {showHelp ? (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowHelp(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-popover p-6 shadow-xl">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Command className="h-5 w-5" />
              {t("title")}
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-4">
                <span>{t("newShipment")}</span>
                <kbd className="rounded border px-2 py-0.5 font-mono text-xs">N</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>{t("search")}</span>
                <kbd className="rounded border px-2 py-0.5 font-mono text-xs">/</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>{t("dashboard")}</span>
                <kbd className="rounded border px-2 py-0.5 font-mono text-xs">G D</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>{t("readiness")}</span>
                <kbd className="rounded border px-2 py-0.5 font-mono text-xs">G R</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>{t("calendar")}</span>
                <kbd className="rounded border px-2 py-0.5 font-mono text-xs">G C</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>{t("help")}</span>
                <kbd className="rounded border px-2 py-0.5 font-mono text-xs">?</kbd>
              </li>
            </ul>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setShowHelp(false)}>
              {t("close")}
            </Button>
          </div>
        </>
      ) : null}
    </>
  );
}
