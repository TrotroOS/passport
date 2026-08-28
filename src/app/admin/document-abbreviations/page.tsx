import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { AdminDocumentAbbreviationsManager } from "@/components/admin/admin-document-abbreviations-manager";
import type { DocumentAbbreviationRow } from "@/types/database";

export default async function AdminDocumentAbbreviationsPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { data: abbreviations } = await ctx.admin
    .from("document_abbreviations")
    .select("*")
    .order("abbreviation");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Document Abbreviations</h1>
      <p className="mb-6 text-muted-foreground">
        Reference mappings from trade abbreviations (BL, CI, PL) to canonical document types.
      </p>
      <AdminDocumentAbbreviationsManager
        initialAbbreviations={(abbreviations ?? []) as DocumentAbbreviationRow[]}
      />
    </div>
  );
}
