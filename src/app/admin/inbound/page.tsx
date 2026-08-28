import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminInboundPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { data: messages } = await ctx.admin
    .from("inbound_messages")
    .select(
      "id, channel_type, sender_address, subject, processed, error_message, received_at, organizations(name), shipments(shipment_ref)"
    )
    .order("received_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Inbound messages</h1>
      <p className="mb-6 text-muted-foreground">
        Email and WhatsApp document ingestion audit trail
      </p>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent messages</CardTitle>
          <CardDescription className="text-muted-foreground">
            Last 50 inbound messages across all organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!messages?.length ? (
            <p className="text-sm text-muted-foreground">No inbound messages yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Received</th>
                    <th className="pb-2 pr-4">Channel</th>
                    <th className="pb-2 pr-4">Sender</th>
                    <th className="pb-2 pr-4">Subject</th>
                    <th className="pb-2 pr-4">Shipment</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => {
                    const org =
                      msg.organizations &&
                      typeof msg.organizations === "object" &&
                      "name" in msg.organizations
                        ? (msg.organizations as { name: string }).name
                        : "—";
                    const shipmentRef =
                      msg.shipments &&
                      typeof msg.shipments === "object" &&
                      "shipment_ref" in msg.shipments
                        ? (msg.shipments as { shipment_ref: string }).shipment_ref
                        : "—";

                    return (
                      <tr key={msg.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 text-foreground/90">
                          {formatDate(msg.received_at)}
                        </td>
                        <td className="py-3 pr-4 capitalize text-foreground/90">
                          {msg.channel_type}
                        </td>
                        <td className="py-3 pr-4 text-foreground/90">
                          <div>{msg.sender_address}</div>
                          <div className="text-xs text-muted-foreground">{org}</div>
                        </td>
                        <td className="max-w-xs truncate py-3 pr-4 text-foreground/90">
                          {msg.subject ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-foreground/90">{shipmentRef}</td>
                        <td className="py-3 pr-4">
                          {msg.error_message ? (
                            <Badge variant="destructive" title={msg.error_message}>
                              Error
                            </Badge>
                          ) : msg.processed ? (
                            <Badge variant="success">Processed</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
