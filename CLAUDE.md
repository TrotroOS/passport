# CLAUDE.md — Passport coding agent instructions

Primary instruction file for AI coding agents working in this repository.

---

## Project identity

**Passport** is a multi-tenant trade compliance SaaS (Next.js 15 + Supabase). Read [PRD.md](./PRD.md) for product scope and [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md) before making changes.

---

## How to work in this repo

### Before coding

1. Read `ARCHITECTURE-ESSENTIALS.md` for stack and conventions
2. For backend/API/infra work, read [ARCHITECTURE.md §10 — System design principles](./ARCHITECTURE.md#10-system-design-principles) (latency, webhooks, stateless routes, DB strategy)
3. Check `src/types/database.ts` for domain types
4. Search for existing patterns before adding new abstractions
5. If touching DB schema → add migration in `supabase/migrations/` (next number), update types

### Code style

- **TypeScript strict** — fix type errors; use `await cookies()` and `await params` (Next 15)
- **Minimal diffs** — do not refactor unrelated code
- **Match conventions** — naming, imports, error handling like surrounding files
- **Server vs client** — `"use client"` only when needed; prefer Server Components
- **No secrets in code** — use env vars; never commit `.env.local`

### Domain rules

- Passport outputs are **assistive**, not legal/customs advice
- All mutating actions should call `writeAuditEvent()` where applicable
- Shipment access must go through `shipment-access.ts` / `assertShipmentAccess()`
- New tables **require RLS policies** in the same migration
- i18n: add English keys first, run `node scripts/sync_locale_keys.mjs`
- **Backend design:** prefer webhooks over polling; keep route handlers stateless; paginate API payloads; async I/O in routes, background jobs for long-running AI/CPU work (see ARCHITECTURE.md §10)

### File placement

| What | Where |
|------|-------|
| Page | `src/app/{route}/page.tsx` |
| API route | `src/app/api/{path}/route.ts` |
| Business logic | `src/lib/{domain}/` |
| UI component | `src/components/{domain}/` |
| Zod schemas | `src/lib/validations/` |
| SQL migration | `supabase/migrations/20240820000NNN_{name}.sql` |
| Unit tests | `tests/unit/` or `scripts/test_unit.mts` patterns |

### Testing

Run before claiming done:

```bash
npm run lint
npm run build
npm run test:unit
npm run check-migrations   # if DB env configured
```

### Git

- Do **not** commit unless explicitly asked
- Do **not** force-push to main
- Do **not** commit `.env.local`, credentials, or service role keys

### Common pitfalls

| Pitfall | Correct approach |
|---------|------------------|
| `cookies()` without await | `const store = await cookies()` |
| Dynamic Supabase `.select(stringVar)` | Use const select string or type guard |
| External invite without migration 022 | Code falls back to `audit_events` — prefer applying migration |
| Missing SendGrid key | Invites return `invitation_url` for manual copy |
| RLS errors on insert | Check `organization_id`, use admin client only server-side when appropriate |

### Supabase operations

- Apply migrations: `npm run apply-migrations` (needs `SUPABASE_DB_URL`)
- Check status: `npm run check-migrations`
- Single migration: `npm run apply-migration-022`

### API route template

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... domain logic, access checks, audit
  return NextResponse.json({ data });
}
```

---

## Priority areas (current state)

| Area | Status | Notes |
|------|--------|-------|
| Core shipments + AI | Stable | Brain/Arbiter/Sentry pipeline |
| Collaboration + external invites | Stable | Migration 022 should be applied |
| Next 15 upgrade | Done | Async cookies/params |
| Billing (Stripe) | Foundation | Needs Stripe env vars |
| Migrations 020–022 | May be pending | Run `check-migrations` |
| npm audit | 0 vulnerabilities | On Next 15 + next-intl 4 |

---

## When unsure

1. Grep the codebase for similar features
2. Read the relevant `src/lib/{module}/` files
3. Check migration that introduced the table
4. Ask the user only for product/legal/business decisions you cannot infer

---

## Related files

- [AGENTS.md](./AGENTS.md) — alias entry point for other agents
- [ARCHITECTURE.md](./ARCHITECTURE.md) — full technical architecture
- [docs/SCAFFOLDING.md](./docs/SCAFFOLDING.md) — folder structure map
