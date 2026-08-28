import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ENDPOINTS = [
  { method: "POST", path: "/api/v1/shipments", scope: "write:shipment", desc: "Create shipment" },
  { method: "GET", path: "/api/v1/shipments", scope: "read:shipment", desc: "List shipments" },
  { method: "GET", path: "/api/v1/shipments/:id", scope: "read:shipment", desc: "Get shipment with full analysis" },
  { method: "PATCH", path: "/api/v1/shipments/:id", scope: "write:shipment", desc: "Update shipment" },
  { method: "POST", path: "/api/v1/shipments/:id/documents", scope: "write:document", desc: "Upload document (multipart)" },
  { method: "GET", path: "/api/v1/shipments/:id/documents", scope: "read:document", desc: "List documents" },
  { method: "POST", path: "/api/v1/shipments/:id/verify", scope: "write:verify", desc: "Run verification, regulatory, risk" },
  { method: "GET", path: "/api/v1/shipments/:id/verification-checks", scope: "read:analysis", desc: "Verification checks" },
  { method: "GET", path: "/api/v1/shipments/:id/regulatory-checks", scope: "read:analysis", desc: "Regulatory checks" },
  { method: "GET", path: "/api/v1/shipments/:id/risk", scope: "read:analysis", desc: "Risk assessment" },
  { method: "GET", path: "/api/v1/shipments/:id/graph", scope: "read:analysis", desc: "Trade graph" },
  { method: "GET", path: "/api/v1/shipments/:id/containers", scope: "read:shipment", desc: "List shipment containers" },
  { method: "POST", path: "/api/v1/shipments/:id/containers", scope: "write:shipment", desc: "Add container and fetch tracking" },
  { method: "GET", path: "/api/v1/shipments/:id/tracking-events", scope: "read:shipment", desc: "List tracking events" },
  { method: "POST", path: "/api/v1/shipments/:id/tracking/refresh", scope: "write:shipment", desc: "Refresh tracking from provider" },
  { method: "GET", path: "/api/v1/graph/entities?type=party&id=", scope: "read:analysis", desc: "Entity graph query" },
  { method: "POST", path: "/api/v1/shipments/:id/webhook-test", scope: "read:shipment", desc: "Send test webhook" },
];

export default async function ApiDocsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("email, organizations(name)")
    .eq("id", user!.id)
    .single();

  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <h1 className="mb-2 text-2xl font-bold">API Documentation</h1>
        <p className="mb-6 text-muted-foreground">
          Public REST API v1 — authenticate with{" "}
          <code className="rounded bg-slate-200 px-1">Authorization: Bearer pk_live_...</code>
        </p>
        <div className="mb-4 flex gap-4 text-sm">
          <Link href="/settings/api-keys" className="text-primary hover:underline">
            API Keys
          </Link>
          <Link href="/settings/webhooks" className="text-primary hover:underline">
            Webhooks
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Include your API key in the Authorization header:</p>
            <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-slate-100">
              Authorization: Bearer pk_live_your_key_here
            </pre>
            <p className="text-muted-foreground">
              Errors return JSON: {"{ error: { message, status } }"}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              Webhooks are signed with HMAC-SHA256. Verify the{" "}
              <code className="rounded bg-slate-200 px-1">X-Passport-Signature</code> header
              against the raw request body using your webhook secret.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {ENDPOINTS.map((ep) => (
                <li key={ep.path + ep.method} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs">
                      {ep.method}
                    </span>
                    <code className="text-xs">{ep.path}</code>
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      {ep.scope}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{ep.desc}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
