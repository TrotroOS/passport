# Freight tracking setup

Passport supports three ways to get container milestones — pick based on cost and accuracy needs.

## Recommended: Terminal49 (live, multi-carrier)

Best balance for a SaaS product: one API covers many shipping lines, BOL + container lookup, and repeat refreshes do not re-register containers.

```env
TRACKING_PROVIDER=terminal49
TRACKING_API_KEY=your-terminal49-token
TRACKING_DEFAULT_SCAC=MAEU   # optional fallback when carrier unknown
CRON_SECRET=random-secret    # enables /api/cron/tracking-refresh every 6h
```

Sign up at [terminal49.com](https://www.terminal49.com/). Compare their pricing to per-container packs from VesselFinder (~$7/container one-time credit).

## Demo mode (default, free)

```env
TRACKING_PROVIDER=mock
```

Shows a sample Shanghai → Tema timeline so you can demo workflows. The UI labels this **Demo data** — do not present as live carrier status.

## Forwarder / carrier webhook (free API calls)

If your broker or TMS can POST events, use:

```
POST /api/tracking/webhook
Header: x-tracking-webhook-secret: <TRACKING_WEBHOOK_SECRET>
```

Body: `{ "shipment_id", "container_number", "events": [...] }` (see `trackingWebhookSchema`).

## Not supported: VesselFinder

`TRACKING_PROVIDER=vesselfinder` is disabled. Prepaid container credits (~$500/100 containers) and vessel AIS APIs do not fit Passport’s multi-tenant refresh model as well as Terminal49.

## Cost tips

- Only track **active** shipments (cron skips archived).
- Scheduled refresh runs **only** when Terminal49 is configured (not in demo mode).
- Add **carrier name** when creating containers so SCAC inference works (Maersk → MAEU, MSC → MSCU, etc.).
- First Terminal49 sync may take hours; UI shows “awaiting carrier data” until milestones arrive.

## Legal

Tracking output is **assistive** — see compliance disclaimer in the app. Users should confirm critical dates with carriers and forwarders.
