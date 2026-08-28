"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LEGAL_DOCUMENTS, SUPPORT_CONTACT_EMAIL } from "@/lib/legal";

export function LegalFooter({ variant = "light" }: { variant?: "light" | "dark" }) {
  const t = useTranslations("legal");

  const linkClass =
    variant === "dark"
      ? "text-slate-400 hover:text-slate-200"
      : "text-muted-foreground hover:text-foreground";

  return (
    <footer
      className={
        variant === "dark"
          ? "border-t border-slate-800 pt-4 text-center text-xs text-slate-500"
          : "border-t pt-6 text-center text-xs text-muted-foreground"
      }
    >
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/legal" className={linkClass}>
          {t("hubTitle")}
        </Link>
        <Link href="/help" className={linkClass}>
          {t("helpLink")}
        </Link>
        {LEGAL_DOCUMENTS.map((doc) => (
          <Link key={doc.slug} href={`/legal/${doc.slug}`} className={linkClass}>
            {doc.title}
          </Link>
        ))}
      </nav>
      <p className="mt-3">
        {t("customerSupport")}{" "}
        <a href={`mailto:${SUPPORT_CONTACT_EMAIL}`} className={linkClass}>
          {SUPPORT_CONTACT_EMAIL}
        </a>
      </p>
      <p className="mt-2">{t("footerNotice")}</p>
    </footer>
  );
}
