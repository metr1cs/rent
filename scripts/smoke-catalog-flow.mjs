const apiBase = (process.env.API_BASE_URL || "http://localhost:8090").replace(/\/+$/, "");
const webBase = (process.env.WEB_BASE_URL || "http://localhost:4173").replace(/\/+$/, "");

function categoryToSlug(value) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, "-"));
}

async function assertOk(url, label) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status} ${res.statusText}`);
  }
  return res;
}

async function main() {
  await assertOk(`${apiBase}/health`, "API health");

  const categoriesRes = await assertOk(`${apiBase}/api/categories`, "Categories");
  const categories = await categoriesRes.json();
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("No categories returned by API");
  }

  const categoryName = categories[0].name;
  const categorySlug = categoryToSlug(categoryName);
  const venuesRes = await assertOk(
    `${apiBase}/api/venues?category=${encodeURIComponent(categoryName)}`,
    "Category venues"
  );
  const venues = await venuesRes.json();
  if (!Array.isArray(venues) || venues.length === 0) {
    throw new Error(`No venues for category: ${categoryName}`);
  }

  const venueId = venues[0].id;
  await assertOk(`${apiBase}/api/venues/${encodeURIComponent(venueId)}`, "Venue card");
  await assertOk(`${webBase}/catalog`, "Web catalog route");
  await assertOk(`${webBase}/category/${categorySlug}`, "Web category route");

  console.log("Smoke OK:");
  console.log(`- category: ${categoryName}`);
  console.log(`- venueId: ${venueId}`);
  console.log(`- checked routes: /catalog, /category/${categorySlug}`);
}

main().catch((error) => {
  console.error("Smoke FAIL:", error.message);
  process.exit(1);
});
