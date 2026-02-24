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
  areaSqm: number;
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
  createdAt: string;
  trialEndsAt: string;
  trialStatus: "active" | "expired";
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

export const venues: Venue[] = [];

export const reviews: Review[] = [];

export const leadRequests: LeadRequest[] = [];

export const owners: Owner[] = [];

export const payments: Payment[] = [];

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
