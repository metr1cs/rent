# Release Checklist

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
- [ ] `npm run build`
- [ ] `npm run smoke:catalog`
- [ ] `npm run smoke:trust`
- [ ] e2e subset for touched functionality
- [ ] visual snapshots updated/approved

## Ops
- [ ] Health checks pass after deploy (`/api/health`).
- [ ] Alert channels configured.
- [ ] Rollback command is ready.
- [ ] Production environment approval granted.

## Security
- [ ] No secrets in code/history/PR comments.
- [ ] Rate limits checked for changed endpoints.
- [ ] Admin/session auth path tested.

## Sign-off
- [ ] Tech Lead
- [ ] QA
- [ ] Product Owner
