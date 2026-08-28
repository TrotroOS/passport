import Link from "next/link";
import { History } from "lucide-react";
import {
  formatAuditAction,
  formatAuditEntityType,
} from "@/lib/audit/audit-labels";
import { cn, formatDate } from "@/lib/utils";

export interface AuditEventItem {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  shipment_id?: string | null;
  metadata?: Record<string, unknown> | null;
  shipments?: { shipment_ref: string } | null;
  users?: { full_name: string | null; email: string | null } | null;
}

interface AuditEventListProps {
  events: AuditEventItem[];
  emptyMessage?: string;
  showShipmentLink?: boolean;
  compact?: boolean;
  className?: string;
}

function actorLabel(event: AuditEventItem): string | null {
  const user = event.users;
  if (!user) return null;
  if (user.full_name?.trim()) return user.full_name.trim();
  if (user.email) return user.email;
  return null;
}

export function AuditEventList({
  events,
  emptyMessage = "No audit events yet.",
  showShipmentLink = false,
  compact = false,
  className,
}: AuditEventListProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {events.map((event) => {
        const actor = actorLabel(event);
        const context =
          event.metadata?.shipment_ref != null
            ? String(event.metadata.shipment_ref)
            : null;

        return (
          <li
            key={event.id}
            className={cn(
              "rounded-md border bg-card text-sm",
              compact ? "px-3 py-2" : "px-4 py-3"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="font-medium leading-snug text-foreground">
                  {formatAuditAction(event.action)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatAuditEntityType(event.entity_type)}
                  {context ? ` · ${context}` : null}
                  {actor ? ` · ${actor}` : null}
                </p>
              </div>
              <div className="shrink-0 text-end">
                {showShipmentLink && event.shipment_id ? (
                  <Link
                    href={`/shipments/${event.shipment_id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {event.shipments?.shipment_ref ?? "View shipment"}
                  </Link>
                ) : null}
                <p
                  className={cn(
                    "text-xs text-muted-foreground",
                    showShipmentLink && event.shipment_id ? "mt-1" : undefined
                  )}
                >
                  {formatDate(event.created_at)}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AuditEventListHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <History className="h-5 w-5 text-muted-foreground" />
      <div>
        <h3 className="text-lg font-semibold leading-none">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
