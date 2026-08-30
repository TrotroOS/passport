import Link from "next/link";
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
  { method: "POST", path: "/api/shipments/:id/clearance-autopilot", scope: "write:verify", desc: "Run customs clearance autopilot (classify + clear assistive)" },
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

export default function ApiDocsPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">API Documentation</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Public REST API v1 — authenticate with{" "}
        <code className="rounded bg-muted px-1">Authorization: Bearer pk_live_...</code>
      </p>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/settings/api-keys" className="text-primary hover:underline">
          API keys
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
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100 sm:text-sm">
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
            <code className="rounded bg-muted px-1">X-Passport-Signature</code> header
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
              <li key={`${ep.method}-${ep.path}`} className="rounded-md border p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span className="w-fit rounded bg-muted px-2 py-0.5 font-mono text-xs">
                    {ep.method}
                  </span>
                  <code className="break-all text-xs">{ep.path}</code>
                  <span className="w-fit rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    {ep.scope}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">{ep.desc}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
