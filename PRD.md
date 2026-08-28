# Passport — Product Requirements Document

**Version:** 1.0  
**Last updated:** 2026-08-28  
**Status:** Active development (pilot / production-ready core)

---

## 1. Product vision

Passport is an **AI-powered trade compliance and shipment intelligence platform**. It helps importers, customs brokers, and freight forwarders upload trade documents, verify consistency across documents, assess regulatory readiness, score shipment risk, track containers, and collaborate on clearance workflows — before filing with customs authorities.

Passport is **decision-support software**, not a licensed customs broker or government agency. It does not guarantee clearance.

---

## 2. Problem statement

Trade compliance teams struggle with:

- **Fragmented documents** — invoices, packing lists, bills of lading, certificates scattered across email and drives
- **Manual cross-checking** — values, parties, quantities, and HS codes must match across documents
- **Regulatory complexity** — corridor-specific rules (Ghana, Nigeria, Kenya, etc.) change frequently
- **Coordination friction** — importers, brokers, and forwarders share data via email without audit trails
- **Late discovery** — discrepancies and missing documents found only at customs, causing delays and penalties

---

## 3. Target users

| Persona | Role | Primary goals |
|---------|------|---------------|
| **Importer / compliance manager** | Organization owner or member | Upload docs, run verification, track readiness, manage shipments |
| **Customs broker** | External collaborator (viewer / commenter / editor) | Review shipment docs, confirm readiness, resolve discrepancies |
| **Freight forwarder** | External collaborator | Track containers, update logistics context |
| **Platform admin** | Passport operator | Monitor tenants, regulations, AI usage, inbound channels |
| **API integrator** | Back-office IT | Sync shipments and documents from ERP/WMS via REST API |

**Geographic focus (initial):** West and East Africa import corridors — Ghana (primary), Nigeria, Kenya.

---

## 4. Product goals

### Must have (MVP — implemented)

1. Multi-tenant SaaS with organizations and secure data isolation
2. Shipment lifecycle management (create → documents → verify → ready)
3. Document upload with AI-assisted classification and field extraction
4. Cross-document verification and Passport Score
5. Regulatory checks for supported corridors
6. HS code suggestion and verification per product line
7. Shipment collaboration with role-based access
8. External collaborator invites (email, including non-Passport users)
9. Audit logging for mutating actions
10. Public REST API (v1) with scoped API keys
11. Analytics dashboard and compliance alerts
12. Freight container tracking (pluggable providers)
13. Internationalization (English, French, Portuguese, Arabic with RTL)
14. Legal policies (Terms, Privacy, AUP, DPA, compliance disclaimer)
15. Platform admin panel

### Should have (partial / in progress)

- Stripe billing (schema + checkout foundation)
- Email invite delivery (SendGrid — requires API key)
- Party sanctions screening (watchlist + OpenSanctions optional)
- Inbound document channels (email / WhatsApp)
- Mobile companion app (Expo)
- Data governance / provenance / trust score

### Could have (future)

- Additional regulatory corridors and live rule feeds
- E-customs / single-window integrations
- White-label broker portals
- Advanced workflow automation and SLA tracking
- Offline document capture (mobile)

---

## 5. Core user journeys

### 5.1 Importer: new shipment to readiness

1. Sign up → organization created automatically
2. Create shipment with reference and corridor (origin/destination)
3. Add parties and product line items
4. Upload trade documents (PDF/images)
5. AI extracts fields → user reviews extractions
6. Run verification → view discrepancies and Passport Score
7. Run regulatory checks → resolve workflow tasks
8. Confirm owner readiness; invite broker to confirm broker readiness
9. Export compliance report / audit trail

### 5.2 Broker: collaborate on shared shipment

1. Receive invite email or link (`/invitations/[id]`)
2. Sign up or log in → invitation linked to account
3. Access shipment with assigned role (viewer / commenter / editor)
4. Review documents, comment, resolve discrepancies (if editor)
5. Confirm broker readiness when satisfied

### 5.3 Integrator: API-driven workflow

1. Create API key with scopes in Settings
2. `POST /api/v1/shipments` → upload documents → `POST verify`
3. Poll verification and regulatory results
4. Subscribe webhooks for `verification.completed`, `document.processed`

---

## 6. Functional requirements

### 6.1 Authentication & tenancy

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Email/password signup and login via Supabase Auth | P0 |
| AUTH-02 | One organization per user at signup; user is owner | P0 |
| AUTH-03 | Session-based web auth; middleware protects app routes | P0 |
| AUTH-04 | Optional auto-confirm email in development | P1 |
| AUTH-05 | Mobile login/signup API returning session payload | P1 |
| AUTH-06 | Platform admin flag for cross-tenant admin panel | P1 |

### 6.2 Shipments & documents

| ID | Requirement | Priority |
|----|-------------|----------|
| SHIP-01 | CRUD shipments with reference, countries, incoterm, status | P0 |
| SHIP-02 | Parties (seller, buyer, broker, etc.) and products per shipment | P0 |
| SHIP-03 | Document upload to Supabase Storage with type classification | P0 |
| SHIP-04 | Async AI extraction pipeline with human review UI | P0 |
| SHIP-05 | Duplicate shipment reference detection per organization | P1 |
| SHIP-06 | Full-text / reference search across shipments | P1 |

### 6.3 Verification & scoring

| ID | Requirement | Priority |
|----|-------------|----------|
| VER-01 | Deterministic cross-document checks (amounts, parties, quantities) | P0 |
| VER-02 | Passport Score (overall + dimensions) | P0 |
| VER-03 | Discrepancy tracking (open / resolved / ignored) | P0 |
| VER-04 | Printable compliance report | P1 |

### 6.4 Regulatory & risk

| ID | Requirement | Priority |
|----|-------------|----------|
| REG-01 | Jurisdiction-based regulatory rule checks | P0 |
| REG-02 | Seeded rules for GH, NG, KE corridors | P1 |
| REG-03 | Workflow tasks generated from verification/regulatory results | P1 |
| RISK-01 | Deterministic risk assessment from signals | P1 |

### 6.5 HS code intelligence

| ID | Requirement | Priority |
|----|-------------|----------|
| HS-01 | AI-assisted HS code suggestions per product | P1 |
| HS-02 | Format validation and conflict detection | P1 |
| HS-03 | User selection and verification of HS code | P1 |

### 6.6 Collaboration

| ID | Requirement | Priority |
|----|-------------|----------|
| COL-01 | Invite collaborators by email with role assignment | P0 |
| COL-02 | Invite users not yet on Passport (external invite flow) | P0 |
| COL-03 | Comments on shipments | P1 |
| COL-04 | Owner + broker readiness confirmation | P1 |
| COL-05 | Resend invitation; copy invite link when email not configured | P1 |

### 6.7 Tracking & notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| TRK-01 | Container and B/L tracking with event timeline | P1 |
| TRK-02 | Manual refresh and webhook ingestion | P1 |
| NOT-01 | Transactional email templates (invites, tracking) | P1 |
| NOT-02 | User notification preferences | P1 |

### 6.8 Analytics & compliance ops

| ID | Requirement | Priority |
|----|-------------|----------|
| ANA-01 | Organization KPIs (shipments, score, discrepancies, tasks) | P1 |
| ANA-02 | Compliance trend, risk distribution, supplier performance | P1 |
| ANA-03 | Compliance calendar (tasks, tracking, screening follow-ups) | P2 |
| ANA-04 | Compliance alerts feed | P2 |

### 6.9 API & integrations

| ID | Requirement | Priority |
|----|-------------|----------|
| API-01 | REST API v1 with Bearer API key auth | P0 |
| API-02 | Scoped permissions per key | P0 |
| API-03 | Outbound webhooks with signing | P1 |
| API-04 | Rate limiting per API key | P1 |
| INB-01 | Inbound email/WhatsApp document ingestion | P2 |

### 6.10 Admin & billing

| ID | Requirement | Priority |
|----|-------------|----------|
| ADM-01 | Cross-org admin dashboard (users, orgs, shipments) | P1 |
| ADM-02 | Regulation and jurisdiction management | P1 |
| BIL-01 | Subscription tiers (free / pro / enterprise) | P2 |
| BIL-02 | Stripe checkout and webhook handling | P2 |

---

## 7. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| **Security** | Row-level security on all tenant tables; API keys hashed; no service role in client |
| **Privacy** | GDPR-oriented policies; DPA for processor scenarios; audit logs |
| **Performance** | Analytics queries indexed; async document processing |
| **Reliability** | Graceful degradation when AI provider or email unavailable |
| **i18n** | 4 locales; Arabic RTL; locale cookie + user preference |
| **Observability** | Optional Sentry; structured error logging; AI usage admin view |
| **Compliance disclaimer** | All AI/regulatory outputs labeled as assistive, not legal advice |

---

## 8. Success metrics

| Metric | Target |
|--------|--------|
| Time to first verification | < 15 minutes from signup |
| Document extraction acceptance rate | > 80% fields accepted without edit |
| Discrepancies caught pre-filing | Measurable reduction vs baseline |
| Collaborator invite acceptance | > 60% within 7 days |
| API uptime (production) | 99.5% |

---

## 9. Out of scope (v1)

- Direct filing to customs single-window systems
- Licensed customs brokerage services
- Payment of duties/taxes
- Letter-of-credit or trade finance
- Real-time customs clearance status from government APIs (unless integrated later)

---

## 10. Dependencies & constraints

- **Supabase** for PostgreSQL, Auth, Storage
- **OpenAI** (or configurable provider) for document AI
- **SendGrid** for email (optional in dev)
- **Stripe** for billing (optional until configured)
- **Upstash Redis** for rate limiting (production recommended)

---

## 11. Related documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — technical architecture
- [ARCHITECTURE-ESSENTIALS.md](./ARCHITECTURE-ESSENTIALS.md) — quick reference for AI agents
- [README.md](./README.md) — setup and operations
- [docs/SCAFFOLDING.md](./docs/SCAFFOLDING.md) — folder structure and extension points
