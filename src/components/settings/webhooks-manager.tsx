"use client";

import { useState } from "react";
import { Copy, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import type { WebhookDelivery, WebhookSubscription } from "@/types/database";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/webhook-service";
import { WEBHOOK_EVENT_CATALOG } from "@/lib/webhooks/event-catalog";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WebhooksManagerProps {
  initialWebhooks: WebhookSubscription[];
}

export function WebhooksManager({ initialWebhooks }: WebhooksManagerProps) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [url, setUrl] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
  const [activeWebhookId, setActiveWebhookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function createWebhook() {
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch("/api/settings/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events: selectedEvents }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to create webhook");
        return;
      }
      setNewSecret(data.secret);
      setWebhooks((prev) => [
        {
          id: data.webhook.id,
          organization_id: "",
          url: data.webhook.url,
          events: data.webhook.events,
          secret: "",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setUrl("");
      toast.success("Webhook created");
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setIsCreating(false);
    }
  }

  async function revokeWebhook(id: string) {
    const response = await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Failed to deactivate webhook");
      return;
    }
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, is_active: false } : w)));
    if (activeWebhookId === id) setActiveWebhookId(null);
    toast.success("Webhook deactivated");
  }

  async function loadDeliveries(id: string) {
    setActiveWebhookId(id);
    setLoadingDeliveries(true);
    try {
      const response = await fetch(`/api/settings/webhooks/${id}/deliveries`);
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load deliveries");
        return;
      }
      setDeliveries(data.deliveries ?? []);
    } finally {
      setLoadingDeliveries(false);
    }
  }

  async function retryDelivery(deliveryId: string) {
    if (!activeWebhookId) return;
    setRetrying(deliveryId);
    try {
      const res = await fetch(`/api/settings/webhooks/${activeWebhookId}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_id: deliveryId }),
      });
      if (!res.ok) {
        toast.error("Retry failed");
        return;
      }
      toast.success("Retry sent");
      await loadDeliveries(activeWebhookId);
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event catalog</CardTitle>
          <CardDescription>
            Signed POST payloads with HMAC-SHA256 — verify the X-Passport-Signature header
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {WEBHOOK_EVENT_CATALOG.map((entry) => (
              <li key={entry.event} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{entry.event}</code>
                </div>
                <p className="mt-1 text-muted-foreground">{entry.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Payload includes: {entry.payload_hint}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Add Webhook
          </CardTitle>
          <CardDescription>Receive signed POST requests when events occur</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="https://your-server.com/webhooks/passport"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Subscribes to all event types: {selectedEvents.join(", ")}
          </p>
          <Button onClick={createWebhook} disabled={isCreating}>
            <Plus className="mr-1 h-4 w-4" />
            Add Webhook
          </Button>
          {newSecret && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="mb-2 text-sm font-medium">Webhook signing secret — store securely</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                  {newSecret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(newSecret);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks configured</p>
          ) : (
            <ul className="space-y-3">
              {webhooks.map((wh) => (
                <li key={wh.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{wh.url}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(wh.created_at)}
                      </p>
                    </div>
                    <Badge variant={wh.is_active ? "success" : "secondary"}>
                      {wh.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadDeliveries(wh.id)}>
                      Deliveries
                    </Button>
                    {wh.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => revokeWebhook(wh.id)}>
                        <Trash2 className="mr-1 h-3 w-3" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {activeWebhookId ? (
        <Card>
          <CardHeader>
            <CardTitle>Delivery log</CardTitle>
            <CardDescription>Retry failed deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDeliveries ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries yet</p>
            ) : (
              <ul className="space-y-2">
                {deliveries.map((d) => (
                  <li key={d.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{d.event_type}</span>
                      <Badge
                        variant={
                          d.status === "success"
                            ? "success"
                            : d.status === "retrying"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {d.status}
                        {d.response_code ? ` · ${d.response_code}` : ""}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
                    {d.error_message ? (
                      <p className="mt-1 text-xs text-destructive">{d.error_message}</p>
                    ) : null}
                    {(d.status === "failed" || d.status === "retrying") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={retrying === d.id}
                        onClick={() => retryDelivery(d.id)}
                      >
                        <RefreshCw className="me-1 h-3 w-3" />
                        Retry
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
