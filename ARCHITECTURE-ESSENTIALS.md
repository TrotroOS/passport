# Architecture Essentials

> Lightweight reference for AI coding agents. Full details: [ARCHITECTURE.md](./ARCHITECTURE.md). Product context: [PRD.md](./PRD.md).

---

## Stack (do not deviate without discussion)

| Layer | Choice |
|-------|--------|
| App | Next.js 15 App Router, TypeScript, React 18 |
| UI | Tailwind + shadcn/ui, Recharts |
| Backend | Supabase (Postgres + Auth + Storage) |
| i18n | next-intl 4 (`messages/*.json`, locales: en/fr/pt/ar) |
| AI | OpenAI via `src/lib/ai/` (Brain → Arbiter → Sentry pipeline) |
| Validation | Zod + React Hook Form |

---

## System design (backend & infra)

When changing APIs, database access, webhooks, or async processing, follow [ARCHITECTURE.md §10](./ARCHITECTURE.md#10-system-design-principles):

- **Latency / throughput / bandwidth** — batch I/O, paginate responses, Storage for files
- **DB** — RLS + indexes first; replication for read scale; sharding only at single-node limits
- **Concurrency** — async for I/O (default); workers/queues for heavy CPU or long AI jobs
- **Webhooks over polling** — outbound `src/lib/webhooks/`; inbound tracking/email paths
- **Stateless routes** — no in-memory tenant state; auth + rate limits at the edge

---

## Tenancy & auth (critical)

```
Organization → Users → Shipments → (Parties, Products, Documents, …)
```

- **RLS** enforces `organization_id = get_user_organization_id()` on tenant tables
- **Collaborators** get shipment-scoped access via `shipment_collaborators` (roles: viewer / commenter / editor)
- **External invites:** `invitee_email` on collaborators (migration 022); fallback store in `audit_events` if column missing
- **Platform admin:** `users.is_platform_admin` — use `requirePlatformAdmin()` for `/admin` and `/api/admin`
- **API v1:** Bearer `pk_live_*` keys, scoped, rate-limited — never use session cookies on v1 routes
- **Next 15:** `await cookies()`, `await params` in routes/pages

---

## Domain modules (`src/lib/`)

| Module | Path | Purpose |
|--------|------|---------|
| AI pipeline | `ai/`, `arbiter/`, `sentry/`, `pipeline/` | Extract, validate, retry; async via `queue-document-processing.ts` |
| Verification | `verification/` | Checks, Passport Score, discrepancies |
| Regulatory | `regulatory/` | Jurisdiction rules, pass/fail |
| Risk | `risk/` | Risk assessment engine |
| HS codes | `hs-code/` | Suggest, verify, select |
| Collaboration | `collaboration/` | Invites, external store, delivery |
| Shipment access | `shipments/shipment-access.ts` | Permission matrix |
| Tracking | `tracking/` | Containers, events, providers |
| Analytics | `analytics/` | KPIs, alerts, trends |
| API | `api/` | Key auth, scopes, shipment service |
| Webhooks | `webhooks/` | Outbound events + signing |
| Compliance | `compliance/` | Screening, calendar, checklist |
| Governance | `governance/` | Provenance, trust score |
| Billing | `billing/plans.ts` | Tier limits |

---

## Key flows

1. **Upload doc** → Storage → `scheduleDocumentProcessing()` (async via `after()`) → `process-document.ts` → AI extract → Arbiter → save `document_extractions` → `document.processed` webhook
2. **Verify** → `verification-engine.ts` → checks + score + discrepancies
3. **Regulatory** → `regulatory-engine.ts` → `regulatory_checks` + workflow tasks
4. **Invite collaborator** → `shipment_collaborators` or `external-invite-store` → `invite-delivery.ts` → email/link

---

## Database

- Migrations: `supabase/migrations/20240820000001` … `022` (apply in order)
- Apply: `npm run apply-migrations` (needs `SUPABASE_DB_URL`)
- Types: `src/types/database.ts` (source of truth for TS interfaces)
- Storage bucket: `passport-documents` at `{org_id}/{shipment_id}/{doc_id}`

---

## API conventions

- App routes: `src/app/api/**/route.ts`
- Public v1: `src/app/api/v1/**` — use `authenticateApiKey()`
- Return `NextResponse.json()` with appropriate status codes
- Write audit events on mutating actions via `writeAuditEvent()`
- Check shipment access via `assertShipmentAccess()` / `shipment-access.ts`

---

## Env vars (minimum dev)

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_DB_URL          # migrations only
OPENAI_API_KEY           # AI features
SENDGRID_API_KEY         # optional — invites skip email if missing
```

---

## Testing & quality

```bash
npm run lint
npm run test          # lint + build + unit + migration check
npm run test:unit
npm run check-migrations
```

---

## Rules for agents

1. **Minimal diffs** — match existing patterns in surrounding files
2. **RLS first** — new tables need policies + migration
3. **No legal advice in UI** — outputs are assistive; link `/legal/compliance-disclaimer`
4. **i18n** — add keys to `messages/en.json`, run `node scripts/sync_locale_keys.mjs`
5. **Secrets** — never commit `.env.local`, API keys, or DB passwords
6. **Collaboration** — test owner vs collaborator vs external invite paths
