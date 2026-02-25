const apiBase = (process.env.API_BASE_URL || "http://localhost:8090").replace(/\/+$/, "");
const webBase = (process.env.WEB_BASE_URL || "http://localhost:4173").replace(/\/+$/, "");

function categoryToSlug(value) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, "-"));
}

async function assertOk(url, label) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label} failed: ${res.status} ${res.statusText}`);
  return res;
}

async function jsonFetch(url, init = {}) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function ensureVenue() {
  const categories = await assertOk(`${apiBase}/api/categories`, "categories").then((res) => res.json());
  assert(Array.isArray(categories) && categories.length > 0, "No categories");
  const categoryName = categories[0].name;

  let venues = await assertOk(`${apiBase}/api/venues?category=${encodeURIComponent(categoryName)}`, "category venues").then((res) => res.json());
  if (Array.isArray(venues) && venues.length > 0) return { categoryName, venue: venues[0] };

  const stamp = Date.now();
  const register = await jsonFetch(`${apiBase}/api/owner/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Owner",
      email: `e2e_${stamp}@example.com`,
      password: "password123",
    }),
  });
  assert(register.ok, "Owner register failed");
  const ownerId = register.data.owner.id;

  const create = await jsonFetch(`${apiBase}/api/owner/venues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerId,
      title: "E2E Seed Venue",
      region: "Москва",
      city: "Москва",
      address: "Москва, Тестовая, 7",
      category: categoryName,
      capacity: 90,
      areaSqm: 160,
      pricePerHour: 7000,
      description: "E2E seed venue for critical route checks",
      amenities: ["Wi-Fi", "Проектор", "Парковка", "Звук"],
      images: [
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80",
      ],
    }),
  });
  assert(create.ok, "Seed venue creation failed");
  venues = [create.data];
  return { categoryName, venue: venues[0] };
}

async function runOwnerCrudFlow() {
  const stamp = Date.now();
  const email = `owner_flow_${stamp}@example.com`;
  const password = "password123";
  const name = "Owner Flow";

  const register = await jsonFetch(`${apiBase}/api/owner/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  assert(register.ok, "Owner flow register failed");
  const ownerId = register.data.owner.id;

  const login = await jsonFetch(`${apiBase}/api/owner/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert(login.ok, "Owner flow login failed");

  const createVenue = await jsonFetch(`${apiBase}/api/owner/venues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerId,
      title: "Owner CRUD Venue",
      region: "Санкт-Петербург",
      city: "Санкт-Петербург",
      address: "Невский проспект, 1",
      category: "Лофт",
      capacity: 70,
      areaSqm: 130,
      pricePerHour: 6500,
      description: "Owner CRUD venue description long enough for validation",
      amenities: ["Wi-Fi", "Проектор", "Парковка", "Звук"],
      images: [
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80",
      ],
    }),
  });
  assert(createVenue.ok, "Owner flow create venue failed");
  const venueId = createVenue.data.id;

  const updateVenue = await jsonFetch(`${apiBase}/api/owner/venues/${encodeURIComponent(venueId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...createVenue.data,
      ownerId,
      title: "Owner CRUD Venue Updated",
      images: createVenue.data.images,
    }),
  });
  assert(updateVenue.ok, "Owner flow update venue failed");

  const list = await jsonFetch(`${apiBase}/api/owner/venues?ownerId=${encodeURIComponent(ownerId)}`);
  assert(list.ok, "Owner flow list venues failed");
  assert(Array.isArray(list.data) && list.data.some((item) => item.id === venueId), "Created venue missing in owner list");

  const remove = await jsonFetch(`${apiBase}/api/owner/venues/${encodeURIComponent(venueId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId }),
  });
  assert(remove.ok, "Owner flow delete venue failed");
}

async function main() {
  await assertOk(`${apiBase}/health`, "API health");
  await assertOk(`${webBase}/`, "Web home");
  await assertOk(`${webBase}/catalog`, "Web catalog");

  const { categoryName, venue } = await ensureVenue();
  const categorySlug = categoryToSlug(categoryName);

  await assertOk(`${webBase}/category/${categorySlug}`, "Web category");
  await assertOk(`${webBase}/venue/${encodeURIComponent(venue.id)}`, "Web venue page");
  await assertOk(`${apiBase}/api/venues/${encodeURIComponent(venue.id)}`, "API venue details");

  const support = await jsonFetch(`${apiBase}/api/support/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Support",
      phone: "+79991234567",
      message: `E2E support ping ${Date.now()}`,
      page: "/catalog",
    }),
  });
  assert([201, 503].includes(support.status), `Support flow unexpected status: ${support.status}`);

  await runOwnerCrudFlow();

  console.log("E2E critical OK:");
  console.log(`- category route: /category/${categorySlug}`);
  console.log(`- venue route: /venue/${venue.id}`);
  console.log(`- support status: ${support.status}`);
  console.log("- owner CRUD flow completed");
}

main().catch((error) => {
  console.error("E2E critical FAIL:", error.message);
  process.exit(1);
});
