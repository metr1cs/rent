const apiBase = (process.env.API_BASE_URL || "http://localhost:8090").replace(/\/+$/, "");
const webBase = (process.env.WEB_BASE_URL || "http://localhost:4173").replace(/\/+$/, "");
const readOnlyMode = process.env.SMOKE_READ_ONLY === "true";

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

async function assertApiHealth() {
  const direct = await fetch(`${apiBase}/health`);
  if (direct.ok) return;
  const prefixed = await fetch(`${apiBase}/api/health`);
  if (!prefixed.ok) {
    throw new Error(`API health failed: ${prefixed.status} ${prefixed.statusText}`);
  }
}

async function main() {
  await assertApiHealth();

  const categoriesRes = await assertOk(`${apiBase}/api/categories`, "Categories");
  const categories = await categoriesRes.json();
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("No categories returned by API");
  }

  let categoryName = categories[0].name;
  let venuesRes = await assertOk(
    `${apiBase}/api/venues?category=${encodeURIComponent(categoryName)}`,
    "Category venues"
  );
  let venues = await venuesRes.json();

  if (!Array.isArray(venues) || venues.length === 0) {
    if (readOnlyMode) {
      await assertOk(`${webBase}/catalog`, "Web catalog route");
      console.log("Smoke OK (read-only):");
      console.log("- no venues yet, data creation skipped");
      console.log("- checked routes: /catalog");
      return;
    }

    const stamp = Date.now();
    const register = await fetch(`${apiBase}/api/owner/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Owner",
        email: `smoke_catalog_${stamp}@example.com`,
        password: "password123"
      })
    });
    if (!register.ok) throw new Error("Failed to register owner for empty store");
    const owner = (await register.json()).owner;

    const checkout = await fetch(`${apiBase}/api/owner/subscription/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: owner.id })
    });
    if (!checkout.ok) throw new Error("Failed to activate owner subscription");

    const createVenue = await fetch(`${apiBase}/api/owner/venues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerId: owner.id,
        title: "Smoke Venue Catalog",
        region: "Республика Коми",
        city: "Ухта",
        address: "Ухта, ул. Тестовая, 1",
        category: categoryName,
        capacity: 80,
        areaSqm: 150,
        pricePerHour: 5000,
        description: "Smoke venue for catalog flow in empty data store",
        amenities: ["Wi-Fi", "Проектор", "Звук", "Парковка"],
        images: [
          "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80"
        ]
      })
    });
    if (!createVenue.ok) throw new Error("Failed to create smoke venue for catalog flow");

    venuesRes = await assertOk(
      `${apiBase}/api/venues?category=${encodeURIComponent(categoryName)}`,
      "Category venues after seed"
    );
    venues = await venuesRes.json();
    if (!Array.isArray(venues) || venues.length === 0) {
      throw new Error(`No venues for category after seed: ${categoryName}`);
    }
  }

  const categorySlug = categoryToSlug(categoryName);
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
