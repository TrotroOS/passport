# Passport — System Architecture

**Version:** 1.0  
**Last updated:** 2026-08-28

Quick reference: [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md)

---

## 1. System context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Clients                                        │
│  Web (Next.js)  │  Mobile (Expo)  │  API integrators  │  Webhooks in   │
└────────┬────────┴────────┬────────┴─────────┬─────────┴────────┬───────┘
         │                 │                  │                  │
         ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 Application                                │
│  App Router pages │ Server Actions │ API Routes (106) │ Middleware      │
└────────┬────────────────────────┬───────────────────┬───────────────────┘
         │                        │                   │
         ▼                        ▼                   ▼
┌─────────────────┐    ┌──────────────────┐   ┌─────────────────────────┐
│ Supabase        │    │ External services │   │ Background / async       │
│ • PostgreSQL    │    │ • OpenAI (AI)     │   │ • Document processing    │
│ • Auth          │    │ • SendGrid (email)│   │ • Webhook delivery       │
│ • Storage       │    │ • Twilio (WA)     │   │ • Tracking refresh       │
│ • RLS           │    │ • Stripe (billing)│   │                          │
└─────────────────┘    │ • Upstash (limit) │   └─────────────────────────┘
                         │ • Sentry (errors) │
                         │ • OpenSanctions   │
                         └──────────────────┘
```

---

## 2. Technology stack

### Frontend

| Component | Technology | Notes |
|-----------|------------|-------|
| Framework | Next.js 15.5 (App Router) | Server Components + Client Components |
| Language | TypeScript 5 | Strict mode |
| Styling | Tailwind CSS 3.4 | `src/app/globals.css` |
| Components | shadcn/ui (Radix) | `src/components/ui/` |
| Forms | React Hook Form + Zod | Schemas in `src/lib/validations/` |
| Charts | Recharts | Analytics pages |
| i18n | next-intl 4 | `messages/{en,fr,pt,ar}.json`, RTL for Arabic |

### Backend (within Next.js)

| Component | Technology | Notes |
|-----------|------------|-------|
| Database | Supabase PostgreSQL | 22 migrations, RLS on tenant data |
| Auth | Supabase Auth | Email/password; SSR via `@supabase/ssr` |
| File storage | Supabase Storage | Bucket `passport-documents` |
| Server logic | Route handlers + Server Actions | No separate API server |
| Rate limiting | Upstash Redis | `src/lib/rate-limit/` |

### AI pipeline (internal naming)

| Layer | Module | Responsibility |
|-------|--------|----------------|
| **Brain** | `src/lib/ai/` | LLM classification + multimodal extraction |
| **Arbiter** | `src/lib/arbiter/` | Confidence thresholds, required fields, normalization |
| **Sentry** | `src/lib/sentry/` | Retries, provider logging, error handling |

Orchestrated by `src/lib/pipeline/process-document.ts`.

### Mobile

| Component | Technology |
|-----------|------------|
| Framework | Expo SDK 54, Expo Router |
| Location | `mobile/` (separate package) |
| Auth | `/api/auth/mobile/login|signup` |

### DevOps

| Component | Technology |
|-----------|------------|
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Container | `docker-compose.yml` |
| Migrations | SQL files + `scripts/apply_migrations.mjs` |

---

## 3. Application layers

```
src/
├── app/                    # Routes (pages + API)
│   ├── (auth)/             # login, signup
│   ├── dashboard/          # shipment list
│   ├── shipments/          # detail, documents, new
│   ├── analytics/          # KPIs, governance, network
│   ├── settings/           # profile, api-keys, webhooks, billing
│   ├── admin/              # platform admin (gated)
│   ├── legal/              # policy pages (SSG)
│   ├── invitations/        # public invite accept flow
│   └── api/                # REST endpoints
├── components/             # React UI by domain
├── lib/                    # Business logic (domain modules)
├── i18n/                   # next-intl config
└── types/database.ts       # Domain TypeScript types
```

**Rule:** Pages/components call `lib/` modules. API routes validate auth, delegate to `lib/`, return JSON. Avoid business logic in components.

---

## 4. Authentication & authorization

### 4.1 Web session auth

```
Browser → middleware.ts → updateSession (Supabase SSR)
         → protected routes redirect to /login
         → public: /, /login, /signup, /legal/*, /invitations/*, /api/*
```

- Server client: `createClient()` from `src/lib/supabase/server.ts` (uses `await cookies()`)
- Admin client: `createAdminClient()` — **server-only**, service role key

### 4.2 Row-level security (PostgreSQL)

Helper functions (defined in migrations):

- `get_user_organization_id()` — current user's org
- `is_org_admin()` — owner or admin role
- `is_shipment_owner(shipment_id)` — org owns shipment
- `invitation_email_matches_auth_user(email)` — external invitee match

Policies typically:

```sql
USING (organization_id = get_user_organization_id())
```

Collaborator policies join `shipment_collaborators` for cross-org shipment access.

### 4.3 Application-level shipment permissions

`src/lib/shipments/shipment-access.ts`:

| Role | View | Comment | Upload | Verify | Invite | Confirm broker |
|------|------|---------|--------|--------|--------|----------------|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | owner confirm |
| Editor | ✓ | ✓ | ✓ | ✓ | — | broker confirm |
| Commenter | ✓ | ✓ | — | — | — | — |
| Viewer | ✓ | — | — | — | — | — |

### 4.4 API key auth (v1)

- Keys stored hashed in `api_keys` table
- Prefix `pk_live_` for identification
- Scopes: `read:shipment`, `write:shipment`, `read:document`, `write:document`, `read:analysis`, `write:verify`
- Auth: `src/lib/api/api-key-auth.ts`

### 4.5 Platform admin

- Flag: `users.is_platform_admin`
- Gate: `src/lib/admin/require-platform-admin.ts`
- Middleware blocks `/admin/*` for non-admins

---

## 5. Data model

### 5.1 Entity relationship (core)

```
organizations
    └── users (1 org per user at signup)
    └── api_keys, webhook_subscriptions
    └── shipments
            ├── parties
            ├── products
            ├── documents → document_extractions
            ├── verification_checks, discrepancies, passport_scores
            ├── regulatory_checks, workflow_tasks
            ├── risk_assessments
            ├── shipment_collaborators, shipment_comments
            ├── container_details, shipment_tracking_events
            ├── party_screenings
            └── audit_events (also org-level)
```

### 5.2 Core tables

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant; billing fields (tier, Stripe IDs) |
| `users` | Profile linked to `auth.users`; role, locale, notification prefs |
| `shipments` | Core entity; status workflow; readiness flags |
| `parties` | Trade parties per shipment |
| `products` | Line items; HS code fields |
| `documents` | Uploaded files; processing status |
| `document_extractions` | AI extraction results (versioned) |
| `verification_checks` | Individual check results |
| `discrepancies` | Cross-doc mismatches |
| `passport_scores` | Composite readiness scores |
| `regulatory_checks` | Rule evaluation results |
| `workflow_tasks` | Action items from engines |
| `shipment_collaborators` | Cross-org access; external invites |
| `audit_events` | Immutable activity log |

Full TypeScript definitions: `src/types/database.ts`.

### 5.3 Storage layout

```
passport-documents/
  {organization_id}/
    {shipment_id}/
      {document_id}/{filename}
```

### 5.4 Migrations

Sequential files in `supabase/migrations/`:

| Range | Domain |
|-------|--------|
| 001–002 | Core schema + RLS |
| 003–005 | Storage + document AI |
| 006–007 | Verification + regulatory |
| 008–009 | Risk, API keys, webhooks, admin |
| 011–012 | Inbound + trade abbreviations |
| 013–014 | Collaboration + HS codes |
| 015–017 | Analytics indexes, tracking, i18n |
| 018–019 | Screening, governance |
| 020–022 | NG/KE corridors, billing, external invites |

---

## 6. Key subsystems

### 6.1 Document processing pipeline

```
Upload (API/UI)
  → Supabase Storage + documents row (status: pending)
  → HTTP 201/202 returned immediately
  → scheduleDocumentProcessing() via Next.js after()
  → process-document.ts (background)
      → status: processing
      → AI classify + extract (Brain)
      → Arbiter validate/normalize
      → Sentry retry on failure
  → document_extractions saved
  → documents.status = processed | needs_review | failed
  → webhook: document.processed (success or failure)
  → optional auto-verification run

Integrators: subscribe to document.processed webhooks; poll GET /api/documents/:id if needed.
Manual reprocess: POST /api/documents/:id/process → 202 Accepted (async queue).
```

### 6.2 Verification engine

`src/lib/verification/verification-engine.ts`:

- Loads shipment documents + extractions
- Runs deterministic checks (`checks.ts`, `matching.ts`)
- Computes Passport Score (`passport-score.ts`)
- Upserts `verification_checks`, `discrepancies`, `passport_scores`

### 6.3 Regulatory engine

`src/lib/regulatory/regulatory-engine.ts`:

- Matches shipment destination to `jurisdictions`
- Matches products to `product_categories`
- Evaluates `regulations` rules (document required, registration, permit)
- Writes `regulatory_checks`; triggers workflow tasks

**Seeded corridors:** Ghana (007), Nigeria + Kenya (020).

### 6.4 Collaboration & external invites

Two paths:

1. **DB column path** (migration 022 applied): `shipment_collaborators.invitee_email`
2. **Fallback path**: `external-invite-store.ts` stores invites in `audit_events` when column missing

Flow: invite → email/link via `invite-delivery.ts` → accept at `/invitations/[id]` → link on login/signup via `link-pending-invitations.ts`.

### 6.5 Webhooks (outbound)

- Subscriptions in `webhook_subscriptions`
- Events catalog: `src/lib/webhooks/event-catalog.ts`
- Signed payloads: `src/lib/webhooks/signing.ts`
- Delivery log: `webhook_deliveries`

### 6.6 Inbound channels

- Email/WhatsApp webhooks → `src/lib/inbound/process-inbound.ts`
- Matches shipment references → attaches documents
- Requires `INBOUND_EMAIL_SECRET` / Twilio config

---

## 7. API surface

### 7.1 Route organization

| Prefix | Auth | Purpose |
|--------|------|---------|
| `/api/shipments/*` | Session | Core shipment operations |
| `/api/v1/*` | API key | Public integrator API |
| `/api/admin/*` | Session + platform admin | Operator tools |
| `/api/analytics/*` | Session | Dashboard data |
| `/api/billing/*` | Session / Stripe webhook | Subscriptions |
| `/api/inbound/*` | Webhook secrets | Document ingestion |
| `/api/health` | None | Health check |

### 7.2 Middleware

`src/middleware.ts`:

- Refreshes Supabase session
- Redirects unauthenticated users from protected pages
- Allows public routes and all `/api/*` (routes handle own auth)

---

## 8. Internationalization

- Config: `src/i18n/config.ts` — locales `en`, `fr`, `pt`, `ar`
- Request locale: `src/i18n/request.ts` — cookie `NEXT_LOCALE` + user preference
- Messages: `messages/*.json` — sync with `scripts/sync_locale_keys.mjs`
- RTL: Arabic layout in root layout; Cairo font

---

## 9. Security architecture

| Control | Implementation |
|---------|----------------|
| Tenant isolation | PostgreSQL RLS |
| Transport | HTTPS (production) |
| API keys | Hashed at rest; scoped; rate limited |
| Webhook verification | HMAC secrets |
| CSP | Next.js headers in config |
| Audit trail | `audit_events` on mutations |
| Legal disclaimers | AI/regulatory outputs are assistive only |
| Secrets | `.env.local`; validated in production via `instrumentation.ts` |

---

## 10. System design principles

Backend, API, and infrastructure changes in Passport should follow these definitions and constraints.

### 10.1 Performance & network

| Concept | Definition | Passport application |
|---------|------------|----------------------|
| **Latency** | Time for a single request–response round trip | Keep route handlers thin; batch Supabase queries; use `Promise.all` for independent I/O. Document AI processing is the main latency hotspot — prefer async completion + webhooks over blocking the upload response. |
| **Throughput** | Requests processed per unit of time | API v1 uses scoped keys + Upstash rate limiting (`src/lib/rate-limit/`). Paginate list endpoints; avoid unbounded `.select("*")` on large tables. |
| **Bandwidth** | Maximum payload over the network | Store documents in Supabase Storage; return presigned URLs or metadata in API responses. Cap page sizes and avoid embedding large blobs in JSON. |

### 10.2 Database strategy

| Pattern | When to use | Passport today |
|---------|-------------|----------------|
| **Replication** | Scale read-heavy workloads; improve availability | Supabase manages Postgres HA. Treat the app as write-primary; for heavy analytics, prefer aggregated queries, materialized views, or read-replica routing when load grows. |
| **Sharding** | Single-node storage or write throughput limits | **Not required yet.** Tenancy is logical via `organization_id` + RLS. Prefer indexes, query design, and archival before horizontal partition. |

### 10.3 Execution & concurrency

| Pattern | Use for | Passport today |
|---------|---------|----------------|
| **Concurrency** (async I/O) | DB, Storage, HTTP calls to OpenAI/SendGrid/Stripe | Default in route handlers and `src/lib/*` — non-blocking `await` chains. |
| **Parallelism** (workers / threads) | CPU-bound computation at scale | Verification and regulatory engines run inline in Node today. If CPU time becomes a bottleneck, move work to a background job or worker queue rather than blocking requests. |
| **Processes vs. threads** | Isolation and shared state | Next.js route handlers are stateless processes. Do not rely on in-memory caches for tenant data across requests; use Postgres, Redis (rate limits), or Storage. |

### 10.4 Communication patterns

- **Webhooks over polling** — Default to event-driven delivery for integrators and internal side effects.
  - Outbound: `src/lib/webhooks/` (`document.processed`, `verification.completed`, etc.)
  - Inbound: tracking and email/WhatsApp webhooks under `/api/inbound/*`, `/api/tracking/webhook`
  - Manual tracking refresh is a **fallback**, not the primary integration model.
- Avoid client-side polling loops when a webhook or server-push path exists.

### 10.5 Infrastructure

| Component | Principle | Passport mapping |
|-----------|-----------|------------------|
| **Load balancing** | Services stay stateless so traffic distributes across instances | Next.js on Vercel scales horizontally; session in Supabase Auth cookies; no server-local tenant state. |
| **API gateway** | Central auth, rate limiting, routing before internal services | Middleware + per-route auth (`authenticateApiKey()`, `requirePlatformAdmin()`) + Upstash limits. A dedicated gateway is optional until traffic or compliance requires it. |
| **Microservices** | Isolated domains, independently deployable | **Modular monolith** — domain boundaries under `src/lib/{domain}/`. Extract a service only when deployment, scaling, or team boundaries require it. |

### 10.6 Decision checklist (agents)

Before adding backend or infra code, ask:

1. Can this be **async** with a webhook/job instead of blocking the request?
2. Does this add **unnecessary round trips** to Postgres or external APIs?
3. Is the response **paginated and bounded** in size?
4. Is tenant data accessed only through **RLS-safe** paths and `assertShipmentAccess()`?
5. Would a **polling** client be needed — and if so, can a webhook replace it?

---

## 11. Deployment topology

**Recommended production:**

```
Users → Vercel (Next.js) → Supabase Cloud (DB/Auth/Storage)
                        → OpenAI API
                        → SendGrid / Twilio / Stripe / Upstash / Sentry
```

**Local development:**

```bash
npm run dev          # http://localhost:3000
npm run apply-migrations   # requires SUPABASE_DB_URL
```

---

## 12. Extension points

When adding features, use these locations:

| Feature type | Where to add |
|--------------|--------------|
| New DB table | `supabase/migrations/`, `src/types/database.ts`, RLS policies |
| New API endpoint | `src/app/api/.../route.ts`, validation in `src/lib/validations/` |
| New verification check | `src/lib/verification/checks.ts` |
| New regulatory rule type | `src/lib/regulatory/regulatory-engine.ts` + seed migration |
| New AI provider | `src/lib/ai/providers/` |
| New tracking provider | `src/lib/tracking/providers/` |
| New webhook event | `src/lib/webhooks/event-catalog.ts` |
| New UI panel | `src/components/{domain}/`, page in `src/app/` |
| New locale string | `messages/en.json` + sync script |

See [docs/SCAFFOLDING.md](./docs/SCAFFOLDING.md) for full folder map.

---

## 13. Related documents

- [PRD.md](./PRD.md) — product requirements
- [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md) — agent quick reference
- [CLAUDE.md](./CLAUDE.md) / [AGENTS.md](./AGENTS.md) — coding agent instructions
- [README.md](./README.md) — setup and runbook
