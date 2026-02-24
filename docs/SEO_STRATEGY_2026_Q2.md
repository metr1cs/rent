# SEO Strategy & Forecast (VmestoRu)
Date: 2026-02-24

## 1) Current SEO Baseline
Already implemented:
- Clean route structure: `/`, `/catalog`, `/category/:slug`, `/venue/:id`, `/privacy`.
- Dynamic meta tags + canonical + robots on each page.
- JSON-LD on key pages (Organization, WebSite, CollectionPage, BreadcrumbList, FAQ).
- `robots.txt` + `sitemap.xml` (including category URLs).
- OpenGraph/Twitter meta.
- Favicon + web manifest.
- Category pages as search-entry points.

Main risks now:
- No backlink profile yet.
- Limited unique long-form content per category/city intent.
- No dedicated editorial landing pages (guides/comparisons/checklists).

## 2) Promotion Strategy (90 days)
### Phase A (Weeks 1-2) - Technical indexation
- Verify indexing in Yandex Webmaster + Google Search Console.
- Submit sitemap and monitor crawl/index coverage.
- Fix all "excluded" and "duplicate" URL issues.
- Ensure Core Web Vitals at least "Good" on key templates.

### Phase B (Weeks 3-6) - Semantic expansion
- Build intent clusters:
  - category + city (e.g. "лофт в ухте")
  - event type + capacity + price intent
  - comparison intents ("лофт или банкетный зал")
- Expand category texts with unique USP blocks and FAQ per intent.
- Add static SEO blocks with image-linked category cards (implemented).

### Phase C (Weeks 7-12) - Authority growth
- Launch 2-3 high-quality partner placements per week.
- Publish case studies and city/category guides.
- Internal linking matrix: Home -> Catalog -> Category -> Venue + related categories.

## 3) KPI Model
Primary SEO KPIs:
- Indexed pages count.
- Non-brand impressions.
- Organic clicks and CTR.
- Avg position for priority clusters.
- Organic leads (home->catalog->category->venue->lead).

Business KPIs:
- Organic lead volume.
- Lead-to-confirmed conversion.
- CAC from organic channel.

## 4) Forecast (scenario-based)
Assumptions:
- Stable release cadence (weekly).
- No major technical SEO regressions.
- Basic link-building started in first month.

Conservative (90 days):
- Organic sessions: +35% to +55%
- Non-brand impressions: +50% to +80%
- Organic leads: +20% to +35%

Target (90 days):
- Organic sessions: +70% to +110%
- Non-brand impressions: +120% to +180%
- Organic leads: +45% to +70%

Aggressive (90 days):
- Organic sessions: +130% to +200%
- Non-brand impressions: +220% to +320%
- Organic leads: +80% to +130%

## 5) Priority Backlog
1. Add SEO landing templates for "category + city" (programmatic pages with strict quality guardrails).
2. Add content module on category pages: checklist, budget ranges, pitfalls.
3. Add structured data extensions where relevant (FAQ/ItemList consistency).
4. Enable dashboard with weekly SEO + funnel review.

## 6) Weekly Review Format
- Visibility: impressions, avg position, coverage.
- Engagement: CTR, bounce, depth on category pages.
- Conversion: organic -> lead -> confirmed.
- Decisions: 3 experiments for next sprint.
