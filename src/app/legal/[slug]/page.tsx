import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { LegalSidebar } from "@/components/legal/legal-sidebar";
import { getLegalDocument, LEGAL_DOCUMENTS } from "@/lib/legal";
import { buildPageMetadata } from "@/lib/seo/metadata";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) return { title: "Legal" };

  return buildPageMetadata({
    title: `${doc.title} — Passport`,
    description: doc.description,
    path: `/legal/${slug}`,
  });
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) notFound();

  return (
    <>
      <div className="mb-6 lg:hidden">
        <LegalSidebar />
      </div>
      <LegalDocumentView document={doc} />
    </>
  );
}
