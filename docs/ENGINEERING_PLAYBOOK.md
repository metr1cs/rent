# Engineering Playbook (VmestoRu)

## 1) Release Process
Definition of Done (DoD):
- Feature covered by tests (unit/e2e/smoke as applicable).
- UX reviewed on desktop + mobile.
- SEO checks completed (title, description, canonical, structured data if needed).
- Support flow validated (`/api/support/requests` end-to-end).
- Monitoring impact reviewed (logs/alerts/events).
- Rollback plan documented in PR.

Mandatory pre-prod checklist:
- UI regression check: `/`, `/catalog`, `/category/:slug`, `/venue/:id`, `/owner`, `/admin/reviews`.
- Mobile smoke: iOS Safari + Android Chrome viewport sanity.
- SEO: meta tags, robots, sitemap, favicon, OG image.
- Technical smoke: `npm run build`, `npm run smoke:catalog`, `npm run smoke:trust`.
- Support smoke: create support request and verify delivery.
- Rollback command prepared and validated.

## 2) Branch Strategy
- `feature/*` -> Pull Request -> Review -> Merge.
- No direct pushes to `main`.
- Required status checks before merge: CI build + smoke tests.
- At least one reviewer approval.

## 3) CI/CD
Target state:
- Build and test on each PR.
- Deploy only from signed/approved release tags (`v*`).
- Production deploy uses dedicated `deploy` user and SSH key only.
- Protected `production` environment with manual approval gate.

## 4) Test Contour
Required e2e flows:
- Home -> Catalog -> Category -> Venue -> Lead submit.
- Support modal -> support request API success/error.
- Owner login/register -> create venue -> delete venue.
- Admin moderation sign-in -> list -> moderate review.
- Critical e2e command: `npm run e2e:critical`

Visual regression:
- Snapshot baselines for `/`, `/catalog`, `/venue/:id`, `/owner`.

## 5) UX Architecture
UI playbook rules:
- Header/footer structure is fixed unless approved in PR scope.
- Date picker and modals must always render above content layers.
- Category blocks:
  - Home: top 8 by popularity.
  - Catalog: all categories.
- Adaptive behavior must be validated at 320/375/768/1024/1440 widths.

## 6) Observability
Track and alert on:
- API `5xx` and latency p95/p99.
- Frontend runtime errors.
- Support request failures.
- Telegram integration failures.
- Key funnel drop-off anomalies.

## 7) Security & Secrets
- Rotate leaked credentials immediately.
- Keep secrets only in environment/secret manager.
- Add rate limits for public + admin endpoints.
- Add reverse-proxy rate limits in Nginx for write/auth endpoints.
- Keep admin routes protected by session and server-side key validation.
- Use device fingerprint (`x-client-fingerprint`) in anti-fraud checks.

## 8) Content/Data Quality
- Venue creation requires minimum 5 photos.
- Validate required fields + normalize phone/address/city.
- Moderate user-generated reviews.
- Periodic checks for broken/empty images.

## 9) Product Analytics
Weekly KPI review:
- Funnel: Home -> Catalog -> Category -> Venue -> Lead.
- Category conversion and CTR.
- Lead-to-confirmed rate and SLA compliance.
- Top hypotheses for next iteration.

## 10) Team Rhythm
- Weekly sync (30 min): delivered, broken, next actions.
- Bi-weekly retro with concrete action items and owners.
- Monthly architecture/risk review.
