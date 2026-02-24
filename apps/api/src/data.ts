export type Category = {
  id: string;
  name: string;
  featured: boolean;
};

export type Venue = {
  id: string;
  ownerId: string;
  title: string;
  region: string;
  city: string;
  address: string;
  category: string;
  capacity: number;
  pricePerHour: number;
  description: string;
  amenities: string[];
  images: string[];
  nextAvailableDates: string[];
  rating: number;
  reviewsCount: number;
  instantBooking: boolean;
  metroMinutes: number;
  cancellationPolicy: string;
  phone: string;
};

export type Review = {
  id: string;
  venueId: string;
  author: string;
  rating: number;
  text: string;
  requesterName: string;
  requesterPhone: string;
  sourceLeadRequestId: string;
  verified: boolean;
  status: "pending" | "published" | "hidden";
  riskScore: number;
  riskFlags: string[];
  createdAt: string;
};

export type LeadRequest = {
  id: string;
  venueId: string;
  name: string;
  phone: string;
  comment: string;
  createdAt: string;
  status: "new" | "in_progress" | "call_scheduled" | "confirmed" | "rejected";
  updatedAt: string;
};

export type Owner = {
  id: string;
  name: string;
  email: string;
  password: string;
  subscriptionStatus: "inactive" | "active";
  subscriptionPlan: "monthly_2000";
  nextBillingDate: string | null;
};

export type Payment = {
  id: string;
  ownerId: string;
  amountRub: number;
  periodDays: number;
  status: "paid" | "failed";
  paidAt: string;
  nextBillingDate: string;
  method: "mock";
};

export type AnalyticsEvent = {
  id: string;
  event:
    | "home_view"
    | "catalog_view"
    | "category_open"
    | "category_filter_apply"
    | "venue_view"
    | "lead_submit"
    | "owner_register"
    | "owner_login";
  createdAt: string;
  meta: Record<string, string | number | boolean>;
};

export type ReviewModerationAudit = {
  id: string;
  reviewId: string;
  venueId: string;
  previousStatus: "pending" | "published" | "hidden";
  nextStatus: "published" | "hidden";
  note?: string;
  moderator: string;
  createdAt: string;
};

const allCategoryNames = [
  "Лофт",
  "Банкетный зал",
  "Ресторан для мероприятий",
  "Конференц-зал",
  "Переговорная",
  "Фотостудия",
  "Видеостудия / подкаст",
  "Коворкинг / event-space",
  "Выставочный зал",
  "Арт-пространство",
  "Концертная площадка",
  "Театр / сцена",
  "Спортзал / танцевальный",
  "Детское пространство",
  "Коттедж / загородный дом",
  "База отдыха",
  "Терраса / rooftop",
  "Теплоход / яхта",
  "Шоурум / pop-up",
  "Универсальный зал"
];

export const categories: Category[] = allCategoryNames.map((name, index) => ({
  id: `CAT-${index + 1}`,
  name,
  featured: index < 8,
}));

const cities = [
  { region: "Москва", city: "Москва" },
  { region: "Санкт-Петербург", city: "Санкт-Петербург" },
  { region: "Казань", city: "Казань" },
  { region: "Екатеринбург", city: "Екатеринбург" },
  { region: "Новосибирск", city: "Новосибирск" }
];

const imagePool = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80"
];

const amenityPool = ["Wi-Fi", "Проектор", "Звук", "Кухня", "Парковка", "Сцена", "Кофе-зона", "Гримерка"];

function makeDate(offsetDays: number): string {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return date.toISOString().slice(0, 10);
}

function venueTemplate(category: string, index: number): Venue {
  const cityRef = cities[index % cities.length];
  const basePrice = 3000 + (index % 6) * 1200;
  const capacity = 25 + (index % 8) * 15;

  return {
    id: `V-${category.slice(0, 2).toUpperCase()}-${index + 1}`,
    ownerId: `O-${(index % 4) + 1}`,
    title: `${category} Premium Space ${index + 1}`,
    region: cityRef.region,
    city: cityRef.city,
    address: `ул. Премиальная, ${10 + index}`,
    category,
    capacity,
    pricePerHour: basePrice,
    description: `Премиальная площадка категории «${category}» для мероприятий, деловых встреч и частных событий.`,
    amenities: amenityPool.slice(0, 4 + (index % 3)),
    images: [imagePool[index % imagePool.length]],
    nextAvailableDates: [makeDate(2 + index), makeDate(4 + index), makeDate(7 + index)],
    rating: Number((4.3 + (index % 7) * 0.1).toFixed(1)),
    reviewsCount: 12 + (index % 20),
    instantBooking: index % 2 === 0,
    metroMinutes: 5 + (index % 12),
    cancellationPolicy: "Бесплатная отмена за 72 часа",
    phone: "+7 (999) 123-45-67"
  };
}

const featuredCategoryNames = categories.filter((item) => item.featured).map((item) => item.name);
const tailCategoryNames = categories.filter((item) => !item.featured).map((item) => item.name);

export const venues: Venue[] = [
  ...featuredCategoryNames.flatMap((name) => Array.from({ length: 12 }).map((_, idx) => venueTemplate(name, idx))),
  ...tailCategoryNames.flatMap((name) => Array.from({ length: 4 }).map((_, idx) => venueTemplate(name, idx + 100))),
];

export const reviews: Review[] = [
  {
    id: "R-1",
    venueId: venues[0].id,
    author: "Анна",
    rating: 5,
    text: "Отличная площадка, быстрый ответ арендодателя.",
    requesterName: "Анна",
    requesterPhone: "+79000000001",
    sourceLeadRequestId: "seed-L-1",
    verified: true,
    status: "published",
    riskScore: 8,
    riskFlags: [],
    createdAt: `${makeDate(-10)}T10:00:00.000Z`
  },
  {
    id: "R-2",
    venueId: venues[0].id,
    author: "Игорь",
    rating: 4,
    text: "Хороший зал и удобное расположение.",
    requesterName: "Игорь",
    requesterPhone: "+79000000002",
    sourceLeadRequestId: "seed-L-2",
    verified: true,
    status: "published",
    riskScore: 12,
    riskFlags: [],
    createdAt: `${makeDate(-6)}T12:30:00.000Z`
  }
];

export const leadRequests: LeadRequest[] = [];

export const owners: Owner[] = [
  {
    id: "O-1",
    name: "Demo Owner",
    email: "owner1@example.com",
    password: "password123",
    subscriptionStatus: "active",
    subscriptionPlan: "monthly_2000",
    nextBillingDate: makeDate(24)
  }
];

export const payments: Payment[] = [
  {
    id: "P-1",
    ownerId: "O-1",
    amountRub: 2000,
    periodDays: 30,
    status: "paid",
    paidAt: makeDate(-6),
    nextBillingDate: makeDate(24),
    method: "mock"
  }
];

export const analyticsEvents: AnalyticsEvent[] = [];

export const reviewModerationAudit: ReviewModerationAudit[] = [];

export function recalculateVenueRating(venueId: string): void {
  const venue = venues.find((item) => item.id === venueId);
  if (!venue) return;

  const venueReviews = reviews.filter((item) => item.venueId === venueId && item.verified && item.status === "published");
  if (!venueReviews.length) {
    venue.rating = 0;
    venue.reviewsCount = 0;
    return;
  }

  const avg = venueReviews.reduce((sum, item) => sum + item.rating, 0) / venueReviews.length;
  venue.rating = Number(avg.toFixed(1));
  venue.reviewsCount = venueReviews.length;
}
