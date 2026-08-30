import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { ExtractionReview } from "@/components/shipments/extraction-review";
import { Button } from "@/components/ui/button";
import type { ArbiterEvent, Document, DocumentExtraction } from "@/types/database";

interface DocumentReviewPageProps {
  params: Promise<{ id: string; docId: string }>;
}

export default async function DocumentReviewPage({
  params,
}: DocumentReviewPageProps) {
  const { id: shipmentId, docId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("email, organizations(name)")
    .eq("id", user!.id)
    .single();

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", docId)
    .eq("shipment_id", shipmentId)
    .single();

  if (!document) {
    notFound();
  }

  const [{ data: extractions }, { data: arbiterEvents }] = await Promise.all([
    supabase
      .from("document_extractions")
      .select("*")
      .eq("document_id", docId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("arbiter_events")
      .select("*")
      .eq("document_id", docId)
      .order("created_at", { ascending: false }),
  ]);

  const extraction = extractions?.[0] as DocumentExtraction | undefined;

  if (!extraction) {
    notFound();
  }

  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href={`/shipments/${shipmentId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to shipment
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Review extraction
          </h1>
          <p className="text-muted-foreground">
            Verify AI-extracted fields and confirm or override
          </p>
        </div>

        <ExtractionReview
          document={document as Document}
          extraction={extraction}
          arbiterEvents={(arbiterEvents ?? []) as ArbiterEvent[]}
          shipmentId={shipmentId}
        />
      </main>
    </div>
  );
}
