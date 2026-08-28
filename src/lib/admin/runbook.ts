export interface RunbookStep {
  label: string;
  detail?: string;
}

export interface RunbookProcedure {
  id: string;
  title: string;
  summary: string;
  when: string;
  steps: RunbookStep[];
  links?: Array<{ label: string; href: string }>;
}

export interface RunbookSection {
  id: string;
  title: string;
  intro?: string;
  bullets?: string[];
  procedures?: RunbookProcedure[];
}

export const ADMIN_RUNBOOK_SECTIONS: RunbookSection[] = [
  {
    id: "overview",
    title: "Overview",
    intro:
      "This runbook is for Passport platform administrators. You operate a multi-tenant trade compliance SaaS — monitor health, triage failures, manage reference data, and grant admin access. Passport outputs are assistive; never present them as legal or customs advice.",
    bullets: [
      "Admin UI: /admin (requires is_platform_admin on your user profile)",
      "All admin shipment views are read-only — tenants manage data in the main app",
      "Mutating admin actions (regulations, abbreviations, user promotion) should be deliberate and auditable",
      "Check the dashboard daily for open feedback, recent errors, and AI spend",
    ],
  },
  {
    id: "daily-checks",
    title: "Daily checks",
    bullets: [
      "Dashboard → review Needs attention banner",
      "Errors → filter last 24h; investigate new recurring stack traces",
      "Feedback → close or acknowledge open items; add admin notes",
      "Model usage → confirm cost and error rate are within expectations",
      "Inbound → verify failed messages; retry or fix channel config",
    ],
    procedures: [
      {
        id: "morning-pass",
        title: "Morning platform pass (5–10 min)",
        summary: "Quick health sweep before customers start work.",
        when: "Every business day, or before a pilot demo.",
        steps: [
          { label: "Open /admin/dashboard and note attention counts" },
          { label: "Scan /admin/errors for new severity=error entries" },
          { label: "Scan /admin/feedback for unread open tickets" },
          { label: "Check /admin/ai-usage for overnight cost spikes" },
          { label: "Confirm /api/health returns status healthy" },
        ],
        links: [
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Health API", href: "/api/health" },
        ],
      },
    ],
  },
  {
    id: "access",
    title: "Access & bootstrap",
    procedures: [
      {
        id: "bootstrap-admin",
        title: "Create the first platform admin",
        summary: "Use when no admin exists or signup is rate-limited.",
        when: "Initial setup or locked out of admin UI.",
        steps: [
          { label: "Ensure migrations 001–009 are applied (see Migrations section)" },
          {
            label: "Run: npm run bootstrap-admin -- <email> <password> \"Full Name\"",
            detail: "Creates auth user, org, and profile with is_platform_admin=true",
          },
          { label: "Sign in at /login, then open /admin/dashboard" },
          { label: "Rotate the password if it was shared in chat or docs" },
        ],
      },
      {
        id: "promote-admin",
        title: "Promote an existing user to platform admin",
        summary: "Grant admin without creating a new account.",
        when: "A trusted team member needs operator access.",
        steps: [
          { label: "UI: Admin → Users → Promote on the target row" },
          { label: "CLI alternative: npm run make-admin -- <email>" },
          { label: "User must sign out and back in for header Admin link to appear" },
          { label: "Never demote yourself if you are the only admin" },
        ],
        links: [{ label: "Users", href: "/admin/users" }],
      },
    ],
  },
  {
    id: "incidents",
    title: "Incident response",
    procedures: [
      {
        id: "app-errors",
        title: "Application errors (500s, API failures)",
        summary: "Triage from error logs before guessing at code.",
        when: "Dashboard shows errors in last 24h or users report failures.",
        steps: [
          { label: "Admin → Errors; filter by severity and organization" },
          { label: "Expand stack trace; note route, method, and user email" },
          { label: "Reproduce on localhost if possible" },
          { label: "Check recent deploys or migration changes" },
          { label: "If RLS-related: verify org_id on insert and migration 010 RLS fix" },
          { label: "Document resolution in feedback/admin notes if user-reported" },
        ],
        links: [{ label: "Error logs", href: "/admin/errors" }],
      },
      {
        id: "document-processing",
        title: "Document processing stuck or failed",
        summary: "Uploads queue async processing via after().",
        when: "Documents stay pending/processing or show processing_error.",
        steps: [
          { label: "Open shipment in admin read-only view or tenant shipment page" },
          { label: "Check document processing_status and processing_error in DB or UI" },
          { label: "Verify OPENAI_API_KEY is set and not rate-limited" },
          { label: "Retry: POST /api/documents/[id]/process (returns 202 Accepted)" },
          { label: "Poll GET /api/documents/[id] until terminal status" },
          { label: "Check ai_provider_logs via Model usage for provider errors" },
        ],
        links: [
          { label: "Shipments", href: "/admin/shipments" },
          { label: "Model usage", href: "/admin/ai-usage" },
        ],
      },
      {
        id: "inbound-failure",
        title: "Inbound email/WhatsApp failure",
        summary: "Inbound messages log to inbound_messages with error_message.",
        when: "Dashboard shows failed inbound count or channel test fails.",
        steps: [
          { label: "Admin → Inbound; find rows with Error badge" },
          { label: "Read error_message on the row" },
          { label: "Verify webhook endpoints: /api/inbound/email, /api/inbound/whatsapp" },
          { label: "Confirm sender is linked to an organization channel config" },
          { label: "Re-send test payload after fixing config" },
        ],
        links: [{ label: "Inbound", href: "/admin/inbound" }],
      },
      {
        id: "dev-server-500",
        title: "Localhost 500 after build",
        summary: "Corrupted .next cache when build runs alongside dev.",
        when: "npm run dev returns ENOENT routes-manifest.json or random 500s.",
        steps: [
          { label: "Stop all node/next processes on ports 3000/3001" },
          { label: "Delete .next folder" },
          { label: "Run npm run dev (not build + dev simultaneously)" },
          { label: "Verify /login returns 200 and /api/health is healthy" },
        ],
      },
    ],
  },
  {
    id: "migrations",
    title: "Database & migrations",
    bullets: [
      "Schema changes live in supabase/migrations/ — never edit applied migrations in place",
      "Every new table needs RLS policies in the same migration",
      "Migration 009 adds is_platform_admin (required for admin UI)",
      "Migrations 020–022 add corridors, Stripe billing, external invites",
    ],
    procedures: [
      {
        id: "check-migrations",
        title: "Verify migration status",
        summary: "Confirm remote DB matches codebase.",
        when: "After setup, before deploy, or when features 404/RLS fail.",
        steps: [
          { label: "Set SUPABASE_DB_URL in .env.local (Database URI from Supabase dashboard)" },
          { label: "Run: npm run check-migrations" },
          { label: "If pending: npm run apply-migrations" },
          { label: "Or paste pending SQL files in Supabase SQL Editor" },
          { label: "Re-run check-migrations until all OK" },
        ],
      },
      {
        id: "add-migration",
        title: "Add a new migration",
        summary: "Standard schema change workflow.",
        when: "Adding tables, columns, or RLS for a feature.",
        steps: [
          { label: "Create supabase/migrations/20240820000NNN_name.sql" },
          { label: "Include RLS enable + policies for new tables" },
          { label: "Update src/types/database.ts if types are maintained manually" },
          { label: "Apply locally or remote via apply-migrations" },
          { label: "Run npm run test:unit and npm run build" },
        ],
      },
    ],
  },
  {
    id: "environment",
    title: "Environment & deploy",
    bullets: [
      "Secrets never go in git — use .env.local locally, host env in production",
      "Required: Supabase URL/keys, NEXT_PUBLIC_APP_URL, OPENAI_API_KEY",
      "Optional: STRIPE_*, SENDGRID_*, UPSTASH_REDIS_* (rate limiting in prod)",
      "NEXT_PUBLIC_SUPPORT_EMAIL overrides default support address in UI",
    ],
    procedures: [
      {
        id: "pre-deploy",
        title: "Pre-deploy checklist",
        summary: "Before shipping to production.",
        when: "Any production release.",
        steps: [
          { label: "npm run lint && npm run build && npm run test:unit" },
          { label: "NODE_ENV=production npm run validate-env (strict env check)" },
          { label: "npm run check-migrations against production DB" },
          { label: "Confirm INBOUND_ALLOW_UNVERIFIED is not true in production" },
          { label: "npm run smoke-test against staging/production URL if configured" },
        ],
      },
    ],
  },
  {
    id: "content",
    title: "Reference data (regulations & abbreviations)",
    procedures: [
      {
        id: "add-regulation",
        title: "Add or update a regulation",
        summary: "Rules drive compliance checks on shipments.",
        when: "New corridor, product category, or authority requirement.",
        steps: [
          { label: "Admin → Regulations → Add regulation" },
          { label: "Set jurisdiction, rule type, and required document if applicable" },
          { label: "Set effective date; leave inactive until reviewed" },
          { label: "Test on a pilot shipment via Run regulatory in tenant UI" },
        ],
        links: [{ label: "Regulations", href: "/admin/regulations" }],
      },
      {
        id: "add-abbreviation",
        title: "Add document abbreviation",
        summary: "Maps trade doc shorthand to canonical types for Brain classification.",
        when: "Users upload docs labeled CI, PL, B/L, etc.",
        steps: [
          { label: "Admin → Abbreviations → Add abbreviation" },
          { label: "Use uppercase abbreviation and matching canonical document type" },
          { label: "Deactivate instead of delete if legacy rows reference the mapping" },
        ],
        links: [{ label: "Abbreviations", href: "/admin/document-abbreviations" }],
      },
    ],
  },
  {
    id: "support",
    title: "Feedback & customer support",
    procedures: [
      {
        id: "handle-feedback",
        title: "Handle user feedback",
        summary: "Product feedback stored in feedback table.",
        when: "Open feedback count > 0 on dashboard.",
        steps: [
          { label: "Admin → Feedback → read message and user/org context" },
          { label: "Update status: open → acknowledged → closed" },
          { label: "Add admin notes with internal follow-up or resolution" },
          { label: "Reply via support email if user expects a response" },
        ],
        links: [{ label: "Feedback", href: "/admin/feedback" }],
      },
    ],
  },
  {
    id: "security",
    title: "Security & compliance",
    bullets: [
      "Service role key is server-only — never expose to client or commit to git",
      "Platform admin bypasses tenant RLS via admin client — use sparingly in code",
      "Rotate credentials if shared in support channels or chat logs",
      "User feedback and error logs may contain PII — handle per privacy policy",
      "Qualified counsel should review legal copy before production reliance",
    ],
  },
  {
    id: "commands",
    title: "Useful commands",
    bullets: [
      "npm run dev — local development server",
      "npm run build — production build (stop dev first to avoid .next corruption)",
      "npm run check-migrations — verify DB schema",
      "npm run apply-migrations — apply pending SQL migrations",
      "npm run bootstrap-admin -- <email> <password> \"Name\" — create admin user",
      "npm run make-admin -- <email> — promote existing user",
      "npm run smoke-test — production smoke checks",
      "npm run test:unit — unit tests",
    ],
  },
];

export const ADMIN_RUNBOOK_COMMANDS = [
  { cmd: "npm run dev", purpose: "Start local dev server (http://localhost:3000)" },
  { cmd: "npm run check-migrations", purpose: "Verify which migrations are applied" },
  { cmd: "npm run apply-migrations", purpose: "Apply pending migrations (needs SUPABASE_DB_URL)" },
  { cmd: "npm run bootstrap-admin -- <email> <pw> \"Name\"", purpose: "Create platform admin account" },
  { cmd: "npm run make-admin -- <email>", purpose: "Promote existing user to platform admin" },
  { cmd: "curl http://localhost:3000/api/health", purpose: "Quick health + DB latency check" },
] as const;
