# AGENTS.md

This project uses **[CLAUDE.md](./CLAUDE.md)** as the primary instruction file for AI coding agents.

All agents (Cursor, Claude Code, Copilot, etc.) should follow **CLAUDE.md** when working in this repository.

## Quick links

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | **Start here** — agent rules, conventions, pitfalls |
| [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md) | Stack, modules, auth, env vars (1-page) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system architecture and data model |
| [ARCHITECTURE.md §10](./ARCHITECTURE.md#10-system-design-principles) | Backend design: latency, webhooks, DB, concurrency |
| [PRD.md](./PRD.md) | Product requirements and user journeys |
| [docs/SCAFFOLDING.md](./docs/SCAFFOLDING.md) | Folder structure and extension points |
| [docs/MARKETING-PLAN.md](./docs/MARKETING-PLAN.md) | Go-to-market strategy, ICPs, and 90-day calendar |
| [README.md](./README.md) | Setup, scripts, deployment |

## Agent checklist (every task)

- [ ] Read CLAUDE.md + ARCHITECTURE-ESSENTIALS.md
- [ ] For backend/API changes, follow [ARCHITECTURE.md §10](./ARCHITECTURE.md#10-system-design-principles)
- [ ] Match existing code patterns; minimal scope
- [ ] Run `npm run lint` and `npm run build` if code changed
- [ ] Add migration + RLS if schema changes
- [ ] Sync i18n keys if UI strings added
- [ ] Do not commit secrets or `.env.local`
