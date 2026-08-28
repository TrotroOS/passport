import { notFound } from "next/navigation";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { LegalSidebar } from "@/components/legal/legal-sidebar";
import { getLegalDocument, LEGAL_DOCUMENTS } from "@/lib/legal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) return { title: "Legal" };
  return {
    title: `${doc.title} — Passport`,
    description: doc.description,
  };
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
