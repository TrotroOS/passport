# Passport platform admin runbook

Operator procedures for the Passport trade compliance SaaS. The live version is also available in the admin UI at `/admin/runbook` (platform admin access required).

## Overview

- **Admin UI:** `/admin` — requires `is_platform_admin = true` on your user profile (migration 009)
- **Scope:** Cross-tenant monitoring, reference data, user promotion, error triage
- **Read-only:** Admin shipment views do not mutate tenant data
- **Disclaimer:** Passport outputs are assistive, not legal or customs advice

## Daily checks (5–10 min)

1. Open `/admin/dashboard` — review **Needs attention** banner
2. `/admin/errors` — filter last 24h; investigate new recurring errors
3. `/admin/feedback` — acknowledge or close open items
4. `/admin/ai-usage` — confirm cost and error rate
5. `/admin/inbound` — check failed messages
6. `GET /api/health` — database should report `up`

## Access & bootstrap

### Create first platform admin

```bash
npm run bootstrap-admin -- <email> <password> "Full Name"
```

Requires migrations 001–009. Sign in at `/login`, then open `/admin/dashboard`. Rotate passwords if shared during setup.

### Promote existing user

- **UI:** Admin → Users → **Promote**
- **CLI:** `npm run make-admin -- <email>`

User must sign out/in for the header **Admin** link to appear. Do not demote yourself if you are the only admin.

## Incident response

### Application errors

1. Admin → Errors — filter by severity and organization
2. Read stack trace, route, and user email
3. Reproduce locally; check recent deploys or migrations
4. RLS failures: verify `organization_id` on inserts and migration 010

### Document processing stuck

Processing is async (`after()` queue). Returns **202 Accepted** from `POST /api/documents/[id]/process`.

1. Check `processing_status` and `processing_error` on the document
2. Verify `OPENAI_API_KEY`
3. Poll `GET /api/documents/[id]` until terminal status
4. Review `/admin/ai-usage` for provider errors

### Inbound channel failures

1. Admin → Inbound — rows with **Error** badge
2. Read `error_message`
3. Verify webhooks: `/api/inbound/email`, `/api/inbound/whatsapp`
4. Confirm sender is linked to org channel config

### Localhost 500 after build

Running `npm run build` while `npm run dev` is active can corrupt `.next`.

```bash
# Stop dev processes, then:
Remove-Item -Recurse -Force .next   # Windows
rm -rf .next                       # macOS/Linux
npm run dev
```

## Database & migrations

```bash
npm run check-migrations    # verify applied migrations
npm run apply-migrations    # apply pending (needs SUPABASE_DB_URL)
```

| Migration | Purpose |
|-----------|---------|
| 009 | `is_platform_admin`, feedback table |
| 010 | RLS policy fix |
| 020 | NG/KE regulatory corridors |
| 021 | Stripe billing columns |
| 022 | External collaborator invites |

New migrations: add file under `supabase/migrations/`, include RLS for new tables, run tests and build.

## Environment

**Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `OPENAI_API_KEY`

**Optional:** `SUPABASE_DB_URL`, `STRIPE_*`, `SENDGRID_API_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL`, Redis/Upstash (production rate limiting)

**Pre-deploy:**

```bash
npm run lint && npm run build && npm run test:unit
NODE_ENV=production npm run validate-env
npm run check-migrations
```

Never set `INBOUND_ALLOW_UNVERIFIED=true` in production.

## Reference data

- **Regulations** (`/admin/regulations`) — drive compliance checks; test on pilot shipment after changes
- **Abbreviations** (`/admin/document-abbreviations`) — map trade doc shorthand to canonical types for AI classification

## Feedback & support

Default support email: `trotroosapp@gmail.com` (override with `NEXT_PUBLIC_SUPPORT_EMAIL`).

1. Admin → Feedback
2. Update status: open → acknowledged → closed
3. Add admin notes; reply via support email when users expect a response

## Security

- Never commit `.env.local` or service role keys
- Service role key is server-only
- Error logs and feedback may contain PII
- Rotate credentials if exposed in chat or support tickets

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (stop dev first) |
| `npm run check-migrations` | Verify DB schema |
| `npm run apply-migrations` | Apply pending SQL |
| `npm run bootstrap-admin -- …` | Create admin account |
| `npm run make-admin -- <email>` | Promote user |
| `npm run smoke-test` | Production smoke checks |
| `curl http://localhost:3000/api/health` | Health check |

## Escalation

- **Customer support:** trotroosapp@gmail.com
- **Schema emergencies:** Supabase SQL editor + verify migrations before manual fixes
- Document production interventions in admin notes or internal changelog
