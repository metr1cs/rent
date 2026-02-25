import "dotenv/config";
import crypto from "node:crypto";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { analyticsEvents, categories, leadRequests, owners, payments, recalculateVenueRating, reviewModerationAudit, reviews, supportRequests, venues } from "./data.js";
import { initDataStore, persistStateSync } from "./persistence.js";

const app = express();
const port = Number(process.env.PORT ?? 8090);
const host = process.env.HOST;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
const telegramChatId = process.env.TELEGRAM_CHAT_ID ?? "";
const supportTelegramChatId = process.env.SUPPORT_TELEGRAM_CHAT_ID ?? telegramChatId;
const adminNotifyKey = process.env.ADMIN_NOTIFY_KEY ?? "";
const adminPanelLogin = process.env.ADMIN_PANEL_LOGIN ?? "Kaktyz12";
const adminPanelPassword = process.env.ADMIN_PANEL_PASSWORD ?? "DontPussy1221";
const autoBillingNotifierEnabled = process.env.AUTO_BILLING_NOTIFIER === "true";
const billingNotifierIntervalMinutes = Number(process.env.BILLING_NOTIFIER_INTERVAL_MINUTES ?? 60);
const reminderSendRegistry = new Set<string>();
const adminSessions = new Map<string, { moderator: string; expiresAt: number }>();
const adminSessionTtlMs = 8 * 60 * 60 * 1000;

type FrontendErrorEvent = {
  id: string;
  path: string;
  message: string;
  source?: string;
  createdAt: string;
};

const monitoringState = {
  startedAt: new Date().toISOString(),
  requestsTotal: 0,
  statusBuckets: {
    s2xx: 0,
    s4xx: 0,
    s5xx: 0,
  },
  requestLatenciesMs: [] as number[],
  endpoint5xx: {} as Record<string, number>,
  support: {
    success: 0,
    failed: 0,
  },
  telegram: {
    success: 0,
    failed: 0,
  },
  frontendErrors: [] as FrontendErrorEvent[],
};

function pushLatencySample(value: number): void {
  monitoringState.requestLatenciesMs.push(value);
  if (monitoringState.requestLatenciesMs.length > 1200) monitoringState.requestLatenciesMs.shift();
}

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)));
  return sorted[index];
}

function safeEndpointKey(pathname: string): string {
  return pathname.replace(/[0-9]+/g, ":id");
}

app.use(cors());
app.use(express.json({ limit: "70mb" }));
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    const elapsed = Date.now() - started;
    monitoringState.requestsTotal += 1;
    pushLatencySample(elapsed);

    if (res.statusCode >= 500) {
      monitoringState.statusBuckets.s5xx += 1;
      const key = safeEndpointKey(req.path);
      monitoringState.endpoint5xx[key] = (monitoringState.endpoint5xx[key] ?? 0) + 1;
    } else if (res.statusCode >= 400) {
      monitoringState.statusBuckets.s4xx += 1;
    } else {
      monitoringState.statusBuckets.s2xx += 1;
    }
  });
  next();
});

app.use((error: unknown, _req: Request, res: Response, next: () => void) => {
  const payload = error as { type?: string };
  if (payload?.type === "entity.too.large") {
    return res.status(413).json({ message: "Файлы слишком большие. Уменьшите размер фото (до 8 МБ каждое)." });
  }
  next();
});
initDataStore();

function normalizeVenueArea(): void {
  let updated = false;
  venues.forEach((venue) => {
    const raw = (venue as { areaSqm?: unknown }).areaSqm;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return;
    const fallback = Math.max(10, Math.round((venue.capacity || 20) * 1.5));
    (venue as { areaSqm: number }).areaSqm = fallback;
    updated = true;
  });
  if (updated) persistStateSync();
}

normalizeVenueArea();

function normalizeVenuePublication(): void {
  let updated = false;
  venues.forEach((venue) => {
    if (typeof venue.isPublished === "boolean") return;
    venue.isPublished = true;
    updated = true;
  });
  if (updated) persistStateSync();
}

normalizeVenuePublication();

function isVenuePublished(venue: { isPublished?: boolean }): boolean {
  return venue.isPublished !== false;
}

function requireAdmin(req: Request, res: Response): string | null {
  const sessionToken = String(req.headers["x-admin-session"] ?? "");
  if (sessionToken) {
    const session = adminSessions.get(sessionToken);
    if (session && session.expiresAt > Date.now()) return session.moderator;
  }
  const key = String(req.headers["x-admin-key"] ?? "");
  if (adminNotifyKey && key === adminNotifyKey) return "admin-key";
  res.status(403).json({ message: "Forbidden" });
  return null;
}

async function sendTelegramNotification(text: string, chatIdOverride?: string): Promise<void> {
  const targetChatId = (chatIdOverride ?? telegramChatId).trim();
  if (!telegramBotToken || !targetChatId) {
    monitoringState.telegram.failed += 1;
    return;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        disable_web_page_preview: true
      })
    });
    if (response.ok) {
      monitoringState.telegram.success += 1;
    } else {
      monitoringState.telegram.failed += 1;
    }
  } catch (error) {
    monitoringState.telegram.failed += 1;
    console.error("Telegram notify failed", error);
  }
}

function startOfDayStamp(dateString: string): number {
  return new Date(`${dateString}T00:00:00`).getTime();
}

function todayStamp(): number {
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return current.getTime();
}

function billingDaysDiff(targetDate: string): number {
  return Math.floor((startOfDayStamp(targetDate) - todayStamp()) / 86400000);
}

function addDaysIso(base: Date, days: number): string {
  return new Date(base.getTime() + days * 86400000).toISOString().slice(0, 10);
}

function ensureOwnerAccessState(ownerId: string): void {
  const owner = owners.find((item) => item.id === ownerId);
  if (!owner) return;

  const createdAt = owner.createdAt || new Date().toISOString();
  owner.createdAt = createdAt;
  owner.trialEndsAt = owner.trialEndsAt || addDaysIso(new Date(createdAt), 90);
  owner.trialStatus = billingDaysDiff(owner.trialEndsAt) >= 0 ? "active" : "expired";

  if (owner.nextBillingDate) {
    const daysDiff = billingDaysDiff(owner.nextBillingDate);
    if (daysDiff < 0 && owner.subscriptionStatus !== "inactive") {
      owner.subscriptionStatus = "inactive";
    }
  }
}

function canOwnerPublish(ownerId: string): boolean {
  ensureOwnerAccessState(ownerId);
  const owner = owners.find((item) => item.id === ownerId);
  if (!owner) return false;
  return owner.trialStatus === "active" || owner.subscriptionStatus === "active";
}

function ensureOwnerBillingStatus(ownerId: string): void {
  const snapshot = JSON.stringify(owners.find((item) => item.id === ownerId));
  ensureOwnerAccessState(ownerId);
  if (JSON.stringify(owners.find((item) => item.id === ownerId)) !== snapshot) persistStateSync();
}

function computeDebtors() {
  return owners
    .filter((owner) => Boolean(owner.nextBillingDate))
    .map((owner) => {
      const daysDiff = billingDaysDiff(owner.nextBillingDate!);
      return {
        owner,
        daysDiff
      };
    })
    .filter((item) => item.daysDiff < 0)
    .map((item) => ({
      ownerId: item.owner.id,
      name: item.owner.name,
      email: item.owner.email,
      nextBillingDate: item.owner.nextBillingDate!,
      daysOverdue: Math.abs(item.daysDiff),
      amountDueRub: 2000
    }));
}

function trackEvent(
  event:
    | "home_view"
    | "catalog_view"
    | "category_open"
    | "category_filter_apply"
    | "venue_view"
    | "lead_submit"
    | "owner_register"
    | "owner_login",
  meta: Record<string, string | number | boolean>
): void {
  analyticsEvents.push({
    id: `E-${analyticsEvents.length + 1}`,
    event,
    createdAt: new Date().toISOString(),
    meta
  });
  persistStateSync();
}

function runBillingReminderDispatch(): { sent: number; reminders3Days: number; reminders1Day: number; debtors: number } {
  owners.forEach((item) => ensureOwnerBillingStatus(item.id));

  let sent = 0;
  let reminders3Days = 0;
  let reminders1Day = 0;
  let debtors = 0;

  owners.forEach((owner) => {
    if (!owner.nextBillingDate) return;
    const daysDiff = billingDaysDiff(owner.nextBillingDate);

    if (daysDiff === 3 || daysDiff === 1) {
      const key = `${owner.id}:${owner.nextBillingDate}:${daysDiff}`;
      if (!reminderSendRegistry.has(key)) {
        reminderSendRegistry.add(key);
        sent += 1;
        if (daysDiff === 3) reminders3Days += 1;
        if (daysDiff === 1) reminders1Day += 1;
        void sendTelegramNotification(
          [
            "Напоминание об оплате",
            `Арендодатель: ${owner.name}`,
            `Email: ${owner.email}`,
            `До продления: ${daysDiff} ${daysDiff === 1 ? "день" : "дня"}`,
            "Сумма: 2000 ₽",
            `Дата оплаты: ${owner.nextBillingDate}`
          ].join("\n")
        );
      }
    }

    if (daysDiff < 0) debtors += 1;
  });

  const debtorRows = computeDebtors();
  debtorRows.forEach((debtor) => {
    const key = `${debtor.ownerId}:${debtor.nextBillingDate}:overdue`;
    if (!reminderSendRegistry.has(key)) {
      reminderSendRegistry.add(key);
      sent += 1;
      void sendTelegramNotification(
        [
          "Должник по подписке",
          `Имя: ${debtor.name}`,
          `Email: ${debtor.email}`,
          `Просрочка: ${debtor.daysOverdue} дн.`,
          `К оплате: ${debtor.amountDueRub} ₽`,
          `Плановая дата оплаты: ${debtor.nextBillingDate}`
        ].join("\n")
      );
    }
  });

  return { sent, reminders3Days, reminders1Day, debtors };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vmestoru-api" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "vmestoru-api" });
});

app.get("/api/categories", (_req, res) => {
  res.json(categories);
});

app.post("/api/analytics/event", (req, res) => {
  const schema = z.object({
    event: z.enum(["home_view", "catalog_view", "category_open", "category_filter_apply", "venue_view", "lead_submit", "owner_register", "owner_login"]),
    meta: z.record(z.union([z.string(), z.number(), z.boolean()])).default({})
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid event payload" });
  trackEvent(parsed.data.event, parsed.data.meta);
  return res.status(201).json({ ok: true });
});

const adminAuthSchema = z.object({
  accessKey: z.string().min(4).optional(),
  login: z.string().min(3).max(80).optional(),
  password: z.string().min(6).max(160).optional(),
  moderator: z.string().min(2).max(80).optional()
});

app.post("/api/admin/auth", (req, res) => {
  const parsed = adminAuthSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid auth payload" });

  const byKey = Boolean(adminNotifyKey) && parsed.data.accessKey === adminNotifyKey;
  const byLoginPassword = parsed.data.login === adminPanelLogin && parsed.data.password === adminPanelPassword;
  if (!byKey && !byLoginPassword) return res.status(403).json({ message: "Forbidden" });

  const token = crypto.randomBytes(24).toString("hex");
  const moderator = parsed.data.moderator ?? "admin";
  const expiresAt = Date.now() + adminSessionTtlMs;
  adminSessions.set(token, { moderator, expiresAt });
  return res.status(201).json({
    token,
    moderator,
    expiresAt: new Date(expiresAt).toISOString()
  });
});

app.get("/api/admin/session", (req, res) => {
  const sessionToken = String(req.headers["x-admin-session"] ?? "");
  const session = sessionToken ? adminSessions.get(sessionToken) : null;
  if (!session || session.expiresAt <= Date.now()) return res.status(403).json({ message: "Forbidden" });
  return res.json({ moderator: session.moderator, expiresAt: new Date(session.expiresAt).toISOString() });
});

app.get("/api/admin/analytics/funnel", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const counts = {
    homeView: analyticsEvents.filter((item) => item.event === "home_view").length,
    catalogView: analyticsEvents.filter((item) => item.event === "catalog_view").length,
    categoryOpen: analyticsEvents.filter((item) => item.event === "category_open").length,
    categoryFilterApply: analyticsEvents.filter((item) => item.event === "category_filter_apply").length,
    venueView: analyticsEvents.filter((item) => item.event === "venue_view").length,
    leadSubmit: analyticsEvents.filter((item) => item.event === "lead_submit").length,
    ownerRegister: analyticsEvents.filter((item) => item.event === "owner_register").length,
    ownerLogin: analyticsEvents.filter((item) => item.event === "owner_login").length
  };

  return res.json({
    counts,
    conversion: {
      catalogToCategory: counts.catalogView ? Number(((counts.categoryOpen / counts.catalogView) * 100).toFixed(1)) : 0,
      categoryToVenue: counts.categoryOpen ? Number(((counts.venueView / counts.categoryOpen) * 100).toFixed(1)) : 0,
      homeToVenue: counts.homeView ? Number(((counts.venueView / counts.homeView) * 100).toFixed(1)) : 0,
      venueToLead: counts.venueView ? Number(((counts.leadSubmit / counts.venueView) * 100).toFixed(1)) : 0
    }
  });
});

app.get("/api/admin/ops/readiness", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const checks = {
    qaSmokeConfigured: true,
    reviewModerationEnabled: true,
    telegramNotificationsReady: Boolean(telegramBotToken && telegramChatId),
    legalCheckpointEnabled: true,
    supportEscalationMatrixReady: true,
    paymentMode: "mock" as const,
  };
  const blockedBy = checks.paymentMode === "mock" ? ["real_acquiring_not_enabled"] : [];

  return res.json({
    readyForProduction: blockedBy.length === 0,
    checks,
    blockedBy,
    recommendations: [
      "Enable real acquiring before public launch",
      "Keep review moderation queue below 24h SLA",
      "Review legal disclosures each release"
    ]
  });
});

app.get("/api/admin/ops/alerts", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const latencies = monitoringState.requestLatenciesMs;
  const p95 = percentile(latencies, 0.95);
  const p99 = percentile(latencies, 0.99);
  const total = monitoringState.requestsTotal || 1;
  const errorRate5xx = Number(((monitoringState.statusBuckets.s5xx / total) * 100).toFixed(2));
  const supportTotal = monitoringState.support.success + monitoringState.support.failed;
  const supportFailureRate = supportTotal ? Number(((monitoringState.support.failed / supportTotal) * 100).toFixed(2)) : 0;

  const alerts = [
    errorRate5xx > 2 ? `Высокий 5xx rate: ${errorRate5xx}%` : "",
    p95 > 1200 ? `Высокая latency p95: ${p95} ms` : "",
    supportFailureRate > 5 ? `Высокий fail-rate поддержки: ${supportFailureRate}%` : "",
    monitoringState.telegram.failed > monitoringState.telegram.success ? "Telegram failures превышают success" : "",
  ].filter(Boolean);

  const top5xxEndpoints = Object.entries(monitoringState.endpoint5xx)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return res.json({
    startedAt: monitoringState.startedAt,
    requests: {
      total: monitoringState.requestsTotal,
      statusBuckets: monitoringState.statusBuckets,
      errorRate5xx,
      latencyMs: {
        p95,
        p99,
      },
      top5xxEndpoints,
    },
    support: monitoringState.support,
    telegram: monitoringState.telegram,
    frontendErrors: monitoringState.frontendErrors.slice(-30).reverse(),
    alerts,
  });
});

app.get("/api/home/featured-categories", (_req, res) => {
  const payload = categories
    .filter((item) => item.featured)
    .map((category) => ({
      ...category,
      venues: venues
        .filter((venue) => venue.category === category.name && isVenuePublished(venue))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 8)
    }));

  res.json(payload);
});

const venueQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  region: z.string().optional(),
  date: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  areaMin: z.coerce.number().int().positive().optional(),
  priceMax: z.coerce.number().int().positive().optional(),
  sort: z.enum(["recommended", "price_asc", "price_desc", "rating_desc"]).optional(),
  parking: z.coerce.boolean().optional(),
  stage: z.coerce.boolean().optional(),
  late: z.coerce.boolean().optional(),
  instant: z.coerce.boolean().optional(),
});

app.get("/api/venues", (req, res) => {
  const parsed = venueQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query" });
  }

  const { q, category, region, date, capacity, areaMin, priceMax, sort, parking, stage, late, instant } = parsed.data;

  const filtered = venues.filter((venue) => {
    const publishedPass = isVenuePublished(venue);
    const qPass = q
      ? `${venue.title} ${venue.description} ${venue.category}`.toLowerCase().includes(q.toLowerCase())
      : true;
    const categoryPass = category ? venue.category === category : true;
    const regionPass = region ? venue.region === region : true;
    const datePass = date ? venue.nextAvailableDates.includes(date) : true;
    const capacityPass = capacity ? venue.capacity >= capacity : true;
    const areaPass = areaMin ? venue.areaSqm >= areaMin : true;
    const pricePass = priceMax ? venue.pricePerHour <= priceMax : true;
    const parkingPass = parking ? venue.amenities.includes("Парковка") : true;
    const stagePass = stage ? venue.amenities.includes("Сцена") : true;
    const latePass = late ? venue.cancellationPolicy.toLowerCase().includes("72") : true;
    const instantPass = instant ? venue.instantBooking : true;

    return publishedPass && qPass && categoryPass && regionPass && datePass && capacityPass && areaPass && pricePass && parkingPass && stagePass && latePass && instantPass;
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
  if (!isVenuePublished(venue)) return res.status(404).json({ message: "Venue not found" });
  trackEvent("venue_view", { venueId: venue.id, region: venue.region, category: venue.category });
  return res.json(venue);
});

app.get("/api/venues/:id/similar", (req, res) => {
  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });

  const similar = venues
    .filter((item) => item.id !== venue.id && isVenuePublished(item))
    .map((item) => {
      let score = 0;
      if (item.category === venue.category) score += 3;
      if (item.region === venue.region) score += 2;
      const ratio = Math.min(item.pricePerHour, venue.pricePerHour) / Math.max(item.pricePerHour, venue.pricePerHour);
      score += ratio;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((row) => row.item);

  return res.json(similar);
});

app.get("/api/venues/:id/reviews", (req, res) => {
  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });

  const venueReviews = reviews
    .filter((item) => item.venueId === venue.id && item.status === "published")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json(venueReviews);
});

const reviewSchema = z.object({
  author: z.string().min(2),
  requesterName: z.string().min(2),
  requesterPhone: z.string().min(6),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(4).max(600)
});

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function evaluateReviewRisk(venueId: string, payload: { rating: number; text: string; requesterName: string; requesterPhone: string }): { riskScore: number; riskFlags: string[] } {
  let riskScore = 0;
  const riskFlags: string[] = [];

  if (payload.rating <= 1 || payload.rating >= 5) {
    riskScore += 10;
    riskFlags.push("extreme_rating");
  }
  if (payload.text.trim().length < 20) {
    riskScore += 20;
    riskFlags.push("very_short_text");
  }
  const suspiciousWords = ["обман", "мошенник", "развод", "конкурент"];
  if (suspiciousWords.some((item) => payload.text.toLowerCase().includes(item))) {
    riskScore += 20;
    riskFlags.push("suspicious_keywords");
  }

  const normalizedPhone = normalizePhone(payload.requesterPhone);
  const duplicateByVenue = reviews.some(
    (item) =>
      item.venueId === venueId &&
      normalizePhone(item.requesterPhone) === normalizedPhone &&
      item.requesterName.toLowerCase() === payload.requesterName.toLowerCase()
  );
  if (duplicateByVenue) {
    riskScore += 60;
    riskFlags.push("duplicate_reviewer_for_venue");
  }

  const sameReviewerWindow = reviews.filter((item) => {
    if (normalizePhone(item.requesterPhone) !== normalizedPhone) return false;
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    return ageMs < 24 * 60 * 60 * 1000;
  });
  if (sameReviewerWindow.length >= 3) {
    riskScore += 40;
    riskFlags.push("high_frequency_24h");
  }

  return { riskScore: Math.min(100, riskScore), riskFlags };
}

app.post("/api/venues/:id/reviews", (req, res) => {
  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid review payload" });

  const confirmedLead = leadRequests.find(
    (item) =>
      item.venueId === venue.id &&
      item.status === "confirmed" &&
      item.name.toLowerCase() === parsed.data.requesterName.toLowerCase() &&
      normalizePhone(item.phone) === normalizePhone(parsed.data.requesterPhone)
  );
  if (!confirmedLead) {
    return res.status(403).json({
      message: "Отзыв доступен только после подтвержденной заявки на площадку"
    });
  }

  const risk = evaluateReviewRisk(venue.id, parsed.data);
  const status: "pending" | "published" = risk.riskScore >= 60 ? "pending" : "published";
  const created = {
    id: `R-${reviews.length + 1}`,
    venueId: venue.id,
    createdAt: new Date().toISOString(),
    ...parsed.data,
    sourceLeadRequestId: confirmedLead.id,
    verified: true,
    status,
    riskScore: risk.riskScore,
    riskFlags: risk.riskFlags
  };

  reviews.push(created);
  recalculateVenueRating(venue.id);
  persistStateSync();
  return res.status(201).json({
    review: created,
    moderation: {
      status,
      riskScore: risk.riskScore,
      riskFlags: risk.riskFlags
    }
  });
});

app.get("/api/admin/reviews", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const status = String(req.query.status ?? "");
  const filtered = status
    ? reviews.filter((item) => item.status === status)
    : reviews;
  return res.json(
    filtered
      .map((item) => ({
        ...item,
        venueTitle: venues.find((venue) => venue.id === item.venueId)?.title ?? "Unknown venue"
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
});

const reviewModerationSchema = z.object({
  status: z.enum(["published", "hidden"]),
  note: z.string().max(400).optional(),
  moderator: z.string().min(2).max(80).optional()
});

app.post("/api/admin/reviews/:id/moderate", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const parsed = reviewModerationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid moderation payload" });

  const review = reviews.find((item) => item.id === req.params.id);
  if (!review) return res.status(404).json({ message: "Review not found" });

  const previousStatus = review.status;
  review.status = parsed.data.status;
  if (parsed.data.note) {
    review.riskFlags = [...review.riskFlags, `moderator_note:${parsed.data.note}`];
  }
  reviewModerationAudit.push({
    id: `RA-${reviewModerationAudit.length + 1}`,
    reviewId: review.id,
    venueId: review.venueId,
    previousStatus,
    nextStatus: parsed.data.status,
    note: parsed.data.note,
    moderator: parsed.data.moderator ?? moderator,
    createdAt: new Date().toISOString()
  });
  recalculateVenueRating(review.venueId);
  persistStateSync();
  return res.json({ message: "Review moderated", review });
});

app.get("/api/admin/reviews/summary", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const pending = reviews.filter((item) => item.status === "pending");
  const published = reviews.filter((item) => item.status === "published");
  const hidden = reviews.filter((item) => item.status === "hidden");
  const highRiskPending = pending.filter((item) => item.riskScore >= 60).length;

  return res.json({
    total: reviews.length,
    pending: pending.length,
    published: published.length,
    hidden: hidden.length,
    highRiskPending,
    avgRiskPending: pending.length
      ? Number((pending.reduce((sum, item) => sum + item.riskScore, 0) / pending.length).toFixed(1))
      : 0,
    recentActions: reviewModerationAudit.slice(-20).reverse()
  });
});

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  comment: z.string().max(800).default("")
});

const supportRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional().default("Пользователь"),
  phone: z.string().trim().min(0).max(60).optional().default("не указан"),
  message: z.string().trim().min(1).max(2000).optional(),
  text: z.string().trim().min(1).max(2000).optional(),
  comment: z.string().trim().min(1).max(2000).optional(),
  page: z.string().max(400).optional()
});

const frontendErrorSchema = z.object({
  path: z.string().max(400),
  message: z.string().max(1500),
  source: z.string().max(120).optional(),
});

app.post("/api/monitor/frontend-error", (req, res) => {
  const parsed = frontendErrorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid frontend error payload" });

  monitoringState.frontendErrors.push({
    id: `FE-${Date.now()}`,
    path: parsed.data.path,
    message: parsed.data.message,
    source: parsed.data.source,
    createdAt: new Date().toISOString(),
  });
  if (monitoringState.frontendErrors.length > 300) monitoringState.frontendErrors.shift();
  return res.status(201).json({ ok: true });
});

app.post("/api/support/requests", (req, res) => {
  const parsed = supportRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Некорректный запрос в поддержку. Проверьте заполнение полей.",
      issues: parsed.error.issues.map((item) => ({ path: item.path.join("."), error: item.message }))
    });
  }
  const normalizedMessage = (parsed.data.message || parsed.data.text || parsed.data.comment || "").trim();
  if (!normalizedMessage) {
    monitoringState.support.failed += 1;
    return res.status(400).json({ message: "Добавьте текст обращения в поддержку." });
  }
  if (!telegramBotToken || !supportTelegramChatId.trim()) {
    monitoringState.support.failed += 1;
    return res.status(503).json({ message: "Канал поддержки временно недоступен. Свяжитесь по номеру +7 (995) 592-62-60." });
  }

  const createdAt = new Date().toISOString();
  const created = {
    id: `SR-${supportRequests.length + 1}`,
    name: parsed.data.name,
    phone: parsed.data.phone,
    message: normalizedMessage,
    page: parsed.data.page || "-",
    status: "new" as const,
    createdAt,
    updatedAt: createdAt
  };
  supportRequests.push(created);
  persistStateSync();

  void sendTelegramNotification(
    [
      "Новый запрос в поддержку",
      `Имя: ${parsed.data.name}`,
      `Телефон: ${parsed.data.phone}`,
      `Страница: ${parsed.data.page || "-"}`,
      `Сообщение: ${normalizedMessage}`,
      `Дата: ${new Date(createdAt).toLocaleString("ru-RU")}`
    ].join("\n"),
    supportTelegramChatId
  );

  monitoringState.support.success += 1;
  return res.status(201).json({ message: "Запрос отправлен в поддержку. Мы свяжемся с вами в ближайшее время.", requestId: created.id });
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
    updatedAt: new Date().toISOString(),
    status: "new" as const,
    ...parsed.data
  };

  leadRequests.push(created);
  trackEvent("lead_submit", { venueId: venue.id, region: venue.region, category: venue.category });
  persistStateSync();
  void sendTelegramNotification(
    [
      "Новая заявка на площадку",
      `Площадка: ${venue.title}`,
      `Имя: ${created.name}`,
      `Телефон: ${created.phone}`,
      `Комментарий: ${created.comment || "-"}`,
      `Дата: ${new Date(created.createdAt).toLocaleString("ru-RU")}`
    ].join("\n")
  );
  return res.status(201).json({ message: "Заявка отправлена арендодателю", request: created });
});

app.get("/api/owner/requests", (req, res) => {
  const ownerId = String(req.query.ownerId ?? "");
  const statusFilter = String(req.query.status ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const sla = String(req.query.sla ?? "");
  if (!ownerId) return res.status(400).json({ message: "ownerId is required" });

  const ownerVenueMap = new Map(
    venues
      .filter((item) => item.ownerId === ownerId)
      .map((item) => [item.id, item] as const)
  );

  const payload = leadRequests
    .filter((item) => ownerVenueMap.has(item.venueId))
    .map((item) => {
      const venue = ownerVenueMap.get(item.venueId)!;
      const ageMinutes = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000);
      return {
        ...item,
        venueTitle: venue.title,
        venueAddress: venue.address,
        responseSlaMinutes: 30,
        ageMinutes,
        isSlaBreached: item.status === "new" && ageMinutes > 30
      };
    })
    .filter((item) => (statusFilter ? item.status === statusFilter : true))
    .filter((item) => (q ? `${item.name} ${item.phone} ${item.venueTitle}`.toLowerCase().includes(q) : true))
    .filter((item) => {
      if (sla === "breached") return item.isSlaBreached;
      if (sla === "ok") return !item.isSlaBreached;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json(payload);
});

const ownerLeadStatusSchema = z.object({
  ownerId: z.string().min(2),
  status: z.enum(["new", "in_progress", "call_scheduled", "confirmed", "rejected"])
});

app.post("/api/owner/requests/:id/status", (req, res) => {
  const parsed = ownerLeadStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status payload" });

  const request = leadRequests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });

  const venue = venues.find((item) => item.id === request.venueId);
  if (!venue || venue.ownerId !== parsed.data.ownerId) return res.status(403).json({ message: "Forbidden" });

  request.status = parsed.data.status;
  request.updatedAt = new Date().toISOString();
  persistStateSync();
  return res.json({ message: "Статус обновлен", request });
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
    createdAt: new Date().toISOString(),
    trialEndsAt: addDaysIso(new Date(), 90),
    trialStatus: "active" as const,
    subscriptionStatus: "inactive" as const,
    subscriptionPlan: "monthly_2000" as const,
    nextBillingDate: null
  };

  owners.push(owner);
  trackEvent("owner_register", { ownerId: owner.id });
  persistStateSync();
  void sendTelegramNotification(
    [
      "Новый арендодатель зарегистрирован",
      `Имя: ${owner.name}`,
      `Email: ${owner.email}`,
      `ID: ${owner.id}`,
      `Дата: ${new Date().toLocaleString("ru-RU")}`
    ].join("\n")
  );
  return res.status(201).json({ owner: { ...owner, password: undefined } });
});

app.post("/api/admin/notify/test", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  void sendTelegramNotification(
    [
      "Тест уведомления VmestoRu",
      `Сервер: vmestoru-api`,
      `Время: ${new Date().toLocaleString("ru-RU")}`
    ].join("\n")
  );
  return res.json({ message: "Тестовое уведомление отправлено" });
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
  ensureOwnerAccessState(owner.id);
  trackEvent("owner_login", { ownerId: owner.id });
  persistStateSync();

  return res.json({ owner: { ...owner, password: undefined } });
});

app.get("/api/owner/profile", (req, res) => {
  const ownerId = String(req.query.ownerId ?? "");
  if (!ownerId) return res.status(400).json({ message: "ownerId is required" });
  const owner = owners.find((item) => item.id === ownerId);
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  ensureOwnerAccessState(owner.id);
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
  payments.push({
    id: `P-${payments.length + 1}`,
    ownerId: owner.id,
    amountRub: 2000,
    periodDays: 30,
    status: "paid",
    paidAt: new Date().toISOString(),
    nextBillingDate: owner.nextBillingDate,
    method: "mock"
  });
  persistStateSync();
  void sendTelegramNotification(
    [
      "Оплата подписки получена",
      `Арендодатель: ${owner.name}`,
      `Email: ${owner.email}`,
      "Сумма: 2000 ₽",
      `Следующее списание: ${owner.nextBillingDate}`
    ].join("\n")
  );

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
  ensureOwnerAccessState(owner.id);
  const daysDiff = owner.nextBillingDate ? billingDaysDiff(owner.nextBillingDate) : null;
  const trialDaysLeft = Math.max(0, billingDaysDiff(owner.trialEndsAt));

  return res.json({
    ownerId: owner.id,
    status: owner.subscriptionStatus,
    trialStatus: owner.trialStatus,
    trialEndsAt: owner.trialEndsAt,
    trialDaysLeft,
    nextBillingDate: owner.nextBillingDate,
    plan: owner.subscriptionPlan,
    amountRub: 2000,
    daysUntilBilling: daysDiff,
    isDebtor: daysDiff !== null ? daysDiff < 0 : false
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
  areaSqm: z.number().int().positive(),
  pricePerHour: z.number().int().positive(),
  description: z.string().min(10),
  amenities: z
    .union([z.array(z.string().min(2)), z.string().min(1)])
    .transform((value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length >= 2)
        : value
    ),
  images: z.array(z.string().url()).min(5)
});

const ownerVenueUpdateSchema = ownerVenueSchema;

app.get("/api/owner/venues", (req, res) => {
  const ownerId = String(req.query.ownerId ?? "");
  return res.json(venues.filter((item) => item.ownerId === ownerId));
});

app.get("/api/owner/dashboard", (req, res) => {
  const ownerId = String(req.query.ownerId ?? "");
  ensureOwnerAccessState(ownerId);
  const owner = owners.find((item) => item.id === ownerId);
  const ownerVenues = venues.filter((item) => item.ownerId === ownerId);
  const ownerVenueIds = new Set(ownerVenues.map((item) => item.id));
  const ownerRequests = leadRequests.filter((item) => ownerVenueIds.has(item.venueId));

  const completeness = ownerVenues.map((venue) => {
    const checks = [
      Boolean(venue.title),
      Boolean(venue.description && venue.description.length >= 20),
      Boolean(venue.address),
      venue.images.length >= 5,
      venue.amenities.length >= 4,
      venue.pricePerHour > 0,
      venue.capacity > 0,
      venue.areaSqm > 0,
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    return {
      venueId: venue.id,
      venueTitle: venue.title,
      score,
      tip: score >= 85 ? "Карточка заполнена хорошо" : "Добавьте больше фото и деталей для роста конверсии"
    };
  });

  const statusCounts = {
    new: ownerRequests.filter((item) => item.status === "new").length,
    in_progress: ownerRequests.filter((item) => item.status === "in_progress").length,
    call_scheduled: ownerRequests.filter((item) => item.status === "call_scheduled").length,
    confirmed: ownerRequests.filter((item) => item.status === "confirmed").length,
    rejected: ownerRequests.filter((item) => item.status === "rejected").length,
  };

  return res.json({
    ownerId,
    trial: owner
      ? {
          status: owner.trialStatus,
          endsAt: owner.trialEndsAt,
          daysLeft: Math.max(0, billingDaysDiff(owner.trialEndsAt))
        }
      : null,
    metrics: {
      venuesTotal: ownerVenues.length,
      leadsTotal: ownerRequests.length,
      confirmedTotal: statusCounts.confirmed,
      conversionRate: ownerRequests.length ? Number(((statusCounts.confirmed / ownerRequests.length) * 100).toFixed(1)) : 0,
      viewsMock: ownerVenues.length * 137 + 420
    },
    statusCounts,
    completeness
  });
});

app.get("/api/admin/billing/overview", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  owners.forEach((item) => ensureOwnerBillingStatus(item.id));
  const debtors = computeDebtors();
  const paidTotal = payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amountRub, 0);

  return res.json({
    metrics: {
      ownersTotal: owners.length,
      activeOwners: owners.filter((item) => item.subscriptionStatus === "active").length,
      debtorsTotal: debtors.length,
      debtAmountRub: debtors.reduce((sum, item) => sum + item.amountDueRub, 0),
      paymentsTotal: payments.length,
      paidTotalRub: paidTotal
    },
    debtors,
    payments: payments.slice(-20).reverse()
  });
});

app.post("/api/admin/billing/notify-debtors", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  owners.forEach((item) => ensureOwnerBillingStatus(item.id));
  const debtors = computeDebtors();
  if (!debtors.length) return res.json({ message: "Должников нет", sent: 0 });

  debtors.forEach((debtor) => {
    void sendTelegramNotification(
      [
        "Должник по подписке",
        `Имя: ${debtor.name}`,
        `Email: ${debtor.email}`,
        `Просрочка: ${debtor.daysOverdue} дн.`,
        `К оплате: ${debtor.amountDueRub} ₽`,
        `Плановая дата оплаты: ${debtor.nextBillingDate}`
      ].join("\n")
    );
  });

  return res.json({
    message: "Уведомления по должникам отправлены",
    sent: debtors.length,
    debtors
  });
});

app.post("/api/admin/billing/reminders/run", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const result = runBillingReminderDispatch();
  return res.json({
    message: "Напоминания и уведомления обработаны",
    ...result
  });
});

app.get("/api/admin/overview", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const publishedVenues = venues.filter((item) => isVenuePublished(item)).length;
  const leadByStatus = {
    new: leadRequests.filter((item) => item.status === "new").length,
    in_progress: leadRequests.filter((item) => item.status === "in_progress").length,
    call_scheduled: leadRequests.filter((item) => item.status === "call_scheduled").length,
    confirmed: leadRequests.filter((item) => item.status === "confirmed").length,
    rejected: leadRequests.filter((item) => item.status === "rejected").length,
  };
  const supportByStatus = {
    new: supportRequests.filter((item) => item.status === "new").length,
    in_progress: supportRequests.filter((item) => item.status === "in_progress").length,
    resolved: supportRequests.filter((item) => item.status === "resolved").length,
    rejected: supportRequests.filter((item) => item.status === "rejected").length,
  };

  return res.json({
    moderator,
    generatedAt: new Date().toISOString(),
    totals: {
      owners: owners.length,
      venues: venues.length,
      publishedVenues,
      hiddenVenues: venues.length - publishedVenues,
      leads: leadRequests.length,
      supportRequests: supportRequests.length,
      reviews: reviews.length,
      pendingReviews: reviews.filter((item) => item.status === "pending").length,
    },
    leads: leadByStatus,
    support: supportByStatus,
  });
});

app.get("/api/admin/owners", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const q = String(req.query.q ?? "").trim().toLowerCase();
  const payload = owners
    .map((owner) => ({
      id: owner.id,
      name: owner.name,
      email: owner.email,
      createdAt: owner.createdAt,
      trialStatus: owner.trialStatus,
      trialEndsAt: owner.trialEndsAt,
      subscriptionStatus: owner.subscriptionStatus,
      nextBillingDate: owner.nextBillingDate,
      venuesCount: venues.filter((venue) => venue.ownerId === owner.id).length,
      leadsCount: leadRequests.filter((lead) => venues.some((venue) => venue.id === lead.venueId && venue.ownerId === owner.id)).length,
    }))
    .filter((owner) => (q ? `${owner.name} ${owner.email}`.toLowerCase().includes(q) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json(payload);
});

const adminOwnerAccessSchema = z.object({
  trialStatus: z.enum(["active", "expired"]).optional(),
  subscriptionStatus: z.enum(["inactive", "active"]).optional(),
});

app.patch("/api/admin/owners/:id/access", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;
  const parsed = adminOwnerAccessSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const owner = owners.find((item) => item.id === req.params.id);
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  if (parsed.data.trialStatus) owner.trialStatus = parsed.data.trialStatus;
  if (parsed.data.subscriptionStatus) owner.subscriptionStatus = parsed.data.subscriptionStatus;
  persistStateSync();
  return res.json({ message: "Доступ арендодателя обновлен", ownerId: owner.id });
});

app.get("/api/admin/venues", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const q = String(req.query.q ?? "").trim().toLowerCase();
  const category = String(req.query.category ?? "");
  const region = String(req.query.region ?? "");
  const published = String(req.query.published ?? "");

  const payload = venues
    .map((venue) => {
      const owner = owners.find((item) => item.id === venue.ownerId);
      return {
        ...venue,
        ownerName: owner?.name ?? "unknown",
        ownerEmail: owner?.email ?? "unknown",
        leadsCount: leadRequests.filter((item) => item.venueId === venue.id).length,
      };
    })
    .filter((venue) => (q ? `${venue.title} ${venue.address} ${venue.ownerName}`.toLowerCase().includes(q) : true))
    .filter((venue) => (category ? venue.category === category : true))
    .filter((venue) => (region ? venue.region === region : true))
    .filter((venue) => {
      if (published === "true") return isVenuePublished(venue);
      if (published === "false") return !isVenuePublished(venue);
      return true;
    })
    .sort((a, b) => b.id.localeCompare(a.id));

  return res.json(payload);
});

const adminVenuePatchSchema = z.object({
  isPublished: z.boolean().optional(),
});

app.patch("/api/admin/venues/:id", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;
  const parsed = adminVenuePatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });

  if (typeof parsed.data.isPublished === "boolean") venue.isPublished = parsed.data.isPublished;
  persistStateSync();
  return res.json({ message: "Площадка обновлена", venueId: venue.id, isPublished: venue.isPublished !== false });
});

app.delete("/api/admin/venues/:id", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const venueIndex = venues.findIndex((item) => item.id === req.params.id);
  if (venueIndex < 0) return res.status(404).json({ message: "Venue not found" });

  venues.splice(venueIndex, 1);
  for (let i = reviews.length - 1; i >= 0; i -= 1) if (reviews[i].venueId === req.params.id) reviews.splice(i, 1);
  for (let i = leadRequests.length - 1; i >= 0; i -= 1) if (leadRequests[i].venueId === req.params.id) leadRequests.splice(i, 1);
  for (let i = reviewModerationAudit.length - 1; i >= 0; i -= 1) if (reviewModerationAudit[i].venueId === req.params.id) reviewModerationAudit.splice(i, 1);
  persistStateSync();
  return res.json({ message: "Площадка удалена администратором" });
});

app.get("/api/admin/requests", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const status = String(req.query.status ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();

  const payload = leadRequests
    .map((request) => {
      const venue = venues.find((item) => item.id === request.venueId);
      const owner = venue ? owners.find((item) => item.id === venue.ownerId) : null;
      return {
        ...request,
        venueTitle: venue?.title ?? "Удаленная площадка",
        venueAddress: venue?.address ?? "-",
        ownerId: venue?.ownerId ?? "-",
        ownerName: owner?.name ?? "-",
      };
    })
    .filter((item) => (status ? item.status === status : true))
    .filter((item) => (q ? `${item.name} ${item.phone} ${item.venueTitle} ${item.ownerName}`.toLowerCase().includes(q) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json(payload);
});

const adminRequestStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "call_scheduled", "confirmed", "rejected"]),
});

app.patch("/api/admin/requests/:id/status", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;
  const parsed = adminRequestStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const request = leadRequests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  request.status = parsed.data.status;
  request.updatedAt = new Date().toISOString();
  persistStateSync();
  return res.json({ message: "Статус заявки обновлен", request });
});

app.get("/api/admin/support", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;

  const status = String(req.query.status ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();

  const payload = supportRequests
    .filter((item) => (status ? item.status === status : true))
    .filter((item) => (q ? `${item.name} ${item.phone} ${item.message} ${item.page}`.toLowerCase().includes(q) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json(payload);
});

const adminSupportPatchSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "rejected"]).optional(),
  assignedTo: z.string().min(1).max(120).optional(),
});

app.patch("/api/admin/support/:id", (req, res) => {
  const moderator = requireAdmin(req, res);
  if (!moderator) return;
  const parsed = adminSupportPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const request = supportRequests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Support request not found" });

  if (parsed.data.status) request.status = parsed.data.status;
  if (parsed.data.assignedTo) request.assignedTo = parsed.data.assignedTo;
  request.updatedAt = new Date().toISOString();
  persistStateSync();
  return res.json({ message: "Обращение поддержки обновлено", request });
});

app.post("/api/owner/venues", (req, res) => {
  const parsed = ownerVenueSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn("owner venue payload invalid", parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code
    })));
    const imageIssue = parsed.error.issues.find((issue) => issue.path.join(".") === "images");
    if (imageIssue) {
      return res.status(400).json({ message: "Нужно добавить минимум 5 фото площадки" });
    }
    const firstIssue = parsed.error.issues[0];
    const fieldName = String(firstIssue?.path?.[0] ?? "");
    const fieldLabels: Record<string, string> = {
      ownerId: "владелец",
      title: "название",
      region: "регион",
      city: "город",
      address: "адрес",
      category: "категория",
      capacity: "вместимость",
      areaSqm: "площадь",
      pricePerHour: "цена",
      description: "описание",
      amenities: "удобства",
      images: "фотографии",
    };
    const label = fieldLabels[fieldName] ?? fieldName;
    return res.status(400).json({ message: `Проверьте поле: ${label}` });
  }

  const owner = owners.find((item) => item.id === parsed.data.ownerId);
  if (!owner) return res.status(404).json({ message: "Owner not found" });
  if (!canOwnerPublish(owner.id)) {
    return res.status(402).json({ message: "Пробный период завершен. Обратитесь в поддержку для продления доступа." });
  }

  const created = {
    id: `V-OWN-${venues.length + 1}`,
    ...parsed.data,
    nextAvailableDates: [new Date(Date.now() + 86400000).toISOString().slice(0, 10)],
    rating: 0,
    reviewsCount: 0,
    isPublished: true,
    instantBooking: false,
    metroMinutes: 10,
    cancellationPolicy: "Бесплатная отмена за 48 часов",
    phone: "+7 (995) 592-62-60"
  };

  venues.push(created);
  persistStateSync();
  return res.status(201).json(created);
});

app.patch("/api/owner/venues/:id", (req, res) => {
  const parsed = ownerVenueUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldName = String(firstIssue?.path?.[0] ?? "");
    return res.status(400).json({ message: `Проверьте поле: ${fieldName || "payload"}` });
  }

  const venue = venues.find((item) => item.id === req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });
  if (venue.ownerId !== parsed.data.ownerId) return res.status(403).json({ message: "Forbidden" });

  venue.title = parsed.data.title;
  venue.region = parsed.data.region;
  venue.city = parsed.data.city;
  venue.address = parsed.data.address;
  venue.category = parsed.data.category;
  venue.capacity = parsed.data.capacity;
  venue.areaSqm = parsed.data.areaSqm;
  venue.pricePerHour = parsed.data.pricePerHour;
  venue.description = parsed.data.description;
  venue.amenities = parsed.data.amenities;
  venue.images = parsed.data.images;
  persistStateSync();
  return res.json({ message: "Площадка обновлена", venue });
});

const ownerDeleteVenueSchema = z.object({
  ownerId: z.string().min(2)
});

app.delete("/api/owner/venues/:id", (req, res) => {
  const parsed = ownerDeleteVenueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid delete payload" });

  const venueIndex = venues.findIndex((item) => item.id === req.params.id);
  if (venueIndex < 0) return res.status(404).json({ message: "Venue not found" });

  const venue = venues[venueIndex];
  if (venue.ownerId !== parsed.data.ownerId) return res.status(403).json({ message: "Forbidden" });

  venues.splice(venueIndex, 1);

  for (let i = reviews.length - 1; i >= 0; i -= 1) {
    if (reviews[i].venueId === req.params.id) reviews.splice(i, 1);
  }
  for (let i = leadRequests.length - 1; i >= 0; i -= 1) {
    if (leadRequests[i].venueId === req.params.id) leadRequests.splice(i, 1);
  }
  for (let i = reviewModerationAudit.length - 1; i >= 0; i -= 1) {
    if (reviewModerationAudit[i].venueId === req.params.id) reviewModerationAudit.splice(i, 1);
  }

  persistStateSync();
  return res.json({ message: "Площадка удалена" });
});

const aiSearchSchema = z.object({ query: z.string().min(3) });

function aiExtractFilters(query: string): { category?: string; region?: string; capacity?: number; areaMin?: number; priceMax?: number } {
  const lowered = query.toLowerCase();

  const category = categories.find((item) => lowered.includes(item.name.toLowerCase().split(" ")[0]))?.name;
  const region = ["москва", "санкт-петербург", "казань", "екатеринбург", "новосибирск"].find((city) => lowered.includes(city));

  const guestsMatch = lowered.match(/(\d{2,3})\s*(гостей|человек)/);
  const areaMatch = lowered.match(/(\d{2,4})\s*(м2|м²|кв\.?\s*м|квадрат)/);
  const budgetMatch = lowered.match(/до\s*(\d{3,6})/);

  return {
    category,
    region: region ? region[0].toUpperCase() + region.slice(1) : undefined,
    capacity: guestsMatch ? Number(guestsMatch[1]) : undefined,
    areaMin: areaMatch ? Number(areaMatch[1]) : undefined,
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
    const areaPass = filters.areaMin ? item.areaSqm >= filters.areaMin : true;
    const pricePass = filters.priceMax ? item.pricePerHour <= filters.priceMax : true;
    return categoryPass && regionPass && capacityPass && areaPass && pricePass;
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

const onServerStarted = () => {
  const logHost = host ?? "localhost";
  console.log(`API running on http://${logHost}:${port}`);
  if (autoBillingNotifierEnabled) {
    const intervalMs = Math.max(5, billingNotifierIntervalMinutes) * 60 * 1000;
    setInterval(() => {
      const result = runBillingReminderDispatch();
      if (result.sent > 0) {
        console.log(`Billing notifier sent ${result.sent} notifications`);
      }
    }, intervalMs);
    console.log(`Billing notifier enabled, interval ${Math.max(5, billingNotifierIntervalMinutes)} min`);
  }
};

if (host) {
  app.listen(port, host, onServerStarted);
} else {
  app.listen(port, onServerStarted);
}
