import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { buildComplianceReportDocument } from "@/lib/print/compliance-report-document";
import { buildShipmentComplianceReportHtml } from "@/lib/print/shipment-compliance-report-html";
import type { PassportScore } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await requireShipmentPermission(supabase, user.id, shipmentId, "view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const shipment = access.shipment;

  const [{ data: scoreRow }, { data: organization }] = await Promise.all([
    admin
      .from("passport_scores")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("organizations").select("name").eq("id", shipment.organization_id).maybeSingle(),
  ]);

  const t = await getTranslations("print");
  const ts = await getTranslations("status");
  const score = (scoreRow ?? null) as PassportScore | null;

  const bodyHtml = buildShipmentComplianceReportHtml({
    shipment,
    score,
    organizationName: organization?.name ?? undefined,
    statusLabel: (status) => ts(status as "draft"),
    labels: {
      title: t("title"),
      tagline: t("tagline"),
      headerIntro: t("headerIntro"),
      footer: t("footer"),
      generatedAt: t("generatedAt"),
      organization: t("organization"),
      reportId: t("reportId"),
      summary: t("summary"),
      summaryIntro: t("summaryIntro"),
      shipmentRef: t("shipmentRef"),
      route: t("route"),
      status: t("status"),
      incoterm: t("incoterm"),
      passportScore: t("passportScore"),
      readiness: t("readiness"),
      readinessIntro: t("readinessIntro"),
      ownerConfirmed: t("ownerConfirmed"),
      brokerConfirmed: t("brokerConfirmed"),
      yes: t("yes"),
      no: t("no"),
      scoreBreakdown: t("scoreBreakdown"),
      scoreBreakdownIntro: t("scoreBreakdownIntro"),
      documentation: t("documentation"),
      consistency: t("consistency"),
      counterparty: t("counterparty"),
      regulatory: t("regulatory"),
      confidentialNote: t("confidentialNote"),
    },
  });

  const title = `${t("title")} — ${shipment.shipment_ref}`;
  const html = buildComplianceReportDocument(title, bodyHtml, {
    autoPrint: true,
    printButtonLabel: t("printReport"),
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Passport-Report": "compliance-v3",
    },
  });
}
