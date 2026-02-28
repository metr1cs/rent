import fs from "node:fs/promises";
import path from "node:path";

const siteUrl = "https://vmestoru.ru";
const today = new Date().toISOString().slice(0, 10);

const root = process.cwd();
const dataTsPath = path.join(root, "apps/api/src/data.ts");
const sitemapPath = path.join(root, "apps/web/public/sitemap.xml");

const cityNames = [
  "Москва",
  "Санкт-Петербург",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Самара",
  "Омск",
  "Ростов-на-Дону",
  "Уфа",
  "Красноярск",
  "Воронеж",
  "Пермь",
  "Волгоград",
  "Краснодар",
  "Саратов",
  "Тюмень",
  "Тольятти",
  "Ижевск",
  "Барнаул",
  "Ульяновск",
  "Иркутск",
  "Владивосток",
  "Сочи",
  "Калининград",
  "Ухта",
];

function slugify(value) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, "-"));
}

function parseCategories(source) {
  const blockMatch = source.match(/const allCategoryNames = \[(.*?)\];/s);
  if (!blockMatch) throw new Error("Cannot find allCategoryNames block in data.ts");
  const block = blockMatch[1];
  const matches = [...block.matchAll(/"([^"]+)"/g)];
  const categories = matches.map((m) => m[1]).filter(Boolean);
  if (!categories.length) throw new Error("No category names parsed from data.ts");
  return categories;
}

function urlTag(loc, changefreq, priority) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

async function main() {
  const source = await fs.readFile(dataTsPath, "utf8");
  const categories = parseCategories(source);

  const tags = [];
  tags.push(urlTag(`${siteUrl}/`, "daily", "1.0"));
  tags.push(urlTag(`${siteUrl}/catalog`, "daily", "0.95"));
  tags.push(urlTag(`${siteUrl}/privacy`, "monthly", "0.4"));

  cityNames.forEach((city) => {
    tags.push(urlTag(`${siteUrl}/city/${slugify(city)}`, "weekly", "0.75"));
  });

  categories.forEach((category) => {
    tags.push(urlTag(`${siteUrl}/category/${slugify(category)}`, "weekly", "0.8"));
    cityNames.forEach((city) => {
      tags.push(urlTag(`${siteUrl}/category/${slugify(category)}/${slugify(city)}`, "weekly", "0.7"));
    });
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...tags,
    '</urlset>',
    '',
  ].join("\n");

  await fs.writeFile(sitemapPath, xml, "utf8");
  console.log(`Sitemap generated: ${sitemapPath}`);
  console.log(`Categories: ${categories.length}; Cities: ${cityNames.length}`);
}

main().catch((error) => {
  console.error("Sitemap generation failed:", error.message);
  process.exit(1);
});
