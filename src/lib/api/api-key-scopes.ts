import { DEFAULT_SCOPES } from "@/lib/api/api-key-auth";

const scopeDescriptions: Record<string, string> = {
  "read:shipment": "List and retrieve shipments, containers, and tracking events",
  "write:shipment": "Create and update shipments, manage containers, refresh tracking",
  "read:document": "List shipment documents",
  "write:document": "Upload documents to shipments",
  "read:analysis": "Read verification, regulatory, risk, and graph data",
  "write:verify": "Trigger verification and compliance runs",
};

export const API_KEY_SCOPES = DEFAULT_SCOPES.map((scope) => ({
  id: scope,
  label: scope
    .replace("read:", "Read · ")
    .replace("write:", "Write · ")
    .replace("shipment", "Shipments")
    .replace("document", "Documents")
    .replace("analysis", "Analysis")
    .replace("verify", "Verification"),
  description: scopeDescriptions[scope] ?? scope,
}));

export function isValidApiScope(scope: string): boolean {
  return (DEFAULT_SCOPES as readonly string[]).includes(scope);
}
