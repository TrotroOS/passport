"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Copy,
  Key,
  Loader2,
  Plus,
  Terminal,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { ApiKey } from "@/types/database";
import { DEFAULT_SCOPES } from "@/lib/api/api-key-auth";
import { API_KEY_SCOPES } from "@/lib/api/api-key-scopes";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ApiKeysManagerProps {
  initialKeys: ApiKey[];
  appBaseUrl: string;
}

interface DevelopmentCheckItem {
  id: string;
  label: string;
  passed: boolean;
  message: string;
}

interface DevelopmentCheckResult {
  checks: DevelopmentCheckItem[];
  allPassed: boolean;
  scopes?: string[];
  curl?: string;
}

const LAST_KEY_STORAGE = "passport_last_api_key";

export function ApiKeysManager({ initialKeys, appBaseUrl }: ApiKeysManagerProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    ...DEFAULT_SCOPES,
  ]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [testKey, setTestKey] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [checkResult, setCheckResult] = useState<DevelopmentCheckResult | null>(
    null
  );
  const newKeyRevealRef = useRef<HTMLDivElement>(null);
  const testKeyInputRef = useRef<HTMLTextAreaElement>(null);

  const baseUrl = appBaseUrl.replace(/\/$/, "");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LAST_KEY_STORAGE);
      if (saved?.startsWith("pk_live_")) {
        setNewKey(saved);
        setTestKey(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const curlExample = useMemo(() => {
    const sampleKey = testKey.trim() || "pk_live_your_key_here";
    return `curl -s -H "Authorization: Bearer ${sampleKey}" "${baseUrl}/api/v1/shipments?limit=5"`;
  }, [baseUrl, testKey]);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((item) => item !== scope)
        : [...prev, scope]
    );
  }

  async function createKey() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Select at least one scope");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: selectedScopes }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Failed to create key");
        return;
      }

      if (!data.key || typeof data.key !== "string") {
        toast.error("Key was saved but the secret was not returned. Please try again.");
        if (data.api_key) {
          setKeys((prev) => [data.api_key, ...prev]);
        }
        return;
      }

      setNewKey(data.key);
      setTestKey(data.key);
      try {
        sessionStorage.setItem(LAST_KEY_STORAGE, data.key);
      } catch {
        // ignore storage errors
      }
      setCheckResult(null);
      const created = {
        ...data.api_key,
        is_active: data.api_key.is_active ?? true,
      };
      setKeys((prev) => [created, ...prev]);
      setName("");
      toast.success("API key created — copy it now, it won't be shown again");
      requestAnimationFrame(() => {
        newKeyRevealRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch {
      toast.error("Failed to create key");
    } finally {
      setIsCreating(false);
    }
  }

  async function runDevelopmentCheck() {
    if (!testKey.trim()) {
      toast.error("Enter an API key to test");
      return;
    }

    setIsTesting(true);
    setCheckResult(null);
    try {
      const response = await fetch("/api/settings/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: testKey.trim(), runLiveRequest: true }),
      });
      const data = await response.json();

      if (!response.ok && !data.checks) {
        toast.error(data.error ?? "Connection check failed");
        return;
      }

      setCheckResult({
        checks: data.checks ?? [],
        allPassed: Boolean(data.allPassed),
        scopes: data.scopes,
        curl: data.curl,
      });

      if (data.allPassed) {
        toast.success("All development checks passed");
      } else {
        toast.error("One or more checks failed");
      }
    } catch {
      toast.error("Connection check failed");
    } finally {
      setIsTesting(false);
    }
  }

  async function revokeKey(id: string) {
    const response = await fetch(`/api/settings/api-keys/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Failed to revoke key");
      return;
    }
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, is_active: false } : k))
    );
    toast.success("API key revoked");
  }

  async function copyText(value: string, label: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      toast.success(`${label} copied`);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast.success(`${label} copied`);
      } catch {
        toast.error("Could not copy — select the key and copy manually");
      }
    }
  }

  function selectKeyText(element: HTMLInputElement | HTMLTextAreaElement) {
    element.focus();
    element.select();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Create API Key
          </CardTitle>
          <CardDescription>
            Generate a key for external integrations. Keys are hashed at rest and
            shown only once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="api-key-name">Key name</Label>
            <Input
              id="api-key-name"
              placeholder="Production ERP integration"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Scopes</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {API_KEY_SCOPES.map((scope) => {
                const active = selectedScopes.includes(scope.id);
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => toggleScope(scope.id)}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-medium">{scope.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {scope.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="button" onClick={createKey} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create API Key
          </Button>

          {newKey ? (
            <div
              ref={newKeyRevealRef}
              className="rounded-md border-2 border-amber-400 bg-amber-50 p-4 shadow-sm"
            >
              <p className="mb-1 text-sm font-semibold text-amber-950">
                Your new API key
              </p>
              <p className="mb-3 text-sm text-amber-900">
                Copy and store this key securely. It will not be shown again.
              </p>
              <div className="space-y-3">
                <Input
                  readOnly
                  value={newKey}
                  aria-label="New API key"
                  className="h-auto min-h-10 font-mono text-sm leading-relaxed"
                  onFocus={(e) => selectKeyText(e.target)}
                  onClick={(e) => selectKeyText(e.currentTarget)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => copyText(newKey, "API key")}
                  >
                    <Copy className="me-2 h-4 w-4" />
                    Copy API key
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewKey(null);
                      try {
                        sessionStorage.removeItem(LAST_KEY_STORAGE);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Web Development Check
          </CardTitle>
          <CardDescription>
            Validate key format, authentication, scopes, and a live request to{" "}
            <code className="rounded bg-muted px-1">GET /api/v1/shipments</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-test">API key to test</Label>
            <p className="text-xs text-muted-foreground">
              Paste the full key here. Keys listed below only show a prefix — the
              secret is available once, right after you create it.
            </p>
            <textarea
              id="api-key-test"
              ref={testKeyInputRef}
              rows={2}
              autoComplete="off"
              spellCheck={false}
              placeholder="pk_live_..."
              value={testKey}
              onChange={(e) => {
                setTestKey(e.target.value);
                setCheckResult(null);
              }}
              onFocus={(e) => selectKeyText(e.target)}
              className="flex min-h-[4.5rem] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {testKey.trim() ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(testKey.trim(), "API key")}
                >
                  <Copy className="me-2 h-4 w-4" />
                  Copy key
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    testKeyInputRef.current?.focus();
                    testKeyInputRef.current?.select();
                  }}
                >
                  Select all
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runDevelopmentCheck} disabled={isTesting}>
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Run Connection Check
            </Button>
            <Button
              variant="outline"
              onClick={() => copyText(curlExample, "cURL command")}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy cURL
            </Button>
          </div>

          <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
            {curlExample}
          </pre>

          {checkResult ? (
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Check results</p>
                <Badge variant={checkResult.allPassed ? "success" : "destructive"}>
                  {checkResult.allPassed ? "Passed" : "Failed"}
                </Badge>
              </div>
              <ul className="space-y-2">
                {checkResult.checks.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    {item.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-muted-foreground">{item.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {checkResult.scopes?.length ? (
                <div className="flex flex-wrap gap-1">
                  {checkResult.scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Circle className="h-3 w-3" />
                Key format validation
              </li>
              <li className="flex items-center gap-2">
                <Circle className="h-3 w-3" />
                Authentication against your organization
              </li>
              <li className="flex items-center gap-2">
                <Circle className="h-3 w-3" />
                Scope verification for shipment reads
              </li>
              <li className="flex items-center gap-2">
                <Circle className="h-3 w-3" />
                Shipment list access for your organization
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>
            Revoked keys remain listed for audit purposes but cannot authenticate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API keys configured for this organization.
            </p>
          ) : (
            <ul className="space-y-3">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {key.prefix}••••••••
                      <span className="ms-2 text-xs font-sans text-muted-foreground">
                        (secret hidden — create a new key to get a copyable secret)
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(key.scopes as string[]).map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created {formatDate(key.created_at)}
                      {key.last_used_at
                        ? ` · Last used ${formatDate(key.last_used_at)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={key.is_active ? "success" : "secondary"}>
                      {key.is_active ? "Active" : "Revoked"}
                    </Badge>
                    {key.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeKey(key.id)}
                        aria-label={`Revoke ${key.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
