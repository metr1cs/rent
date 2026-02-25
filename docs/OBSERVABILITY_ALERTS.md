# Observability & Alerts
Date: 2026-02-24

## Implemented now
- Request-level monitoring in API:
  - total requests
  - status buckets (2xx/4xx/5xx)
  - latency samples with p95/p99
  - top 5xx endpoints
- Support flow counters:
  - success/failed support requests
- Telegram delivery counters:
  - success/failed sends
- Frontend runtime error ingestion:
  - `POST /api/monitor/frontend-error`
- Admin alerts endpoint:
  - `GET /api/admin/ops/alerts`
- Structured warn/error request logs (JSON) for centralized collection.
- Background OPS alert dispatcher to Telegram channel with cooldown.

## API endpoints
- `GET /api/admin/ops/alerts` (admin auth required)
- `POST /api/monitor/frontend-error`

## Alert thresholds (current)
- 5xx rate > 2%
- p95 latency > 1200ms
- support fail-rate > 5%
- Telegram failed > success

## Next step
- Connect stdout JSON logs to centralized collector (Loki/ELK/Sentry).
- Add persistent storage for monitoring snapshots.
- Integrate with external APM (Sentry/Grafana/Prometheus).
