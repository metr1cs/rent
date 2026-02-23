import cors from "cors";
import express from "express";
import { z } from "zod";
import { categories, leadRequests, owners, recalculateVenueRating, reviews, venues } from "./data.js";

const app = express();
const port = Number(process.env.PORT ?? 8090);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vmestoru-api" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "vmestoru-api" });
});

app.get("/api/categories", (_req, res) => {
  res.json(categories);
});

app.get("/api/home/featured-categories", (_req, res) => {
  const payload = categories
    .filter((item) => item.featured)
    .map((category) => ({
      ...category,
      venues: venues
        .filter((venue) => venue.category === category.name)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 12)
    }));

  res.json(payload);
});

const venueQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  region: z.string().optional(),
  date: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  sort: z.enum(["recommended", "price_asc", "price_desc", "rating_desc"]).optional()
});

app.get("/api/venues", (req, res) => {
  const parsed = venueQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query" });
  }

  const { q, category, region, date, capacity, sort } = parsed.data;

  const filtered = venues.filter((venue) => {
    const qPass = q
      ? `${venue.title} ${venue.description} ${venue.category}`.toLowerCase().includes(q.toLowerCase())
      : true;
    const categoryPass = category ? venue.category === category : true;
    const regionPass = region ? venue.region === region : true;
    const datePass = date ? venue.nextAvailableDates.includes(date) : true;
    const capacityPass = capacity ? venue.capacity >= capacity : true;

    return qPass && categoryPass && regionPass && datePass && capacityPass;
  });

  const sorted = [...filtered];
  if (sort === "price_asc") sorted.sort((a, b) => a.pricePerHour - b.pricePerHour);
  if (sort === "price_desc") sorted.sort((a, b) => b.pricePerHour - a.pricePerHour);
  if (sort === "rating_desc") sorted.sort((a, b) => b.rating - a.rating);
  if (!sort || sort === "recommended") sorted.sort((a, b) => b.rating * 1.2 + b.reviewsCount * 0.02 - (a.rating * 1.2 + a.reviewsCount * 0.02));

  return res.json(sorted);
});

app.get("/api/venues/:id", (req, res) => {
  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });
  return res.json(venue);
});

app.get("/api/venues/:id/reviews", (req, res) => {
  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });

  const venueReviews = reviews.filter((item) => item.venueId === venue.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json(venueReviews);
});

const reviewSchema = z.object({
  author: z.string().min(2),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(4).max(600)
});

app.post("/api/venues/:id/reviews", (req, res) => {
  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid review payload" });

  const created = {
    id: `R-${reviews.length + 1}`,
    venueId: venue.id,
    createdAt: new Date().toISOString().slice(0, 10),
    ...parsed.data
  };

  reviews.push(created);
  recalculateVenueRating(venue.id);
  return res.status(201).json(created);
});

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  comment: z.string().max(800).default("")
});

app.post("/api/venues/:id/requests", (req, res) => {
  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });

  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request payload" });

  const created = {
    id: `L-${leadRequests.length + 1}`,
    venueId: venue.id,
    createdAt: new Date().toISOString(),
    ...parsed.data
  };

  leadRequests.push(created);
  return res.status(201).json({ message: "Заявка отправлена арендодателю", request: created });
});

const ownerRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

app.post("/api/owner/register", (req, res) => {
  const parsed = ownerRegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid owner payload" });

  if (owners.some((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase())) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const owner = {
    id: `O-${owners.length + 1}`,
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    subscriptionStatus: "inactive" as const,
    subscriptionPlan: "monthly_2000" as const,
    nextBillingDate: null
  };

  owners.push(owner);
  return res.status(201).json({ owner: { ...owner, password: undefined } });
});

const ownerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

app.post("/api/owner/login", (req, res) => {
  const parsed = ownerLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid login payload" });

  const owner = owners.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase() && item.password === parsed.data.password);
  if (!owner) return res.status(401).json({ message: "Invalid credentials" });

  return res.json({ owner: { ...owner, password: undefined } });
});

const ownerSubscriptionSchema = z.object({ ownerId: z.string().min(2) });

app.post("/api/owner/subscription/checkout", (req, res) => {
  const parsed = ownerSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid subscription payload" });

  const owner = owners.find((item) => item.id === parsed.data.ownerId);
  if (!owner) return res.status(404).json({ message: "Owner not found" });

  owner.subscriptionStatus = "active";
  owner.nextBillingDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  return res.json({
    message: "Подписка активирована",
    ownerId: owner.id,
    amountRub: 2000,
    periodDays: 30,
    nextBillingDate: owner.nextBillingDate,
    paymentMode: "mock"
  });
});

app.get("/api/owner/subscription/status", (req, res) => {
  const ownerId = String(req.query.ownerId ?? "");
  const owner = owners.find((item) => item.id === ownerId);
  if (!owner) return res.status(404).json({ message: "Owner not found" });

  return res.json({
    ownerId: owner.id,
    status: owner.subscriptionStatus,
    nextBillingDate: owner.nextBillingDate,
    plan: owner.subscriptionPlan,
    amountRub: 2000
  });
});

const ownerVenueSchema = z.object({
  ownerId: z.string().min(2),
  title: z.string().min(2),
  region: z.string().min(2),
  city: z.string().min(2),
  address: z.string().min(2),
  category: z.string().min(2),
  capacity: z.number().int().positive(),
  pricePerHour: z.number().int().positive(),
  description: z.string().min(10),
  amenities: z.array(z.string().min(2)),
  images: z.array(z.string().url()).min(1)
});

app.get("/api/owner/venues", (req, res) => {
  const ownerId = String(req.query.ownerId ?? "");
  return res.json(venues.filter((item) => item.ownerId === ownerId));
});

app.post("/api/owner/venues", (req, res) => {
  const parsed = ownerVenueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid venue payload" });

  const owner = owners.find((item) => item.id === parsed.data.ownerId);
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  if (owner.subscriptionStatus !== "active") return res.status(402).json({ message: "Subscription required: 2000 RUB / 30 days" });

  const created = {
    id: `V-OWN-${venues.length + 1}`,
    ...parsed.data,
    nextAvailableDates: [new Date(Date.now() + 86400000).toISOString().slice(0, 10)],
    rating: 0,
    reviewsCount: 0,
    instantBooking: false,
    metroMinutes: 10,
    cancellationPolicy: "Бесплатная отмена за 48 часов",
    phone: "+7 (999) 000-00-00"
  };

  venues.push(created);
  return res.status(201).json(created);
});

const aiSearchSchema = z.object({ query: z.string().min(3) });

function aiExtractFilters(query: string): { category?: string; region?: string; capacity?: number; priceMax?: number } {
  const lowered = query.toLowerCase();

  const category = categories.find((item) => lowered.includes(item.name.toLowerCase().split(" ")[0]))?.name;
  const region = ["москва", "санкт-петербург", "казань", "екатеринбург", "новосибирск"].find((city) => lowered.includes(city));

  const guestsMatch = lowered.match(/(\d{2,3})\s*(гостей|человек)/);
  const budgetMatch = lowered.match(/до\s*(\d{3,6})/);

  return {
    category,
    region: region ? region[0].toUpperCase() + region.slice(1) : undefined,
    capacity: guestsMatch ? Number(guestsMatch[1]) : undefined,
    priceMax: budgetMatch ? Number(budgetMatch[1]) : undefined,
  };
}

app.post("/api/ai/search", (req, res) => {
  const parsed = aiSearchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid ai search payload" });

  const filters = aiExtractFilters(parsed.data.query);

  const matched = venues.filter((item) => {
    const categoryPass = filters.category ? item.category === filters.category : true;
    const regionPass = filters.region ? item.region === filters.region : true;
    const capacityPass = filters.capacity ? item.capacity >= filters.capacity : true;
    const pricePass = filters.priceMax ? item.pricePerHour <= filters.priceMax : true;
    return categoryPass && regionPass && capacityPass && pricePass;
  }).slice(0, 20);

  return res.json({
    message: "AI-поиск выполнил подбор по вашему запросу",
    filters,
    venues: matched,
    hints: [
      "Уточните город и дату для более точной выдачи",
      "Добавьте бюджет или количество гостей"
    ]
  });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
