import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LEGAL_DOCUMENTS, LEGAL_ENTITY_NAME, SUPPORT_CONTACT_EMAIL } from "@/lib/legal";

export default async function LegalHubPage() {
  const t = await getTranslations("legal");

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{t("hubTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("hubDescription", { entity: LEGAL_ENTITY_NAME })}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("customerSupport")}{" "}
        <a
          href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
          className="font-medium text-primary hover:underline"
        >
          {SUPPORT_CONTACT_EMAIL}
        </a>
      </p>

      <ul className="mt-8 space-y-4">
        {LEGAL_DOCUMENTS.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/legal/${doc.slug}`}
              className="block rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300"
            >
              <h2 className="font-semibold">{doc.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("lastUpdated")}: {doc.lastUpdated}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
