# Production Readiness Checklist
Date: February 24, 2026
Product: VmestoRu

## Closed in this iteration
- Verified-only reviews: review is allowed only after a confirmed lead request for the same venue.
- Review anti-abuse risk scoring: duplicate reviewer, short text, suspicious words, high posting frequency.
- Moderation queue: risky reviews are created as `pending`.
- Admin review moderation endpoints:
  - `GET /api/admin/reviews`
  - `POST /api/admin/reviews/:id/moderate`
- Rating recalculation now uses only `verified + published` reviews.
- Ops readiness endpoint:
  - `GET /api/admin/ops/readiness`
- Smoke checks:
  - `npm run smoke:catalog`
  - `npm run smoke:trust`

## Remaining gaps (must be closed before public launch)
- Real acquiring is not enabled (payment mode is mock).
- No persistent database yet (in-memory runtime data).
- No full e2e regression framework in CI (only smoke scripts).

## Support / Legal guardrails
- Support escalation and SLA are documented in team consensus doc and encoded in API readiness output.
- Legal checkpoint is required in each release gate; do not bypass `privacy`, `notifications`, and cancellation policy review.

## Recommended next release gate
1. Enable persistent DB and migrations.
2. Integrate real payment provider and webhook verification.
3. Add CI job for smoke scripts and fail pipeline on regression.
