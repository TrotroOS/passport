# Passport

Trade compliance and shipment intelligence platform for importers, customs brokers, and freight forwarders.

Passport helps importers, customs brokers, and freight forwarders upload trade documents, run cross-document verification, score shipment readiness, assess regulatory and risk exposure, track containers, and collaborate on shipments — all in a multi-tenant SaaS with a public REST API.

## Documentation

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Product requirements, users, features |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full technical architecture |
| [ARCHITECTURE.md §10](./ARCHITECTURE.md#10-system-design-principles) | System design principles (latency, webhooks, DB, concurrency) |
| [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md) | Quick reference for AI agents |
| [CLAUDE.md](./CLAUDE.md) | Primary coding agent instructions |
| [AGENTS.md](./AGENTS.md) | Entry point for all AI agents |
| [docs/SCAFFOLDING.md](./docs/SCAFFOLDING.md) | Folder structure & extension points |
| [docs/RUNBOOK.md](./docs/RUNBOOK.md) | Platform admin operator runbook |
| [docs/USER-HELP.md](./docs/USER-HELP.md) | End-user troubleshooting guide |
| [docs/MARKETING-PLAN.md](./docs/MARKETING-PLAN.md) | Go-to-market strategy, ICPs, channels, and 90-day calendar |

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (PostgreSQL, Auth, Storage)
- **next-intl** — English, French, Portuguese, Arabic (RTL)
- **React Hook Form** + **Zod**
- **Recharts** (analytics)
- **OpenAI** (document extraction; provider interface supports extension)

## Features

### Core platform

- Multi-tenant SaaS with organizations and row-level security (RLS)
- Email/password authentication with automatic org creation on signup
- Shipment management — create, list, detail, parties, products, documents
- Document upload to Supabase Storage with async AI extraction pipeline
- Audit logging for mutating actions

### Document AI (Brain / Arbiter / Sentry)

| Layer | Module | Role |
|---|---|---|
| **Brain** | `src/lib/ai/` | Multimodal LLM classification + extraction |
| **Arbiter** | `src/lib/arbiter/` | Confidence thresholds, required fields, normalization |
| **Sentry** | `src/lib/sentry/` | Retries, error handling, AI provider logging |

Upload triggers auto-processing. Review extractions at `/shipments/[id]/documents/[docId]`.

### Verification & Passport Score

- Cross-document verification engine with deterministic checks
- Passport Score (overall, documentation, consistency, counterparty, regulatory)
- Discrepancy tracking (open / resolved / ignored)
- Printable compliance report

### Regulatory & risk

- Ghana import regulatory checks with pass/fail status
- Deterministic risk assessment from verification and classification signals
- Workflow tasks generated from verification and regulatory results

### HS code intelligence

- HS code suggestion and verification per product line
- Conflict and missing-code detection

### Collaboration

- Invite customs brokers and forwarders to shipments
- Role-based access (viewer / commenter / editor)
- Shared comments, readiness confirmation (owner + broker), collaborator management

### Freight tracking

- Container and bill-of-lading tracking (mock provider for dev; pluggable external provider)
- Event timeline, manual refresh, webhook ingestion
- Tracking notifications (email / WhatsApp templates)

### Analytics

- Organization-wide KPIs — shipments, import value, avg score, open discrepancies, pending tasks
- Compliance trend, risk distribution, supplier performance, corridor insights, document completeness

### Internationalization (i18n)

- Locales: **en**, **fr**, **pt**, **ar**
- Language switcher in app header; preference stored in cookie (`NEXT_LOCALE`) and `users.preferred_language`
- Arabic RTL layout with Cairo font
- Localized UI across auth, dashboard, shipment detail, analytics, tracking, collaboration, and status labels

Sync missing translation keys after editing `messages/en.json`:

```bash
node scripts/sync_locale_keys.mjs
```

### Public API (v1)

API key authentication with scoped access. Interactive docs at `/settings/api-docs`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/shipments` | List shipments |
| `POST` | `/api/v1/shipments` | Create shipment |
| `GET` | `/api/v1/shipments/[id]` | Get shipment |
| `PATCH` | `/api/v1/shipments/[id]` | Update shipment |
| `GET/POST` | `/api/v1/shipments/[id]/documents` | List / upload documents |
| `POST` | `/api/v1/shipments/[id]/verify` | Run verification |
| `GET` | `/api/v1/shipments/[id]/verification-checks` | Verification results |
| `GET` | `/api/v1/shipments/[id]/regulatory-checks` | Regulatory results |
| `GET` | `/api/v1/shipments/[id]/risk` | Risk assessment |
| `GET/POST` | `/api/v1/shipments/[id]/containers` | Container tracking |
| `GET` | `/api/v1/shipments/[id]/tracking-events` | Tracking timeline |
| `POST` | `/api/v1/shipments/[id]/tracking/refresh` | Refresh tracking |
| `GET` | `/api/v1/shipments/[id]/graph` | Shipment knowledge graph |
| `GET` | `/api/v1/graph/entities` | Cross-shipment entities |

Webhooks fire on events such as `shipment.created`, `shipment.updated`, `document.processed`, and `verification.completed`.

### Admin & inbound channels

- Platform admin panel at `/admin/dashboard` (cross-org monitoring, regulations, feedback, AI usage)
- Inbound document channels (email / WhatsApp) — optional, see env vars

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project (or Supabase CLI for local dev)

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (server-only) |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (server-only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | OpenAI API key for document extraction |
| `AI_PROVIDER` | `openai` \| `anthropic` \| `gemini` (default: `openai`) |
| `AI_MODEL` | Model name (default: `gpt-4o-2024-08-06`) |
| `TRACKING_PROVIDER` | `mock` (demo) or `terminal49` for live container tracking — see [docs/TRACKING.md](./docs/TRACKING.md) |
| `TRACKING_API_KEY` | Terminal49 API token when using `terminal49` |
| `TRACKING_DEFAULT_SCAC` | Default carrier SCAC (e.g. `MAEU`) when carrier name is unknown |
| `CRON_SECRET` | Bearer token for `/api/cron/tracking-refresh` (Vercel cron, every 6h) |
| `TRACKING_WEBHOOK_SECRET` | Required in production for tracking webhooks |
| `UPSTASH_REDIS_REST_URL` | Redis for rate limiting (required in production) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis token (required in production) |
| `FIRST_USER_IS_ADMIN` | Promote first signup to platform admin (**dev only**) |
| `AUTO_CONFIRM_EMAIL` | Skip email confirmation (**dev only**) |

See `.env.example` for inbound email/WhatsApp and tracking provider variables.

### 3. Run database migrations

**Option A — Supabase CLI (linked project)**

```bash
supabase link --project-ref your-project-ref
supabase db push
```

**Option B — Apply script (direct Postgres URI)**

Set `SUPABASE_DB_URL` in `.env.local`, then:

```bash
npm run apply-migrations
```

**Option C — Supabase Dashboard**

Run migrations in order (`20240820000001` through `20240820000019`) in the SQL Editor, or apply bundled scripts:

- `supabase/APPLY_MIGRATION_016.sql` — freight tracking
- `supabase/APPLY_MIGRATION_017.sql` — user language preference
- `node scripts/rebuild_apply_all_pending.mjs` → `APPLY_ALL_PENDING.sql`

Migration highlights:

| # | Feature |
|---|---|
| 001–005 | Core schema, RLS, storage, document extraction |
| 006–007 | Verification, Passport Score, regulatory, workflow |
| 008 | Risk, API keys, webhooks |
| 009 | Platform admin, feedback |
| 011 | Inbound channels |
| 012–014 | Incoterms, collaboration, HS codes |
| 015 | Analytics indexes |
| 016 | Freight tracking |
| 017 | User language preference (`preferred_language`) |
| 018 | Compliance enhancements (party screening, notification preferences) |
| 019 | Data governance (trusted sources, provenance, trust snapshots) |
| 020 | Additional corridors (Nigeria, Kenya regulations) |
| 021 | Organization billing (Stripe-ready subscription tiers) |

### 4. Platform admin setup

After migration `009`:

```bash
# Option A — env flag on first signup
FIRST_USER_IS_ADMIN=true

# Option B — promote by email
npm run make-admin -- user@example.com
```

Access `/admin/dashboard` as a platform admin.

### 5. Configure Supabase Auth

In **Authentication → Providers → Email**:

- Enable email provider
- For development, disable **Confirm email** (or set `AUTO_CONFIRM_EMAIL=true`)
- Set **Site URL** to `http://localhost:3000` and add it to redirect URLs

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Dev server tips:**

- Run only one `npm run dev` instance (port 3000)
- Do not run `npm run build` while the dev server is running
- If you see webpack `MODULE_NOT_FOUND` errors, stop the server, delete `.next`, and restart:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

## Usage Flow

1. **Sign up** at `/signup` — creates user, organization, and owner membership
2. **Dashboard** at `/dashboard` — list shipments; switch language via header
3. **Create shipment** at `/shipments/new`
4. **Shipment detail** at `/shipments/[id]` — parties, products, documents, verification, tracking, collaboration
5. **Analytics** at `/analytics` — org-wide compliance and risk insights
6. **Settings** at `/settings` — profile, API keys, webhooks, phone

## Session API Routes (selected)

| Method | Route | Description |
|---|---|---|
| `GET/PATCH` | `/api/user/profile` | User profile |
| `GET/PATCH` | `/api/user/preferences` | User preferences (including language) |
| `GET` | `/api/shipments/[id]/documents` | List shipment documents |
| `POST` | `/api/shipments/[id]/verify` | Run verification |
| `POST` | `/api/shipments/[id]/regulatory-checks` | Run regulatory checks |
| `POST` | `/api/shipments/[id]/tracking/refresh` | Refresh freight tracking |

See `/settings/api-docs` for the full public v1 API reference.

## File Upload

- Bucket: `passport-documents`
- Path: `{organization_id}/{shipment_id}/{document_id}`
- Allowed: PDF, PNG, JPG, DOCX, XLSX, CSV
- Max size: 20 MB

## Security

- RLS enabled on all tenant tables
- Users access only their organization's data
- Service role key used server-side only (signup, admin scripts)
- Middleware enforces auth on all routes except `/login` and `/signup`
- Public API uses scoped API keys; tracking webhooks require `TRACKING_WEBHOOK_SECRET` in production
- Security headers (CSP, HSTS, X-Frame-Options) applied via `next.config.mjs`
- Rate limiting via Redis (Upstash) in production — auth, uploads, API, and inbound channels
- Production startup validates env via `src/instrumentation.ts` (blocks dev-only flags)
- Error boundaries at `src/app/error.tsx` and `src/app/global-error.tsx`

## Production deployment

### Public launch checklist

Use this before opening signup to the public or running a paid pilot.

#### Database

- [ ] `npm run check-migrations` reports all migrations applied (`001`–`023`)
- [ ] Pending migrations applied via `npm run apply-migrations` (needs `SUPABASE_DB_URL`) or Supabase SQL Editor
- [ ] Critical pending items on fresh prod: **020** (corridors), **021** (Stripe billing columns), **022** (external invites), **023** (admin flag guard)

#### Environment (Vercel / host dashboard)

- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` matches your live domain (invites, emails, redirects)
- [ ] `OPENAI_API_KEY`
- [ ] **Upstash Redis** — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (required for rate limiting)
- [ ] **Never set in production:** `AUTO_CONFIRM_EMAIL`, `FIRST_USER_IS_ADMIN`, `INBOUND_ALLOW_UNVERIFIED`
- [ ] Recommended: `SENDGRID_API_KEY`, `SENTRY_DSN`, `TRACKING_WEBHOOK_SECRET`
- [ ] Optional: `STRIPE_SECRET_KEY` + price IDs, `OPENSANCTIONS_ENABLED=true`

Validate before deploy:

```bash
NODE_ENV=production npm run validate-env
```

#### Deploy pipeline

- [ ] GitHub → Vercel auto-deploy works (push to `master` updates production within minutes)
- [ ] Node **22** on CI and host (see `.node-version` and `package.json` engines)
- [ ] GitHub Actions CI green (`.github/workflows/ci.yml`)
- [ ] Vercel build env includes all production variables (`vercel.json` uses `SKIP_ENV_VALIDATION=true` only for build; runtime still validates via `instrumentation.ts`)

#### Smoke test after deploy

```bash
# Local dev server
npm run dev
npm run smoke-test

# Production (read-only GET checks)
SMOKE_TEST_URL=https://your-app.vercel.app npm run smoke-test
```

Smoke test verifies homepage, `/api/health` (DB up), auth pages, legal pages, and auth redirects.

#### Manual QA (recommended once per release)

- [ ] Signup → confirm email (Supabase Auth, not auto-confirm)
- [ ] Create shipment → upload document → run verification → print compliance report
- [ ] Invite external collaborator (requires migration **022** + SendGrid)
- [ ] Owner/broker readiness confirmation appears in UI and print report

#### Legal & ops

- [ ] `/legal/*` pages reviewed (Terms, Privacy, Compliance disclaimer, AUP, DPA)
- [ ] Support contact configured (`NEXT_PUBLIC_SUPPORT_EMAIL`)
- [ ] Platform admin runbook: [docs/RUNBOOK.md](./docs/RUNBOOK.md)

### Pre-flight (quick reference)

1. Apply all migrations (`001`–`023`) — see [Run database migrations](#3-run-database-migrations)
2. Set production env vars (see `.env.example`) — **never** enable dev-only flags listed above
3. Configure [Upstash Redis](https://upstash.com) for rate limiting
4. Set `NEXT_PUBLIC_APP_URL` to your public URL
5. Configure SendGrid for email (strongly recommended for invites)
6. Configure Stripe for billing at `/settings/billing` (optional until paid launch)
7. Set `SENTRY_DSN` for error monitoring (recommended)

### SendGrid (collaboration invites)

External broker invites send email via SendGrid. Without it, Passport still creates invitations and returns a **copy link** fallback.

1. Create a [SendGrid](https://sendgrid.com) API key with **Mail Send** permission
2. Verify a sender domain or single sender in SendGrid
3. Set in Vercel **Production**:
   - `SENDGRID_API_KEY`
   - `INBOUND_EMAIL_FROM=Passport <noreply@yourdomain.com>` (must match verified sender)
   - `NEXT_PUBLIC_APP_URL=https://your-production-url`
4. Redeploy, then test:

```bash
npm run test:sendgrid -- you@example.com
```

Invite flow: shipment **Share** → email sent → recipient opens `/invitations/{id}` → signup/login → accept.

### Vercel production variables (copy into dashboard)

Set these under **Vercel → Project → Settings → Environment Variables → Production**, then **Redeploy**:

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://passport-one-kappa.vercel.app` (or custom domain) |
| `OPENAI_API_KEY` | Yes | Document extraction |
| `UPSTASH_REDIS_REST_URL` | Yes | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Rate limiting |
| `SENDGRID_API_KEY` | Recommended | Collaboration invite emails |
| `INBOUND_EMAIL_FROM` | With SendGrid | `Passport <mensahstephen385@gmail.com>` (verified sender) |
| `SENTRY_DSN` | Recommended | Error monitoring |

**Never set in Production:** `AUTO_CONFIRM_EMAIL`, `FIRST_USER_IS_ADMIN`, `INBOUND_ALLOW_UNVERIFIED`

After deploy, verify:

```bash
VERIFY_PRODUCTION_URL=https://passport-one-kappa.vercel.app npm run verify-production
```

Local production builds without full env can skip validation:

```bash
SKIP_ENV_VALIDATION=true npm run build
```

### Vercel / Node hosting

```bash
npm run build
npm run start
```

Set all env vars in your host dashboard. `prebuild` runs `validate-env` automatically when `NODE_ENV=production`.

### Docker

```bash
docker compose up --build
```

Requires `.env.local` with all production variables. Build args `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` are passed at image build time.

### CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs lint, unit tests, and production build on push/PR.

## Scripts

```bash
npm run dev                 # Start development server
npm run build               # Production build
npm run start               # Start production server
npm run lint                # ESLint
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests (needs running app + API key)
npm run test                # Run all tests
npm run make-admin -- user@example.com
npm run validate-env         # Validate production environment
npm run apply-migrations    # Apply pending SQL migrations
npm run check-migrations    # Check migration status
npm run audit-env            # Report which env vars are set (no secret values)
npm run verify-production    # Launch readiness check against deployed URL
node scripts/sync_locale_keys.mjs  # Sync i18n keys fr/pt/ar from en
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
├── components/
│   ├── auth/               # Login/signup forms
│   ├── analytics/          # Analytics dashboard
│   ├── layout/             # App header, language switcher
│   ├── shipments/          # Shipment UI (verification, tracking, collaboration)
│   └── ui/                 # shadcn/ui primitives
├── i18n/                   # next-intl config (locales, routing, request)
├── lib/
│   ├── ai/                 # Brain: AI provider abstraction
│   ├── analytics/          # Analytics queries and date ranges
│   ├── api/                # Public API helpers
│   ├── arbiter/            # Arbiter: deterministic validation
│   ├── sentry/             # Sentry: external call wrapper
│   ├── tracking/           # Freight tracking providers
│   ├── user/               # User profile services
│   └── supabase/           # Supabase clients
├── messages/               # i18n JSON (en, fr, pt, ar)
└── types/                  # TypeScript types
supabase/
└── migrations/             # SQL migrations (001–023)
mobile/                     # React Native companion app
```

## Mobile app

A React Native companion app lives in `mobile/`. Install and start:

```bash
npm run mobile:install
npm run mobile
```

Mobile auth endpoints return `{ session, user }` including `preferred_language`.

## License

Private — all rights reserved.
