# Project Scaffolding

Folder structure, extension points, and placeholder conventions for Passport.

> The codebase is already implemented. Use this map when adding features — do not recreate existing structure.

---

## Root layout

```
passport/
├── PRD.md                      # Product requirements
├── ARCHITECTURE.md             # Full architecture
├── ARCHITECTURE-ESSENTIALS.md  # Agent quick reference
├── CLAUDE.md                   # Primary AI agent instructions
├── AGENTS.md                   # Points to CLAUDE.md
├── README.md                   # Setup & operations
├── package.json
├── next.config.mjs
├── tsconfig.json
├── messages/                   # i18n JSON (en, fr, pt, ar)
├── public/                     # Static assets
├── scripts/                    # Ops & test scripts
├── supabase/
│   ├── migrations/             # Sequential SQL (001–022+)
│   └── config.toml
├── tests/
│   └── unit/                   # Unit tests
├── mobile/                     # Expo companion app
└── src/
    ├── app/                    # Next.js routes
    ├── components/             # React UI
    ├── i18n/                   # next-intl config
    ├── lib/                    # Domain logic
    └── types/database.ts       # TS domain model
```

---

## `src/app/` — routes

| Path | Type | Purpose |
|------|------|---------|
| `page.tsx` | Page | Redirect / landing |
| `login/`, `signup/` | Page | Auth |
| `dashboard/` | Page | Shipment list |
| `shipments/[id]/` | Page | Shipment detail hub |
| `shipments/[id]/documents/[docId]/` | Page | Extraction review |
| `shipments/new/` | Page | Create shipment |
| `analytics/` | Page | KPI dashboard |
| `analytics/governance/` | Page | Data trust |
| `compliance/calendar/` | Page | Compliance calendar |
| `compliance-alerts/` | Page | Alerts feed |
| `readiness/` | Page | Clearance readiness |
| `invitations/[id]/` | Page | Accept/decline invite |
| `legal/`, `legal/[slug]/` | Page | Legal docs (SSG) |
| `settings/*` | Page | Profile, API keys, webhooks, billing |
| `admin/*` | Page | Platform admin |
| `api/**/route.ts` | API | REST handlers |

**Adding a page:** create `src/app/{route}/page.tsx`, components in `src/components/{domain}/`.

**Adding an API:** create `src/app/api/{path}/route.ts`, logic in `src/lib/`.

---

## `src/lib/` — domain modules

```
lib/
├── actions/           # Server Actions (auth, CRUD)
├── ai/                # Brain: LLM providers, prompts, extraction
├── arbiter/           # Validation thresholds, normalization
├── sentry/            # AI retry/logging (not Sentry.io)
├── pipeline/          # process-document orchestration
├── verification/      # Checks, score, discrepancies
├── regulatory/        # Rule engine, jurisdictions
├── risk/              # Risk assessment
├── hs-code/           # HS suggestion/verification
├── collaboration/     # Invites, external store, delivery
├── shipments/         # Access control, search, errors
├── tracking/          # Containers, events, providers/
├── analytics/         # KPI queries, alerts
├── compliance/        # Screening, calendar, checklist
├── governance/        # Provenance, trust, lineage
├── graph/             # Trade knowledge graph
├── api/               # API key auth, v1 service
├── webhooks/          # Outbound events
├── inbound/           # Email/WhatsApp ingestion
├── billing/           # Plans, tier limits
├── notifications/     # Email templates, preferences
├── admin/             # Platform admin helpers
├── audit/             # Audit labels
├── export/            # Audit export
├── auth/              # Org resolution, mobile auth
├── supabase/          # Client factories, middleware
├── validations/       # Zod schemas
├── legal/             # Legal document content
├── i18n/              # Locale helpers
├── rate-limit/        # Upstash rate limiting
├── monitoring/        # Error reporting
└── utils.ts           # Shared utilities
```

**Adding a domain:** create `src/lib/{name}/`, export from index if multiple files, wire from API route or server action.

---

## `src/components/` — UI

```
components/
├── ui/                # shadcn primitives (Button, Card, …)
├── layout/            # Header, nav, search, shortcuts
├── auth/              # Login, signup forms
├── shipments/         # Shipment panels, dialogs, upload
├── analytics/         # Charts, KPI cards
├── compliance/        # Calendar, alerts
├── governance/        # Trust panels
├── settings/          # API keys, webhooks, billing
├── admin/             # Admin tables/forms
├── legal/             # Legal doc viewer
├── audit/             # Audit event list
├── activity/          # Activity feed
├── readiness/         # Readiness dashboard
├── feedback/          # Feedback widget
├── brand/             # Logo
└── providers/         # Theme, app context
```

---

## Database scaffolding

### New table checklist

1. Create `supabase/migrations/20240820000NNN_{name}.sql`
2. `CREATE TABLE` with `organization_id` FK where tenant-scoped
3. `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
4. Add `SELECT/INSERT/UPDATE/DELETE` policies
5. Add indexes for foreign keys and query patterns
6. Update `src/types/database.ts`
7. Update `scripts/check_migrations.mjs` migration list if new numbered migration
8. Run `npm run apply-migrations`

### Migration naming

```
20240820000023_{snake_case_description}.sql
```

---

## Placeholder / extension files

When scaffolding a **new feature** before implementation, create:

| File | Purpose |
|------|---------|
| `src/lib/{domain}/{feature}.ts` | Core logic (start with exported types + stub) |
| `src/app/api/{path}/route.ts` | API entry (401 + TODO if not ready) |
| `src/components/{domain}/{feature}-panel.tsx` | UI (optional) |
| `supabase/migrations/…sql` | Schema if needed |
| `tests/unit/{feature}.test.ts` | Tests when behavior defined |

**Do not** create empty placeholder files across the whole tree — only for the feature being built.

---

## Scripts reference

| Script | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Full test suite | `npm run test` |
| Unit tests | `npm run test:unit` |
| Check migrations | `npm run check-migrations` |
| Apply migrations | `npm run apply-migrations` |
| Sync i18n keys | `node scripts/sync_locale_keys.mjs` |
| Smoke test | `npm run smoke-test` |

---

## Mobile (`mobile/`)

Separate Expo app — shares backend via Supabase + `/api/auth/mobile/*`.

```
mobile/
├── app/               # Expo Router screens
├── components/
├── contexts/
├── lib/
└── types/
```

---

## CI

`.github/workflows/ci.yml` — runs lint, unit tests, production build on push.

---

## Related docs

- [CLAUDE.md](../CLAUDE.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [PRD.md](../PRD.md)
