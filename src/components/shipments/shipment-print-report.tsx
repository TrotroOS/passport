"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  formatAuditAction,
  formatAuditEntityType,
  formatAuditExportId,
  formatAuditTimestamp,
} from "@/lib/audit/audit-labels";
import type {
  AuditEvent,
  Discrepancy,
  Party,
  PassportScore,
  Product,
  Shipment,
  WorkflowTask,
} from "@/types/database";
import { formatStatus } from "@/lib/utils";
import { useShipmentPrint } from "@/hooks/use-shipment-print";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShipmentPrintReportProps {
  shipment: Shipment;
  score: PassportScore | null;
  parties: Party[];
  products: Product[];
  documentCount: number;
  openDiscrepancies: Discrepancy[];
  openTasks: WorkflowTask[];
  auditEvents?: AuditEvent[];
  organizationName?: string;
  compact?: boolean;
  className?: string;
}

export function ShipmentPrintReport({
  shipment,
  score,
  parties,
  products,
  documentCount,
  openDiscrepancies,
  openTasks,
  auditEvents = [],
  organizationName,
  compact = false,
  className,
}: ShipmentPrintReportProps) {
  const t = useTranslations("print");
  const ts = useTranslations("status");
  const [mounted, setMounted] = useState(false);
  const printReport = useShipmentPrint();
  const generatedAt = new Date();
  const exportId = formatAuditExportId(shipment.shipment_ref, generatedAt);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handlePrint() {
    printReport();
  }

  const printContent = (
    <div id="shipment-print-document" className="audit-print-root" aria-hidden="true">
      <div className="audit-print space-y-8 p-10 text-sm text-black">
        <header className="border-b-2 border-slate-900 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Passport
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
              <p className="mt-2 text-slate-600">{t("footer")}</p>
            </div>
            <div className="text-end text-xs text-slate-600">
              <p className="font-semibold uppercase tracking-wide text-slate-900">Report ID</p>
              <p className="mt-1 font-mono">{exportId}</p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-600">
                {t("generatedAt")}
              </dt>
              <dd>{formatAuditTimestamp(generatedAt.toISOString())}</dd>
            </div>
            {organizationName ? (
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-600">
                  Organization
                </dt>
                <dd>{organizationName}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <section>
          <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
            {t("summary")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <dt className="font-medium text-slate-600">{t("shipmentRef")}</dt>
              <dd className="font-semibold">{shipment.shipment_ref}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">{t("route")}</dt>
              <dd>
                {shipment.origin_country ?? "—"} → {shipment.destination_country ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">{t("status")}</dt>
              <dd>{ts(shipment.status as "draft")}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">{t("passportScore")}</dt>
              <dd>{score?.overall_score ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
            {t("partiesSection")}
          </h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-600">
                <th className="py-2 pe-4 font-semibold">Name</th>
                <th className="py-2 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => (
                <tr key={party.id} className="border-b border-slate-200">
                  <td className="py-2 pe-4">{party.name}</td>
                  <td className="py-2">{ts(party.role as "seller")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
            {t("productsSection")}
          </h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-600">
                <th className="py-2 pe-4 font-semibold">Product</th>
                <th className="py-2 font-semibold">HS code</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-slate-200">
                  <td className="py-2 pe-4">{product.name}</td>
                  <td className="py-2">{product.hs_code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
            {t("documentsSection")}
          </h2>
          <p>
            {documentCount} document{documentCount === 1 ? "" : "s"} on file
          </p>
        </section>

        {openDiscrepancies.length > 0 ? (
          <section>
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
              {t("discrepanciesSection")}
            </h2>
            <ul className="space-y-2">
              {openDiscrepancies.map((item) => (
                <li key={item.id} className="border-b border-slate-200 pb-2">
                  <span className="font-medium">{formatStatus(item.severity)}:</span>{" "}
                  {item.description}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {openTasks.length > 0 ? (
          <section>
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
              {t("tasksSection")}
            </h2>
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <li key={task.id} className="border-b border-slate-200 pb-2">
                  {task.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {auditEvents.length > 0 ? (
          <section>
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
              Audit trail
            </h2>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-600">
                  <th className="py-2 pe-4 font-semibold">Timestamp</th>
                  <th className="py-2 pe-4 font-semibold">Action</th>
                  <th className="py-2 font-semibold">Entity</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.slice(0, 15).map((event) => (
                  <tr key={event.id} className="border-b border-slate-200">
                    <td className="py-2 pe-4 align-top text-xs">
                      {formatAuditTimestamp(event.created_at)}
                    </td>
                    <td className="py-2 pe-4 align-top">{formatAuditAction(event.action)}</td>
                    <td className="py-2 align-top">{formatAuditEntityType(event.entity_type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <footer className="border-t border-slate-300 pt-4 text-xs text-slate-600">
          <p>{t("footer")}</p>
          <p className="mt-2">
            Confidential compliance record generated by Passport. For internal review and audit
            purposes.
          </p>
        </footer>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className={cn("no-print print:hidden", className)}
        aria-label={compact ? t("printReport") : undefined}
      >
        <Printer className={compact ? "h-4 w-4 shrink-0 sm:me-2" : "me-2 h-4 w-4"} />
        <span className={compact ? "hidden truncate sm:inline" : undefined}>{t("printReport")}</span>
      </Button>

      {mounted ? createPortal(printContent, document.body) : null}
    </>
  );
}
