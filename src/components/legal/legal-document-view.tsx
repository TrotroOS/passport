import type { LegalDocument } from "@/lib/legal";

interface LegalDocumentViewProps {
  document: LegalDocument;
}

export function LegalDocumentView({ document }: LegalDocumentViewProps) {
  return (
    <article className="prose prose-slate max-w-none">
      <header className="not-prose mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
        <p className="mt-2 text-muted-foreground">{document.description}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: {document.lastUpdated}
        </p>
      </header>

      <div className="space-y-8">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            {section.paragraphs?.map((paragraph, i) => (
              <p key={i} className="mt-3 leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 ? (
              <ul className="mt-3 list-disc space-y-2 ps-6 text-slate-700">
                {section.bullets.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
