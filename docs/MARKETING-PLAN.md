# Passport — Marketing Plan

**Version:** 1.0  
**Last updated:** 2026-08-28  
**Owner:** Product / GTM  
**Status:** Active (pilot → early growth)

---

## 1. Executive summary

Passport is an AI-powered trade compliance and shipment intelligence platform for importers, customs brokers, and freight forwarders operating on African import corridors (Ghana primary, Nigeria and Kenya next).

**Marketing goal (12 months):** Establish Passport as the default pre-clearance workspace for mid-market import teams in West Africa — measured by activated pilot orgs, broker-invite loops, and paid conversion on Pro.

**Core promise:** Catch document and compliance gaps *before* customs filing — not after delays and penalties.

**Positioning line:** *Clear customs with confidence — before you file.*

---

## 2. Positioning & messaging

### Category

Trade compliance operations software / shipment intelligence — not a licensed customs broker, not government filing software.

### Primary value pillars

| Pillar | Message | Proof on site |
|--------|---------|---------------|
| **Speed to readiness** | Upload docs → AI extraction → verification in minutes | Hero preview, How it works |
| **Risk reduction** | Cross-document checks + Passport Score before filing | Features: verification, score |
| **Corridor expertise** | Rules tuned for Ghana, Nigeria, Kenya | Corridors section |
| **Collaboration** | Importers and brokers on one audited workspace | Features: collaboration |
| **Integrations** | API + webhooks for ERP/WMS back offices | Product (API v1), Enterprise tier |

### Messaging guardrails

- Always include assistive disclaimer: Passport is **decision-support**, not legal or customs advice.
- Lead with outcomes (fewer holds, faster handoffs), not AI buzzwords.
- Use corridor-specific language where possible (e.g. “Ghana import readiness” vs generic “compliance”).
- Avoid guarantees of clearance or duty amounts.

### Elevator pitch (30 seconds)

> Passport helps import teams and brokers upload trade documents, automatically extract and cross-check fields, run corridor-specific regulatory checks, and score shipment readiness — with full audit trails and broker collaboration — before anything hits customs.

---

## 3. Ideal customer profiles (ICPs)

### ICP A — Mid-market importer (primary)

| Attribute | Detail |
|-----------|--------|
| **Company** | 20–500 employees; regular import volume (5–50 shipments/month) |
| **Role** | Compliance manager, import manager, finance ops lead |
| **Pain** | Email/document chaos; late discrepancy discovery; broker back-and-forth |
| **Trigger** | Customs delay, penalty, or audit; new broker relationship |
| **Budget** | Pro ($99/mo) or Enterprise for volume |
| **Success metric** | Time to “owner ready”; open discrepancies at filing |

### ICP B — Customs broker (secondary, viral loop)

| Attribute | Detail |
|-----------|--------|
| **Company** | Licensed broker serving multiple importers |
| **Role** | Operations lead, clearance manager |
| **Pain** | Incomplete/incorrect docs from clients; no single source of truth |
| **Trigger** | Client asks for digital handoff; wants fewer rework cycles |
| **Motion** | Invited as collaborator → adopts for own client base |
| **Success metric** | Broker readiness confirmations; invite acceptance rate |

### ICP C — Freight forwarder / 3PL (tertiary)

| Attribute | Detail |
|-----------|--------|
| **Pain** | Tracking disconnected from compliance; clients blame forwarder for doc issues |
| **Hook** | Container tracking + compliance in one shipment view |
| **Motion** | Partner referral or API integration |

### ICP D — API integrator (Enterprise)

| Attribute | Detail |
|-----------|--------|
| **Role** | IT / ops automation at larger trader or logistics group |
| **Hook** | REST API, webhooks, unlimited volume |
| **Motion** | Outbound + docs; solution engineering for Enterprise |

---

## 4. Competitive differentiation

| Alternative | Weakness | Passport angle |
|-------------|----------|------------------|
| Email + spreadsheets | No verification, no audit trail | Structured workspace + Passport Score |
| Generic document AI | No trade-specific checks or corridors | Brain + Arbiter + corridor rules |
| Broker-only portals | Importer doesn’t own the workflow | Multi-tenant; importer-led with broker invite |
| ERP modules | Slow to configure; weak on doc extraction | Fast pilot on Free tier; API for sync |

**Moat to emphasize:** Corridor regulatory engines + cross-document verification + collaboration loop + audit export.

---

## 5. Go-to-market phases

### Phase 0 — Foundation (complete)

- [x] Marketing landing page (`/`) with features, corridors, pricing, mobile UX
- [x] Free / Pro / Enterprise packaging (`src/lib/billing/plans.ts`)
- [x] Signup → org creation flow
- [x] Help center and legal policies
- [x] i18n: EN, FR, PT, AR

### Phase 1 — Pilot acquisition (0–90 days)

**Objective:** 10–20 activated organizations; 3+ broker-invite loops; 5 paying Pro customers.

| Workstream | Actions |
|------------|---------|
| **Founder-led sales** | 30 targeted outbound conversations (Ghana importers + brokers) |
| **Pilot offer** | “Free tier + onboarding call” — no credit card; white-glove first shipment |
| **Demo narrative** | Live flow: create shipment → upload invoice + PL → verify → score → invite broker |
| **Proof assets** | 2 anonymized case snapshots (before/after discrepancy catch) |
| **Feedback loop** | Triage `/admin/feedback` weekly; ship top 3 UX fixes per sprint |

**Activation definition:** Org with ≥1 shipment, ≥2 documents uploaded, ≥1 verification run.

### Phase 2 — Corridor credibility (90–180 days)

**Objective:** Known in Ghana import community; Nigeria/Kenya waitlist; 25+ Pro orgs.

| Workstream | Actions |
|------------|---------|
| **Content** | Monthly “corridor brief” (regulatory changes + how Passport checks them) |
| **Partnerships** | 3 broker LOIs for preferred collaborator onboarding |
| **Events** | 1 trade/logistics conference or webinar (Accra or virtual WA) |
| **Localization** | French landing copy push for WA Francophone importers |
| **SEO** | Pages/targets: “Ghana import document checklist”, “commercial invoice verification” |

### Phase 3 — Scalable growth (180–365 days)

**Objective:** Inbound-led pipeline; Enterprise deals; API revenue.

| Workstream | Actions |
|------------|---------|
| **Paid acquisition** | Test LinkedIn + Google on high-intent keywords (cap $2–5k/mo) |
| **Referral** | Broker invites importer → credit or seat upgrade incentive |
| **Enterprise** | Outbound to top 50 regional traders; SSO + custom corridors pitch |
| **Product-led** | In-app upgrade prompts at shipment limit; API usage dashboards |

---

## 6. Channel strategy

| Channel | Role | Priority | KPI |
|---------|------|----------|-----|
| **Founder / direct outreach** | First 20 customers | P0 | Meetings booked, pilots started |
| **Broker collaboration loop** | Viral expansion | P0 | Invites sent, acceptance rate |
| **Content + SEO** | Inbound trust | P1 | Organic signup, time on site |
| **Trade associations & brokers** | Credibility | P1 | Partner referrals |
| **LinkedIn (organic + paid)** | Awareness | P2 | CTR, signup conversion |
| **Conferences / webinars** | Lead gen | P2 | Leads captured, demo requests |
| **API / integrator docs** | Enterprise | P2 | API keys created, webhook adoption |

**Deprioritize early:** Broad paid social, international markets outside Africa corridors, channel resellers.

---

## 7. Website & conversion funnel

### Current funnel

```
/ (marketing) → /signup → /dashboard → create shipment → upload docs → verify
                     ↘ /login
```

### Conversion optimizations (backlog)

| Item | Impact | Effort |
|------|--------|--------|
| Add social proof strip (logos / quotes) when available | High | Low |
| `/demo` or Calendly embed for Enterprise + pilot calls | High | Low |
| Corridor-specific landing pages (`/ghana`, `/nigeria`) | Medium | Medium |
| Customer story section on homepage | High | Medium |
| Compare page vs “email + Excel” | Medium | Low |
| Open Graph / Twitter cards for link sharing | Medium | Low |
| UTM capture on signup for attribution | High | Low |

### Primary CTAs (keep consistent)

- **Unauthenticated:** “Start free” → `/signup`
- **Authenticated:** “Dashboard” → `/dashboard`
- **Enterprise:** “Contact sales” → `mailto:` support email (later: HubSpot/Calendly)

---

## 8. Content plan (first 90 days)

| Week | Asset | Channel | Goal |
|------|-------|---------|------|
| 1–2 | Pilot one-pager PDF (problem → solution → pricing) | Sales email | Shorten sales cycle |
| 3 | Blog: “5 document mismatches that delay Ghana imports” | SEO, LinkedIn | Inbound |
| 4 | 3-min product walkthrough video | Homepage, outreach | Demo at scale |
| 6 | Broker collaboration guide | Help center, email | Increase invites |
| 8 | Case study #1 (anonymized) | Landing, sales | Proof |
| 10 | Regulatory update newsletter #1 | Email list | Retention / trust |
| 12 | API quickstart for integrators | Docs, dev outreach | Enterprise pipeline |

**Tone:** Practical, corridor-aware, confident but legally careful.

---

## 9. Pricing & packaging GTM

| Tier | Price | GTM use |
|------|-------|---------|
| **Free** | $0 | Pilot hook; 10 shipments/mo; prove value on first clearance cycle |
| **Pro** | $99/mo | Default for active importers; highlight at 8+ shipments/mo |
| **Enterprise** | Custom | Unlimited corridors, SSO, dedicated support — sales-led |

**Upgrade triggers to implement in-product:**

- Shipment limit approaching (80% of Free cap)
- Second broker collaborator on Free
- API call volume threshold
- Request for additional corridor

**Discount policy (pilot phase):** Up to 3 months Pro at 50% for design partners who agree to feedback calls + logo/quote.

---

## 10. Partnerships

### Customs brokers

- **Offer:** Free collaborator seats; co-branded onboarding PDF for their clients
- **Ask:** Recommend Passport for pre-clearance doc prep; joint webinar
- **Metric:** Invites per broker org; broker readiness confirmations

### Freight forwarders

- **Offer:** Tracking + compliance unified view for shared clients
- **Ask:** Introduce to importer clients pre-arrival

### Trade associations (Ghana, Nigeria, Kenya)

- **Offer:** Member discount on Pro; regulatory update sponsorship
- **Ask:** Newsletter mention, event slot

---

## 11. Metrics & reporting

### North-star metric

**Weekly activated shipments** — shipments with verification run in last 7 days.

### Funnel metrics

| Stage | Metric | Target (90d) |
|-------|--------|--------------|
| Awareness | Unique homepage visitors | Baseline + 20% MoM |
| Signup | Registrations | 50+ |
| Activation | Orgs with ≥1 verification | 40% of signups |
| Engagement | Avg documents per active org | ≥4 |
| Collaboration | Shipments with external collaborator | 25% of active |
| Revenue | Pro subscriptions | 5+ |
| Retention | 30-day active org rate | ≥60% |

### Marketing ops checklist

- Track UTM parameters on all campaigns
- Review `/admin/feedback` and signup drop-off weekly
- Monitor AI cost per activated org (unit economics)
- Capture “how did you hear about us?” at signup (future field)

---

## 12. Launch & campaign calendar (next 90 days)

| Month | Theme | Key activities |
|-------|-------|----------------|
| **M1** | Pilot push | 20 founder outbound emails; 5 live demos; refine onboarding |
| **M2** | Ghana corridor | Publish checklist content; 1 broker partnership; FR copy review |
| **M3** | Proof + scale | Case study; webinar; soft Pro upgrade campaign to activated Free orgs |

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Over-promising clearance outcomes | Strict disclaimer on all marketing; train sales on assistive positioning |
| Low broker adoption | Improve invite email + acceptance UX; broker-specific one-pager |
| Free tier abuse | Rate limits + fair-use; monitor via admin dashboard |
| Corridor rule gaps | Transparent “needs review” states; roadmap communication on site |
| Long sales cycles | Free tier + quick time-to-value (first verification in <30 min) |

---

## 14. Team & responsibilities

| Function | Responsibilities |
|----------|------------------|
| **Product** | Activation UX, upgrade prompts, corridor coverage |
| **Engineering** | Landing performance, analytics events, SEO metadata |
| **Founder / GTM** | Outbound, demos, partnerships, case studies |
| **Platform admin** | Feedback triage, pilot support, usage monitoring |

---

## 15. Related assets in this repo

| Asset | Location |
|-------|----------|
| Marketing landing page | `src/components/marketing/` |
| Homepage route | `src/app/page.tsx` |
| i18n copy | `messages/en.json` → `marketing.*` |
| Pricing config | `src/lib/billing/plans.ts` |
| Product scope | `PRD.md` |
| User help | `docs/USER-HELP.md` |
| Admin operator guide | `docs/RUNBOOK.md` |

---

## 16. Immediate next actions

1. **Sales:** Build target list of 30 Ghana importers/brokers; schedule 10 discovery calls.
2. **Product:** Add signup attribution field (“How did you hear about us?”).
3. **Marketing:** Record 3-minute demo video; embed on homepage hero or How it works.
4. **Content:** Publish pilot one-pager and first corridor blog post.
5. **Ops:** Define weekly GTM standup — review signups, activations, feedback, Pro pipeline.

---

*Passport marketing must always reflect the product truth in [PRD.md](../PRD.md). Update this plan quarterly or when pricing, corridors, or ICP focus changes.*
