import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'apps/web/dist');
const baseHtmlPath = path.join(distDir, 'index.html');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const siteUrl = 'https://vmestoru.ru';
const defaultOgImage = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80';

const baseHtml = await fs.readFile(baseHtmlPath, 'utf8');
const sitemap = await fs.readFile(sitemapPath, 'utf8');
const routes = [...new Set([...sitemap.matchAll(/<loc>https:\/\/vmestoru\.ru([^<]*)<\/loc>/g)].map((match) => match[1] || '/'))];

function decodeSlug(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeSegmentForFs(value) {
  const protectedValue = value.replace(/%2F/gi, '__SLASH__');
  try {
    return decodeURIComponent(protectedValue).replace(/__SLASH__/g, '%2F');
  } catch {
    return value;
  }
}

function toFsRelativePaths(route) {
  if (route === '/') return [''];
  const encoded = route.replace(/^\//, '');
  const decoded = route
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeSegmentForFs(segment))
    .join('/');
  return [...new Set([encoded, decoded].filter(Boolean))];
}

function normalizePhrase(value) {
  const decoded = decodeSlug(value).replace(/-/g, ' ').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
  if (!decoded) return '';
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMeta(route) {
  if (route === '/') {
    return {
      title: 'VmestoRu — аренда площадок для мероприятий',
      description: 'VmestoRu — аренда площадок для мероприятий: лофты, банкетные и конференц-залы по городам России.',
      canonical: `${siteUrl}/`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'VmestoRu',
        url: `${siteUrl}/`,
      },
    };
  }

  if (route === '/catalog') {
    return {
      title: 'Каталог площадок по категориям и городам | VmestoRu',
      description: 'Каталог площадок VmestoRu: выбирайте категорию, город, вместимость и бюджет. Подбор лофтов, банкетных и event-площадок по России.',
      canonical: `${siteUrl}/catalog`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Каталог площадок VmestoRu',
        url: `${siteUrl}/catalog`,
      },
    };
  }

  if (route === '/privacy') {
    return {
      title: 'Политика конфиденциальности | VmestoRu',
      description: 'Политика конфиденциальности VmestoRu: порядок обработки персональных данных, cookies, запросов пользователей и защиты информации.',
      canonical: `${siteUrl}/privacy`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Политика конфиденциальности VmestoRu',
        url: `${siteUrl}/privacy`,
      },
    };
  }

  const cityMatch = route.match(/^\/city\/([^/]+)$/);
  if (cityMatch) {
    const city = normalizePhrase(cityMatch[1]);
    return {
      title: `${city} — аренда площадок по категориям | VmestoRu`,
      description: `Аренда площадок в ${city}: подбор категорий, быстрый переход к лофтам, банкетным и event-локациям для мероприятий и бронирований.`,
      canonical: `${siteUrl}${route}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Каталог площадок в ${city}`,
        url: `${siteUrl}${route}`,
      },
    };
  }

  const categoryCityMatch = route.match(/^\/category\/([^/]+)\/([^/]+)$/);
  if (categoryCityMatch) {
    const category = normalizePhrase(categoryCityMatch[1]);
    const city = normalizePhrase(categoryCityMatch[2]);
    return {
      title: `${category} в ${city} — аренда площадок | VmestoRu`,
      description: `Подбор площадок категории «${category}» в ${city}: сравнивайте цену, вместимость, площадь и рейтинг, чтобы быстрее выйти на бронирование.`,
      canonical: `${siteUrl}${route}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${category} в ${city}`,
        url: `${siteUrl}${route}`,
      },
    };
  }

  const categoryMatch = route.match(/^\/category\/([^/]+)$/);
  if (categoryMatch) {
    const category = normalizePhrase(categoryMatch[1]);
    return {
      title: `${category} — аренда площадок | VmestoRu`,
      description: `Категория «${category}» на VmestoRu: площадки по городам России с фильтрами по бюджету, площади, вместимости и рейтингу.`,
      canonical: `${siteUrl}${route}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${category} — каталог площадок`,
        url: `${siteUrl}${route}`,
      },
    };
  }

  const venueMatch = route.match(/^\/venue\/([^/]+)$/);
  if (venueMatch) {
    return {
      title: `Карточка площадки — VmestoRu`,
      description: 'Карточка площадки на VmestoRu: фотографии, вместимость, площадь, цена и отправка заявки напрямую арендодателю.',
      canonical: `${siteUrl}${route}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Карточка площадки VmestoRu',
        url: `${siteUrl}${route}`,
      },
    };
  }

  return {
    title: 'VmestoRu — аренда площадок для мероприятий',
    description: 'VmestoRu — аренда площадок для мероприятий: лофты, банкетные и конференц-залы по городам России.',
    canonical: `${siteUrl}${route}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'VmestoRu',
      url: `${siteUrl}${route}`,
    },
  };
}

function applyMeta(html, route) {
  const meta = getMeta(route);
  let next = html;
  next = next.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`);
  next = next.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeHtml(meta.description)}" />`);
  next = next.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  next = next.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  next = next.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`);
  next = next.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${escapeHtml(defaultOgImage)}" />`);
  next = next.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`);
  next = next.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
  next = next.replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${escapeHtml(defaultOgImage)}" />`);
  next = next.replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
  const jsonLd = `<script type="application/ld+json" data-prerender-seo="route">${escapeHtml(JSON.stringify(meta.jsonLd))}</script>`;
  if (next.includes('data-prerender-seo="route"')) {
    next = next.replace(/<script type="application\/ld\+json" data-prerender-seo="route">.*?<\/script>/s, jsonLd);
  } else {
    next = next.replace('</head>', `    ${jsonLd}\n  </head>`);
  }
  return next;
}

for (const route of routes) {
  const html = applyMeta(baseHtml, route);
  const relativePaths = toFsRelativePaths(route);
  if (route === '/') {
    await fs.writeFile(path.join(distDir, 'index.html'), html, 'utf8');
    continue;
  }
  for (const relativePath of relativePaths) {
    const targetDir = path.join(distDir, relativePath);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'index.html'), html, 'utf8');
  }
}

console.log(`Prerendered SEO routes: ${routes.length}`);
