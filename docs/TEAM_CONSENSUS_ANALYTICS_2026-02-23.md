# Team Consensus Analytics
Date: February 23, 2026
Product: VmestoRu (venue rental marketplace)

## Scope and Method
- Sources: outputs from all active agents in `ai_team` orchestration (`run_demo.py`), current implemented product state (web + api), and release constraints.
- Goal: create one consolidated decision layer from all role opinions.
- Payment note: real acquiring is intentionally out of scope for this stage; billing logic and reminders stay mock/operational.

## Agent Coverage (Who Contributed)
- Product/Delivery: `ProductManagerAgent`, `TechLeadAgent`, `DecisionAgent`
- Experience: `DesignAgent`, `FrontendAgent`
- Platform/API: `BackendAgent`
- Quality/Reliability: `QAAgent`, `QAAutomationAgent`, `SREAgent`, `DevOpsAgent`, `SecurityAgent`
- Growth/Insights: `AnalyticsAgent`, `ProductAnalystAgent`, `GrowthAgent`, `CRMRetentionAgent`
- Governance/Operations: `LegalComplianceAgent`, `SupportOpsAgent`

## Consensus (High-Confidence Decisions)
1. Core user path remains primary:
`search -> venue detail -> lead/booking intent -> review`
2. Owner path remains primary:
`register -> subscription status -> listing management -> lead processing`
3. Release gate is non-negotiable:
QA + Security + Ops checks before deployment.
4. Analytics must drive product decisions:
all critical screens and conversion steps are measurable.
5. Retention is part of core ops:
reminder flow (D-3, D-1, overdue) is required.

## What Is Already Implemented (Aligned with Consensus)
- Search with structured filters and quick chips.
- Featured category slices and card catalog flow.
- Venue detail with review and lead submission.
- Owner dashboard with request status workflow and SLA signal.
- Admin billing overview + debtors logic + reminder dispatch endpoint.
- Telegram alerts for key business events.
- Base funnel events and admin funnel endpoint.

## Gaps Identified by Team (Remaining)
1. QA depth gap:
manual smoke/build is good, but full automated e2e regression is not yet in release pipeline.
2. Observability gap:
no centralized dashboards/alerts runbook execution in production yet.
3. Product analytics depth gap:
funnel exists, but cohort/segment analysis and experiment framework are not mature.
4. Compliance gap:
legal docs exist, but formal compliance checklist and operational review cadence are not yet systematized.
5. Support gap:
incident/support SLAs are defined conceptually, but not yet wired into tooling.

## Priority Plan (Consensus Backlog)
## P0 (Ship-hardening, 7 days)
1. Add automated regression suite for:
- search/filter
- venue detail + lead submit
- owner auth + request status transitions
2. Add reliability baseline:
- structured logs
- alert thresholds for API errors and notifier failures
3. Add analytics quality checks:
- event schema validation
- missing-event alarms on critical flow

## P1 (Conversion and Retention, 7-14 days)
1. Add “similar venues” quality scoring iteration (A/B ranking signals).
2. Add owner response-performance cards:
- median first response time
- SLA breach trend
3. Add retention reporting:
- reminder delivery count
- overdue reduction rate

## P2 (Governance and Scale, 14-30 days)
1. Formal legal/compliance operational checklist and release checkpoint.
2. Support workflows with severity routing and response SLAs.
3. Extended growth experiments:
- landing page variants
- category order experiments by city intent.

## KPI Set (Unified)
- North Star: confirmed bookings/leads per week
- Funnel:
  - `home_view -> venue_view` conversion (%)
  - `venue_view -> lead_submit` conversion (%)
- Owner operations:
  - SLA breach rate (%)
  - lead confirmation rate (%)
- Retention:
  - D-3/D-1 reminder reach (%)
  - overdue owner share (%)
- Reliability:
  - API health uptime (%)
  - notifier failure rate (%)

## Current Team Score (Consensus)
- Product readiness: 8.4/10
- UX/UI readiness: 8.1/10
- Backend readiness: 8.6/10
- QA/release readiness: 7.7/10
- Reliability/ops readiness: 7.6/10
- Growth/analytics readiness: 8.0/10
- Overall weighted readiness: 8.1/10

## Final Decision
- Proceed with iterative release cadence.
- Keep payment in mock mode for now.
- Prioritize P0 hardening immediately; no skip on QA+Security+Ops gates.
