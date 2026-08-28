import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminQuickLinksProps {
  sections: Array<{
    href: string;
    label: string;
    description: string;
    icon: LucideIcon;
  }>;
}

export function AdminQuickLinks({ sections }: AdminQuickLinksProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sections
        .filter((s) => s.href !== "/admin/dashboard")
        .map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex gap-3 rounded-lg border border-border bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground group-hover:text-primary">{label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
    </div>
  );
}

interface AdminAttentionBannerProps {
  items: Array<{ label: string; count: number; href: string; severity: "info" | "warning" | "danger" }>;
}

export function AdminAttentionBanner({ items }: AdminAttentionBannerProps) {
  const visible = items.filter((item) => item.count > 0);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <CircleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        Needs attention
      </div>
      <ul className="space-y-1 text-sm">
        {visible.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-primary hover:underline">
              {item.count} {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface AdminGuidePanelProps {
  email: string;
  appUrl: string;
  supportEmail: string;
  migrations: Array<{ id: string; label: string; ok: boolean }>;
  envChecks: Array<{ key: string; label: string; required: boolean; configured: boolean }>;
  tasks: ReadonlyArray<{ title: string; detail: string }>;
}

export function AdminGuidePanel({
  email,
  appUrl,
  supportEmail,
  migrations,
  envChecks,
  tasks,
}: AdminGuidePanelProps) {
  const pendingMigrations = migrations.filter((m) => !m.ok);
  const missingRequiredEnv = envChecks.filter((e) => e.required && !e.configured);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Your access</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Signed in as</dt>
            <dd className="text-right font-medium text-foreground">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-right font-medium text-foreground">Platform admin</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">App URL</dt>
            <dd className="text-right font-mono text-xs text-foreground">{appUrl}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Support inbox</dt>
            <dd className="text-right text-foreground">
              <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
                {supportEmail}
              </a>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Platform admins can view all tenants, promote other admins, manage regulations and
          abbreviations, triage errors and feedback, and monitor AI usage. Shipment actions in admin
          are read-only — users manage shipments in the main app.
        </p>
      </section>

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Common tasks</h2>
        <ul className="space-y-3 text-sm">
          {tasks.map((task) => (
            <li key={task.title}>
              <p className="font-medium text-foreground">{task.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{task.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Migration health</h2>
        {pendingMigrations.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Critical migrations appear applied
          </p>
        ) : (
          <p className="mb-3 flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {pendingMigrations.length} migration(s) may be missing — run npm run check-migrations
          </p>
        )}
        <ul className="space-y-1.5 text-sm">
          {migrations.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {m.id} — {m.label}
              </span>
              {m.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Environment</h2>
        {missingRequiredEnv.length > 0 ? (
          <p className="mb-3 text-sm text-destructive">
            {missingRequiredEnv.length} required variable(s) not configured in this environment.
          </p>
        ) : (
          <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">
            Required variables are set (values are never shown here).
          </p>
        )}
        <ul className="space-y-1.5 text-sm">
          {envChecks.map((env) => (
            <li key={env.key} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {env.label}
                {env.required ? "" : " (optional)"}
              </span>
              {env.configured ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle
                  className={cn(
                    "h-4 w-4",
                    env.required ? "text-destructive" : "text-muted-foreground"
                  )}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border p-4 lg:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Compliance reminder</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Passport outputs are assistive trade-compliance tools, not legal or customs advice.
          Platform changes to regulations and abbreviations affect customer compliance checks — review
          carefully before activating. User feedback may contain PII; handle according to your privacy
          policy. Rotate service role keys and admin passwords if they were shared during setup.
        </p>
      </section>
    </div>
  );
}

interface AdminRecentActivityProps {
  errors: Array<{
    id: string;
    severity: string;
    error_message: string;
    created_at: string;
    route: string | null;
  }>;
  feedback: Array<{
    id: string;
    type: string;
    message: string;
    created_at: string;
    users: { email: string } | null;
  }>;
}

export function AdminRecentActivity({ errors, feedback }: AdminRecentActivityProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent errors</h2>
          <Link href="/admin/errors" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors logged recently.</p>
        ) : (
          <ul className="space-y-2">
            {errors.map((err) => (
              <li
                key={err.id}
                className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="mr-2 font-medium uppercase text-destructive">{err.severity}</span>
                <span className="text-foreground">{err.error_message}</span>
                {err.route ? (
                  <span className="mt-1 block text-xs text-muted-foreground">{err.route}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Open feedback</h2>
          <Link href="/admin/feedback" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open feedback items.</p>
        ) : (
          <ul className="space-y-2">
            {feedback.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                <p className="font-medium text-primary">{item.type}</p>
                <p className="line-clamp-2 text-foreground">{item.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.users?.email ?? "Unknown user"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
