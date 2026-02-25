# Laravel + MySQL Migration Plan

## Status
- Current backend: Node.js + Express + TypeScript (`apps/api`).
- Target backend: Laravel 11 + MySQL 8 (`apps/api-laravel`).
- Current blocker in this environment: no DNS/network to Packagist.

## Goal
Migrate backend without downtime and keep frontend API-compatible.

## Phase 1: Bootstrap Laravel (1 day)
1. Create project:
   - `composer create-project laravel/laravel apps/api-laravel`
2. Configure `.env`:
   - `APP_URL`
   - `DB_CONNECTION=mysql`
   - `DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD`
3. Add CORS, API middleware, request-id middleware.

## Phase 2: Data Layer (1-2 days)
1. Create migrations for:
   - `categories`
   - `owners`
   - `venues`
   - `lead_requests`
   - `reviews`
   - `review_moderation_audit`
   - `support_requests`
   - `payments`
   - `analytics_events`
2. Add indexes:
   - `venues(category, region, is_published)`
   - `lead_requests(venue_id, status, created_at)`
   - `reviews(venue_id, status, created_at)`
   - `support_requests(status, created_at)`
3. Seed base categories.

## Phase 3: API Compatibility (2-4 days)
Implement endpoints first, then switch frontend:
- `GET /health`, `GET /api/health`
- `GET /api/categories`
- `GET /api/venues`, `GET /api/venues/{id}`, `GET /api/venues/{id}/similar`
- `GET /api/venues/{id}/reviews`, `POST /api/venues/{id}/reviews`
- `POST /api/venues/{id}/requests`
- `POST /api/support/requests`
- owner auth/profile/venues/dashboard/requests/status
- admin auth/session/overview/reviews/support/requests/ops alerts

## Phase 4: Anti-Fraud + Observability (1-2 days)
1. Laravel rate limiter (`RateLimiter::for`) for write/auth endpoints.
2. Device fingerprint header support (`x-client-fingerprint`).
3. Duplicate checks (lead/support/review).
4. Structured logs and periodic OPS alerts.

## Phase 5: Testing + Cutover (1-2 days)
1. Port smoke/e2e contract checks to Laravel host.
2. Run:
   - `php artisan test`
   - `npm run e2e:critical` against Laravel base URL.
3. Blue/green switch:
   - Keep Node API live.
   - Switch Nginx upstream per endpoint group.
   - Full switch after parity + rollback plan.

## Rollback
- Keep Node API running as fallback.
- Nginx upstream toggle back to Node.
- DB writes on Laravel-only endpoints require dump snapshot before cutover.

