# Release Checklist

## Cycle Rule (mandatory)
- [ ] After every implementation cycle, run `npm run qa:cycle`.
- [ ] If any step fails, release is blocked until fix + rerun.
- [ ] Record result in PR/issue: `build`, `smoke:catalog`, `smoke:trust`.

## Product/UI
- [ ] Main user flows are stable.
- [ ] Desktop and mobile layouts verified.
- [ ] Category rules respected (Home top 8, Catalog all).
- [ ] Support modal works (open/submit/success/error).

## SEO
- [ ] Title/description/canonical are valid.
- [ ] OpenGraph/Twitter meta are valid.
- [ ] `sitemap.xml` and `robots.txt` are current.
- [ ] Favicon and manifest are accessible.

## Quality Gates
- [ ] `npm run qa:cycle`
- [ ] `npm run e2e:critical`
- [ ] e2e subset for touched functionality
- [ ] visual snapshots updated/approved

## Ops
- [ ] Health checks pass after deploy (`/api/health`).
- [ ] Post-deploy read-only smoke passed (`SMOKE_READ_ONLY=true npm run smoke:all`).
- [ ] Alert channels configured.
- [ ] Rollback command is ready.
- [ ] Production environment approval granted.

## Security
- [ ] No secrets in code/history/PR comments.
- [ ] Rate limits checked for changed endpoints.
- [ ] Nginx reverse-proxy limits applied to write/auth endpoints.
- [ ] Device fingerprint header is present in critical POST flows.
- [ ] Admin/session auth path tested.

## Legal
- [ ] `/privacy` актуальна.
- [ ] `/terms` опубликована.
- [ ] `/disputes` опубликована.

## Sign-off
- [ ] Tech Lead
- [ ] QA
- [ ] Product Owner
