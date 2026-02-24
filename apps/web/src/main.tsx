import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import "./styles.css";

type Category = { id: string; name: string; featured: boolean };
type Venue = {
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
type Review = {
  id: string;
  venueId: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
  verified?: boolean;
  status?: "pending" | "published" | "hidden";
};
type AdminReview = Review & {
  requesterName: string;
  requesterPhone: string;
  sourceLeadRequestId: string;
  riskScore: number;
  riskFlags: string[];
  venueTitle: string;
};
type AdminReviewSummary = {
  total: number;
  pending: number;
  published: number;
  hidden: number;
  highRiskPending: number;
  avgRiskPending: number;
  recentActions: Array<{
    id: string;
    reviewId: string;
    previousStatus: "pending" | "published" | "hidden";
    nextStatus: "published" | "hidden";
    moderator: string;
    createdAt: string;
    note?: string;
  }>;
};
type Owner = {
  id: string;
  name: string;
  email: string;
  trialEndsAt: string;
  trialStatus: "active" | "expired";
  subscriptionStatus: "inactive" | "active";
  nextBillingDate: string | null;
};
type QuickFilters = {
  parking: boolean;
  stage: boolean;
  late: boolean;
  instant: boolean;
};
type SavedSearch = {
  id: string;
  label: string;
  query: string;
  region: string;
  category: string;
  capacity: string;
  date: string;
  sort: string;
  quickFilters: QuickFilters;
};
type OwnerLead = {
  id: string;
  venueId: string;
  venueTitle: string;
  venueAddress: string;
  name: string;
  phone: string;
  comment: string;
  createdAt: string;
  status: "new" | "in_progress" | "call_scheduled" | "confirmed" | "rejected";
  responseSlaMinutes: number;
  ageMinutes: number;
  isSlaBreached: boolean;
};
type OwnerDashboard = {
  ownerId: string;
  trial: {
    status: "active" | "expired";
    endsAt: string;
    daysLeft: number;
  } | null;
  metrics: {
    venuesTotal: number;
    leadsTotal: number;
    confirmedTotal: number;
    conversionRate: number;
    viewsMock: number;
  };
  statusCounts: Record<OwnerLead["status"], number>;
  completeness: Array<{
    venueId: string;
    venueTitle: string;
    score: number;
    tip: string;
  }>;
};

type Theme = "light" | "dark";

const envApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const inferredApiBase =
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8090"
    : "";
const rawApiBase = envApiBase && envApiBase.length > 0 ? envApiBase : inferredApiBase;
const API = rawApiBase.endsWith("/") ? rawApiBase.slice(0, -1) : rawApiBase;
const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || "https://vmestoru.ru").replace(/\/+$/, "");
const DEFAULT_OG_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80";
const CATEGORY_ART_ORDER = [
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
  "Универсальный зал",
];
const CATEGORY_STOCK_IMAGES: Record<string, string> = {
  "Лофт": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80",
  "Банкетный зал": "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
  "Ресторан для мероприятий": "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80",
  "Конференц-зал": "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1400&q=80",
  "Переговорная": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80",
  "Фотостудия": "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?auto=format&fit=crop&w=1400&q=80",
  "Видеостудия / подкаст": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1400&q=80",
  "Коворкинг / event-space": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
  "Выставочный зал": "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1400&q=80",
  "Арт-пространство": "https://images.unsplash.com/photo-1577083552431-6e5fd01988f1?auto=format&fit=crop&w=1400&q=80",
  "Концертная площадка": "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=80",
  "Театр / сцена": "https://images.unsplash.com/photo-1507924538820-ede94a04019d?auto=format&fit=crop&w=1400&q=80",
  "Спортзал / танцевальный": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80",
  "Детское пространство": "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1400&q=80",
  "Коттедж / загородный дом": "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1400&q=80",
  "База отдыха": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
  "Терраса / rooftop": "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80",
  "Теплоход / яхта": "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1400&q=80",
  "Шоурум / pop-up": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
  "Универсальный зал": "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80",
};

function upsertMetaTag(
  key: "name" | "property",
  value: string,
  content: string
): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(key, value);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertLinkTag(rel: string, href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function syncAlternateLinks(canonical: string): void {
  const entries = [
    { hrefLang: "ru-RU", href: canonical },
    { hrefLang: "x-default", href: canonical },
  ];
  document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][data-seo-alt="true"]').forEach((node) => node.remove());
  entries.forEach((entry) => {
    const link = document.createElement("link");
    link.setAttribute("rel", "alternate");
    link.setAttribute("hrefLang", entry.hrefLang);
    link.setAttribute("href", entry.href);
    link.setAttribute("data-seo-alt", "true");
    document.head.appendChild(link);
  });
}

function upsertJsonLd(id: string, payload: Record<string, unknown>): void {
  let script = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-seo", id);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

function applySeo({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  jsonLd = [],
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  jsonLd?: Array<{ id: string; payload: Record<string, unknown> }>;
}): void {
  const canonical = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  document.title = title;

  upsertMetaTag("name", "description", description);
  upsertMetaTag("name", "robots", noindex ? "noindex,nofollow" : "index,follow");
  upsertMetaTag("property", "og:title", title);
  upsertMetaTag("property", "og:description", description);
  upsertMetaTag("property", "og:type", type);
  upsertMetaTag("property", "og:locale", "ru_RU");
  upsertMetaTag("property", "og:url", canonical);
  upsertMetaTag("property", "og:image", ogImage);
  upsertMetaTag("name", "twitter:card", "summary_large_image");
  upsertMetaTag("name", "twitter:title", title);
  upsertMetaTag("name", "twitter:description", description);
  upsertMetaTag("name", "twitter:image", ogImage);
  upsertLinkTag("canonical", canonical);
  syncAlternateLinks(canonical);

  const allowed = new Set(jsonLd.map((entry) => entry.id));
  document.head.querySelectorAll<HTMLScriptElement>("script[data-seo]").forEach((node) => {
    const id = node.getAttribute("data-seo") ?? "";
    if (!allowed.has(id)) node.remove();
  });
  jsonLd.forEach((entry) => upsertJsonLd(entry.id, entry.payload));
}

function categoryToSlug(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, "-"));
}

function slugToCategory(value: string): string {
  return decodeURIComponent(value).replace(/-/g, " ");
}

function categoryWebpArt(name: string): string {
  const index = CATEGORY_ART_ORDER.findIndex((item) => item === name);
  if (index >= 0) return `/catalog-art/c${String(index + 1).padStart(2, "0")}.webp`;
  const stockImage = CATEGORY_STOCK_IMAGES[name];
  if (stockImage) return stockImage;
  return DEFAULT_OG_IMAGE;
}

async function trackEvent(
  event:
    | "home_view"
    | "catalog_view"
    | "category_open"
    | "category_filter_apply"
    | "venue_view"
    | "lead_submit"
    | "owner_register"
    | "owner_login",
  meta: Record<string, string | number | boolean> = {}
): Promise<void> {
  try {
    await fetch(`${API}/api/analytics/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, meta })
    });
  } catch {
    // ignore analytics errors
  }
}

async function reportFrontendError(message: string, source = "window"): Promise<void> {
  try {
    await fetch(`${API}/api/monitor/frontend-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: typeof window !== "undefined" ? window.location.pathname : "/",
        message: message.slice(0, 1500),
        source,
      }),
    });
  } catch {
    // ignore monitoring transport errors
  }
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDateValue(value: Date | undefined): string {
  if (!value) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("vmestoru-theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vmestoru-theme", theme);
  }, [theme]);

  return [theme, () => setTheme((prev) => (prev === "light" ? "dark" : "light"))];
}

function DateField({ value, onChange }: { value: Date | undefined; onChange: (date: Date | undefined) => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <div className="date-picker-wrap">
      <button type="button" className="date-trigger" onClick={() => setOpened((prev) => !prev)}>
        {value ? value.toLocaleDateString("ru-RU") : "Выберите дату"}
      </button>
      {opened ? (
        <div className="date-popover" role="dialog" aria-label="Выбор даты">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpened(false);
            }}
          />
          <button type="button" className="date-clear" onClick={() => onChange(undefined)}>
            Сбросить дату
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav className="breadcrumbs" aria-label="Хлебные крошки">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {item.to && index < items.length - 1 ? <Link to={item.to}>{item.label}</Link> : <strong>{item.label}</strong>}
          {index < items.length - 1 ? <span className="crumb-sep"> / </span> : null}
        </span>
      ))}
    </nav>
  );
}

function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const location = useLocation();
  const isOwnerRoute = location.pathname.startsWith("/owner");

  return (
    <header className="header glass">
      <Link to="/" className="brand brand-link" aria-label="VmestoRu — на главную">
        <img src="/favicon.svg" alt="Логотип VmestoRu" className="brand-logo" width={34} height={34} />
        <div>
          <strong>VmestoRu</strong>
          <p>Премиальная аренда площадок для мероприятий</p>
        </div>
      </Link>

      <nav className="nav">
        <NavLink to="/catalog">Каталог</NavLink>
        <a href="/#how-it-works">Как это работает</a>
      </nav>

      <div className="header-actions">
        <button
          type="button"
          className={theme === "dark" ? "theme-switch is-dark" : "theme-switch"}
          onClick={onToggleTheme}
          aria-label="Переключить тему"
          title="Переключить тему"
        >
          <span className="theme-switch-track" aria-hidden="true">
            <span className="theme-switch-thumb">{theme === "light" ? "☀" : "☾"}</span>
          </span>
        </button>
        <Link to={isOwnerRoute ? "/" : "/owner"} className="become-owner">
          {isOwnerRoute ? "Назад в каталог" : "Для арендодателей"}
        </Link>
      </div>
    </header>
  );
}

function HeroOrbit() {
  return (
    <div className="hero-orbit-wrap" aria-hidden="true">
      <svg className="hero-orbit" viewBox="0 0 320 220" role="img" aria-label="Динамическая визуализация">
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="orb-stop-a" />
            <stop offset="100%" className="orb-stop-b" />
          </linearGradient>
          <linearGradient id="trailGradient" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" className="trail-stop" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="112" rx="106" ry="50" className="orbit-track" />
        <path d="M58 112 C102 168, 218 168, 262 112" className="orbit-arc" />
        <path d="M58 112 C102 56, 218 56, 262 112" className="orbit-arc orbit-arc-soft" />
        <circle cx="112" cy="76" r="10" className="satellite satellite-a" />
        <circle cx="214" cy="142" r="8" className="satellite satellite-b" />
        <rect x="74" y="108" width="172" height="8" rx="4" className="orb-trail" />
        <circle cx="160" cy="112" r="34" fill="url(#orbGradient)" className="orb-core" />
      </svg>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Array<Category & { venues: Venue[] }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [capacity, setCapacity] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sort, setSort] = useState("recommended");
  const [quickFilters, setQuickFilters] = useState<QuickFilters>({
    parking: false,
    stage: false,
    late: false,
    instant: false
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<Venue[]>([]);
  const [aiMessage, setAiMessage] = useState("");

  const regions = useMemo(() => [...new Set(allVenues.map((item) => item.region))], [allVenues]);
  const homeCategoryCards = useMemo(
    () =>
      categories
        .map((item) => ({
          id: item.id,
          name: item.name,
          image: categoryWebpArt(item.name),
          count: allVenues.filter((venue) => venue.category === item.name).length,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru-RU"))
        .slice(0, 8),
    [categories, allVenues]
  );

  useEffect(() => {
    void bootstrap();
    void trackEvent("home_view", { source: "web" });
    const raw = localStorage.getItem("vmestoru-saved-searches");
    if (raw) {
      try {
        setSavedSearches(JSON.parse(raw) as SavedSearch[]);
      } catch {
        setSavedSearches([]);
      }
    }

    applySeo({
      title: "VmestoRu — аренда площадок для мероприятий",
      description:
        "Площадка аренды лофтов, банкетных и конференц-залов по городам России. Умный подбор, рейтинг площадок и быстрая заявка арендодателю.",
      path: "/",
      jsonLd: [
        {
          id: "org",
          payload: {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "VmestoRu",
            url: SITE_URL,
            email: "hello@vmestoru.ru",
          },
        },
        {
          id: "website",
          payload: {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "VmestoRu",
            url: SITE_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        },
      ],
    });
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    applySeo({
      title: "VmestoRu — аренда площадок для мероприятий",
      description:
        "Каталог площадок с фильтрами по категориям и городам: лофты, банкетные и конференц-залы. Сравнивайте рейтинг и отправляйте заявку в 1 клик.",
      path: "/",
      jsonLd: [
        {
          id: "org",
          payload: {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "VmestoRu",
            url: SITE_URL,
            email: "hello@vmestoru.ru",
          },
        },
        {
          id: "website",
          payload: {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "VmestoRu",
            url: SITE_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        },
        {
          id: "home-categories",
          payload: {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Категории площадок VmestoRu",
            itemListElement: homeCategoryCards.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              url: `${SITE_URL}/category/${categoryToSlug(item.name)}`,
            })),
          },
        },
        {
          id: "home-faq",
          payload: {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Как добавить площадку на VmestoRu?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Зарегистрируйтесь как арендодатель, заполните карточку площадки и добавьте минимум 3 фотографии.",
                },
              },
              {
                "@type": "Question",
                name: "Есть ли пробный период для новых арендодателей?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Да, новые арендодатели получают бесплатный доступ на 3 месяца с момента регистрации.",
                },
              },
              {
                "@type": "Question",
                name: "Как связаться с поддержкой?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Используйте кнопку «Написать в поддержку» внизу сайта. Откроется модальное окно с формой обращения.",
                },
              },
            ],
          },
        },
      ],
    });
  }, [categories, homeCategoryCards]);

  async function bootstrap(): Promise<void> {
    const [featuredRes, categoriesRes, venuesRes] = await Promise.all([
      fetch(`${API}/api/home/featured-categories`),
      fetch(`${API}/api/categories`),
      fetch(`${API}/api/venues`),
    ]);

    if (featuredRes.ok) setFeatured((await featuredRes.json()) as Array<Category & { venues: Venue[] }>);
    if (categoriesRes.ok) setCategories((await categoriesRes.json()) as Category[]);
    if (venuesRes.ok) setAllVenues((await venuesRes.json()) as Venue[]);
  }

  function buildSearchParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (region) params.set("region", region);
    if (category) params.set("category", category);
    if (capacity) params.set("capacity", capacity);
    if (date) params.set("date", formatDateValue(date));
    params.set("sort", sort);

    if (quickFilters.parking) params.set("parking", "true");
    if (quickFilters.stage) params.set("stage", "true");
    if (quickFilters.late) params.set("late", "true");
    if (quickFilters.instant) params.set("instant", "true");
    return params;
  }

  async function handleSearch(event: FormEvent): Promise<void> {
    event.preventDefault();
    const params = buildSearchParams();

    const response = await fetch(`${API}/api/venues?${params.toString()}`);
    if (!response.ok) return;
    setAllVenues((await response.json()) as Venue[]);
  }

  function toggleQuickFilter(key: keyof QuickFilters): void {
    setQuickFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function resetHomeFilters(): Promise<void> {
    setQuery("");
    setRegion("");
    setCategory("");
    setCapacity("");
    setDate(undefined);
    setSort("recommended");
    setQuickFilters({ parking: false, stage: false, late: false, instant: false });
    const response = await fetch(`${API}/api/venues`);
    if (!response.ok) return;
    setAllVenues((await response.json()) as Venue[]);
  }

  function adjustCapacity(delta: number): void {
    const numeric = Number.parseInt(capacity || "0", 10);
    const safeCurrent = Number.isFinite(numeric) ? numeric : 0;
    const next = Math.max(1, safeCurrent + delta);
    setCapacity(String(next));
  }

  function saveCurrentSearch(): void {
    const next: SavedSearch = {
      id: `${Date.now()}`,
      label: [category || "Все категории", region || "Все регионы", capacity ? `${capacity} гостей` : ""].filter(Boolean).join(" · "),
      query,
      region,
      category,
      capacity,
      date: date ? formatDateValue(date) : "",
      sort,
      quickFilters
    };
    const updated = [next, ...savedSearches].slice(0, 5);
    setSavedSearches(updated);
    localStorage.setItem("vmestoru-saved-searches", JSON.stringify(updated));
  }

  async function applySavedSearch(item: SavedSearch): Promise<void> {
    setQuery(item.query);
    setRegion(item.region);
    setCategory(item.category);
    setCapacity(item.capacity);
    setDate(item.date ? new Date(item.date) : undefined);
    setSort(item.sort);
    setQuickFilters(item.quickFilters);

    const params = new URLSearchParams();
    if (item.query) params.set("q", item.query);
    if (item.region) params.set("region", item.region);
    if (item.category) params.set("category", item.category);
    if (item.capacity) params.set("capacity", item.capacity);
    if (item.date) params.set("date", item.date);
    params.set("sort", item.sort);
    if (item.quickFilters.parking) params.set("parking", "true");
    if (item.quickFilters.stage) params.set("stage", "true");
    if (item.quickFilters.late) params.set("late", "true");
    if (item.quickFilters.instant) params.set("instant", "true");

    const response = await fetch(`${API}/api/venues?${params.toString()}`);
    if (!response.ok) return;
    setAllVenues((await response.json()) as Venue[]);
  }

  async function handleAiSearch(event: FormEvent): Promise<void> {
    event.preventDefault();
    setAiMessage("");

    const response = await fetch(`${API}/api/ai/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: aiQuery })
    });

    if (!response.ok) {
      setAiMessage("Не удалось выполнить AI-поиск");
      return;
    }

    const payload = (await response.json()) as { message: string; venues: Venue[] };
    setAiMessage(payload.message);
    setAiResult(payload.venues);
  }

  return (
    <>
      <section className="hero hero-revolution glass reveal-on-scroll">
        <div className="hero-aura" aria-hidden="true" />
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Премиальный сервис под любые мероприятия</p>
            <h1>
              Соберите <span className="grad">идеальную площадку</span> как в конструкторе
            </h1>
            <p className="hero-subtitle">
              Фильтры, AI-подбор и мгновенный переход к карточке. Меньше кликов, больше релевантных вариантов.
            </p>
            <div className="hero-metrics">
              <article>
                <strong>{allVenues.length}</strong>
                <span>площадок в каталоге</span>
              </article>
              <article>
                <strong>{regions.length}</strong>
                <span>регионов</span>
              </article>
              <article>
                <strong>{categories.length}</strong>
                <span>категорий</span>
              </article>
            </div>
          </div>
          <div className="hero-side-stack">
            <HeroOrbit />
            <aside className="hero-assistant">
              <p className="hero-assistant-title">AI-консьерж подбора</p>
              <p>Опиши задачу простым языком, и мы сразу покажем подходящие площадки.</p>
              <form className="ai-search hero-ai" onSubmit={handleAiSearch}>
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Нужен светлый зал в Москве на 80 гостей, до 120000"
                />
                <button type="submit">AI-подбор</button>
              </form>
              {aiMessage ? <p className="ai-note">{aiMessage}</p> : null}
            </aside>
          </div>
        </div>

        <form className="search-grid" onSubmit={handleSearch}>
          <label className="filter-item">
            <span>Запрос</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Лофт, конференция, свадьба..." />
          </label>
          <label className="filter-item">
            <span>Регион</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">Все регионы</option>
              {regions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>Категория</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Все категории</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>Дата</span>
            <DateField value={date} onChange={setDate} />
          </label>
          <label className="filter-item">
            <span>Гостей</span>
            <div className="number-stepper">
              <button type="button" className="step-btn" aria-label="Уменьшить гостей" onClick={() => adjustCapacity(-1)}>
                −
              </button>
              <input type="number" min="1" placeholder="Например, 80" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              <button type="button" className="step-btn" aria-label="Увеличить гостей" onClick={() => adjustCapacity(1)}>
                +
              </button>
            </div>
          </label>
          <label className="filter-item">
            <span>Сортировка</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recommended">Рекомендованные</option>
              <option value="price_asc">Цена ниже</option>
              <option value="price_desc">Цена выше</option>
              <option value="rating_desc">Рейтинг</option>
            </select>
          </label>
          <button type="submit" className="primary search-submit">Найти</button>
          <button type="button" className="ghost-btn search-submit" onClick={() => void resetHomeFilters()}>Сбросить</button>
        </form>
        <div className="quick-filters">
          <button type="button" className={quickFilters.parking ? "chip active" : "chip"} onClick={() => toggleQuickFilter("parking")}>С парковкой</button>
          <button type="button" className={quickFilters.stage ? "chip active" : "chip"} onClick={() => toggleQuickFilter("stage")}>Со сценой</button>
          <button type="button" className={quickFilters.late ? "chip active" : "chip"} onClick={() => toggleQuickFilter("late")}>Можно поздно</button>
          <button type="button" className={quickFilters.instant ? "chip active" : "chip"} onClick={() => toggleQuickFilter("instant")}>Instant booking</button>
          <button type="button" className="chip save-chip" onClick={saveCurrentSearch}>Сохранить поиск</button>
        </div>

        {savedSearches.length > 0 ? (
          <div className="saved-searches">
            <p>Сохраненные поиски:</p>
            <div>
              {savedSearches.map((item) => (
                <button key={item.id} type="button" className="saved-pill" onClick={() => void applySavedSearch(item)}>
                  {item.label || "Сохраненный фильтр"}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {aiResult.length > 0 ? (
        <section className="section glass reveal-on-scroll">
          <h2>AI-подбор</h2>
          <div className="cards-grid">
            {aiResult.map((venue) => (
              <article key={venue.id} className="venue-card" onClick={() => navigate(`/venue/${venue.id}`)}>
                <img src={venue.images[0]} alt={venue.title} loading="lazy" />
                <div className="card-body">
                  <h3>{venue.title}</h3>
                  <p><span className="category-pill">{venue.category}</span> · {venue.region}</p>
                  <p>от {formatRub(venue.pricePerHour)} ₽/час</p>
                  <span className="rating-corner">★ {venue.rating}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section id="catalog" className="section glass reveal-on-scroll">
        <h2>Каталог площадок</h2>
        <div className="cards-grid">
          {allVenues.slice(0, 24).map((venue) => (
              <article key={venue.id} className="venue-card" onClick={() => navigate(`/venue/${venue.id}`)}>
                <img src={venue.images[0]} alt={venue.title} loading="lazy" />
                <div className="card-body">
                  <div className="row-between">
                    <h3>{venue.title}</h3>
                    {venue.instantBooking ? <span className="instant">Instant</span> : null}
                  </div>
                  <p><span className="category-pill">{venue.category}</span> · {venue.region}</p>
                  <p>{venue.capacity} гостей · {venue.metroMinutes} мин</p>
                  <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
                  <span className="rating-corner">★ {venue.rating}</span>
                </div>
              </article>
            ))}
        </div>
        {allVenues.length === 0 ? (
          <div className="empty-state">
            <h3>Площадок по текущему фильтру нет</h3>
            <p>Сбросьте фильтр или попробуйте другой регион и категорию.</p>
            <div className="empty-actions">
              <button type="button" className="primary" onClick={() => void resetHomeFilters()}>Сбросить фильтры</button>
              <Link to="/catalog" className="become-owner">Перейти в категории</Link>
            </div>
          </div>
        ) : null}
      </section>

      <section className="section glass reveal-on-scroll">
        <div className="row-between">
          <h2>Категории площадок</h2>
          <span>{homeCategoryCards.length} направлений</span>
        </div>
        <div className="category-grid">
          {homeCategoryCards.map((item) => (
            <Link key={item.id} className="category-tile" to={`/category/${categoryToSlug(item.name)}`}>
              <img src={item.image} alt={item.name} loading="lazy" />
              <div className="category-tile-body">
                <h3>{item.name}</h3>
                <p>{item.count} вариантов</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {featured.map((group) => (
        <section key={group.id} className="section glass reveal-on-scroll">
          <div className="row-between">
            <h2><Link className="category-head-link" to={`/category/${categoryToSlug(group.name)}`}>{group.name}</Link></h2>
            <span>{group.venues.length} вариантов</span>
          </div>
          <div className="cards-grid">
            {group.venues.slice(0, 8).map((venue) => (
              <article key={venue.id} className="venue-card" onClick={() => navigate(`/venue/${venue.id}`)}>
                <img src={venue.images[0]} alt={venue.title} loading="lazy" />
                <div className="card-body">
                  <h3>{venue.title}</h3>
                  <p><span className="category-pill">{venue.category}</span> · {venue.region}</p>
                  <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
                  <span className="rating-corner">★ {venue.rating}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section id="how-it-works" className="section glass reveal-on-scroll">
        <h2>Как это работает</h2>
        <div className="hero-metrics">
          <article>
            <strong>01</strong>
            <span>Фильтруете площадки под формат мероприятия</span>
          </article>
          <article>
            <strong>02</strong>
            <span>Сравниваете карточки и рейтинг в одном экране</span>
          </article>
          <article>
            <strong>03</strong>
            <span>Оставляете заявку и связываетесь с арендодателем</span>
          </article>
        </div>
      </section>

      <section className="section glass reveal-on-scroll">
        <h2>Категории и города</h2>
        <div className="seo-links">
          {categories.slice(0, 14).map((item) => (
            <Link key={item.id} to={`/category/${categoryToSlug(item.name)}`} className="seo-link-pill">
              {item.name}
            </Link>
          ))}
        </div>
        <div className="seo-links muted-links">
          {regions.map((item) => (
            <span key={item} className="seo-link-pill muted-city">{item}</span>
          ))}
        </div>
        <div className="static-category-grid">
          {homeCategoryCards.map((item) => (
            <Link key={`home-static-${item.id}`} className="static-category-card" to={`/category/${categoryToSlug(item.name)}`}>
              <img src={item.image} alt={item.name} loading="lazy" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section glass reveal-on-scroll">
        <h2>Частые вопросы</h2>
        <div className="owner-completeness">
          <article className="completeness-item">
            <strong>Как быстро появляется площадка в каталоге?</strong>
            <p>Сразу после заполнения карточки и сохранения в кабинете арендодателя.</p>
          </article>
          <article className="completeness-item">
            <strong>Что получает новый арендодатель?</strong>
            <p>3 месяца бесплатного доступа к публикации площадок и работе с входящими заявками.</p>
          </article>
          <article className="completeness-item">
            <strong>Куда писать в поддержку?</strong>
            <p>Через кнопку “Написать в поддержку” внизу сайта. Откроется окно с формой обращения.</p>
          </article>
        </div>
      </section>
    </>
  );
}

function CatalogPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Array<Category & { venues: Venue[] }>>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void bootstrap();
    void trackEvent("catalog_view", { source: "web" });
    applySeo({
      title: "Каталог категорий площадок — VmestoRu",
      description: "Выберите категорию площадки с фильтром по названию и региону. Переходите в категорию и смотрите все доступные площадки.",
      path: "/catalog",
      jsonLd: [
        {
          id: "catalog-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Каталог категорий площадок",
            url: `${SITE_URL}/catalog`,
          },
        },
        {
          id: "catalog-breadcrumbs",
          payload: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE_URL}/catalog` },
            ],
          },
        },
      ],
    });
  }, []);

  async function bootstrap(): Promise<void> {
    setLoading(true);
    setError("");
    try {
      const [featuredRes, categoriesRes, venuesRes] = await Promise.all([
        fetch(`${API}/api/home/featured-categories`),
        fetch(`${API}/api/categories`),
        fetch(`${API}/api/venues`),
      ]);
      if (!featuredRes.ok || !categoriesRes.ok || !venuesRes.ok) {
        setError("Не удалось загрузить каталог. Обновите страницу.");
        setFeatured([]);
        setCategories([]);
        setVenues([]);
      } else {
        setFeatured((await featuredRes.json()) as Array<Category & { venues: Venue[] }>);
        setCategories((await categoriesRes.json()) as Category[]);
        setVenues((await venuesRes.json()) as Venue[]);
      }
    } catch {
      setError("Ошибка сети при загрузке каталога.");
      setFeatured([]);
      setCategories([]);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }

  const regions = useMemo(() => [...new Set(venues.map((item) => item.region))], [venues]);

  function resetCatalogFilters(): void {
    setQuery("");
    setRegion("");
  }

  const categoryCards = useMemo(() => {
    return categories
      .filter((item) => (query ? item.name.toLowerCase().includes(query.toLowerCase()) : true))
      .map((item) => {
        const inCategory = venues.filter((venue) => venue.category === item.name);
        const inRegion = region ? inCategory.filter((venue) => venue.region === region) : inCategory;
        return {
          id: item.id,
          name: item.name,
          image: categoryWebpArt(item.name),
          count: inRegion.length,
        };
      })
      .filter((item) => item.count > 0);
  }, [categories, venues, query, region]);

  return (
    <section className="section glass reveal-on-scroll">
      <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Каталог" }]} />
      <h1>Каталог категорий</h1>
      <form className="catalog-filters" onSubmit={(e) => e.preventDefault()}>
        <label className="filter-item">
          <span>Поиск категории</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Лофт, ресторан, студия..." />
        </label>
        <label className="filter-item">
          <span>Регион</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Все регионы</option>
            {regions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-btn catalog-reset" onClick={resetCatalogFilters}>Сбросить фильтр</button>
      </form>

      <div className="category-grid">
        {categoryCards.map((item) => (
          <Link
            key={item.id}
            className="category-tile"
            to={`/category/${categoryToSlug(item.name)}${region ? `?region=${encodeURIComponent(region)}` : ""}`}
            onClick={() => void trackEvent("category_open", { category: item.name, region: region || "all", from: "catalog" })}
          >
            <img src={item.image} alt={item.name} loading="lazy" />
            <div className="category-tile-body">
              <h3>{item.name}</h3>
              <p>{item.count} площадок</p>
            </div>
          </Link>
        ))}
      </div>
      <section className="section glass reveal-on-scroll">
        <h2>Категории и города</h2>
        <div className="seo-links">
          {categoryCards.slice(0, 20).map((item) => (
            <Link key={item.id} to={`/category/${categoryToSlug(item.name)}`} className="seo-link-pill">
              {item.name}
            </Link>
          ))}
        </div>
        <div className="seo-links muted-links">
          {regions.map((item) => (
            <span key={item} className="seo-link-pill muted-city">{item}</span>
          ))}
        </div>
        <div className="static-category-grid">
          {categoryCards.map((item) => (
            <Link key={`catalog-static-${item.id}`} className="static-category-card" to={`/category/${categoryToSlug(item.name)}`}>
              <img src={item.image} alt={item.name} loading="lazy" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </section>
      {featured.map((group) => (
        <section key={`catalog-${group.id}`} className="section glass reveal-on-scroll">
          <div className="row-between">
            <h2><Link className="category-head-link" to={`/category/${categoryToSlug(group.name)}`}>{group.name}</Link></h2>
            <span>{group.venues.length} вариантов</span>
          </div>
          <div className="cards-grid">
            {group.venues.slice(0, 8).map((venue) => (
              <article key={venue.id} className="venue-card" onClick={() => navigate(`/venue/${venue.id}`)}>
                <img src={venue.images[0]} alt={venue.title} loading="lazy" />
                <div className="card-body">
                  <h3>{venue.title}</h3>
                  <p><span className="category-pill">{venue.category}</span> · {venue.region}</p>
                  <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
                  <span className="rating-corner">★ {venue.rating}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {loading ? <p className="muted">Загрузка категорий...</p> : null}
      {!loading && error ? <p className="error-note">{error}</p> : null}
      {!loading && !error && categoryCards.length === 0 ? (
        <div className="empty-state">
          <h3>Категории не найдены</h3>
          <p>Измените фильтр по названию или региону, чтобы увидеть доступные разделы.</p>
          <div className="empty-actions">
            <button type="button" className="primary" onClick={resetCatalogFilters}>Очистить фильтр</button>
            <Link to="/" className="become-owner">На главную</Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryName, setCategoryName] = useState("");
  const [venuesByCategory, setVenuesByCategory] = useState<Venue[]>([]);
  const [categoryUniverse, setCategoryUniverse] = useState<Venue[]>([]);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [region, setRegion] = useState(searchParams.get("region") ?? "");
  const [capacity, setCapacity] = useState(searchParams.get("capacity") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setRegion(searchParams.get("region") ?? "");
    setCapacity(searchParams.get("capacity") ?? "");
    setSort(searchParams.get("sort") || "recommended");
    void loadCategory();
  }, [slug, searchParams]);

  useEffect(() => {
    if (!slug || !categoryName) return;
    void trackEvent("category_open", { category: categoryName, source: "direct" });
    applySeo({
      title: `${categoryName} — аренда площадок | VmestoRu`,
      description: `Подбор площадок категории «${categoryName}»: сравнивайте рейтинг, цену и доступность в городах России.`,
      path: `/category/${slug}`,
      jsonLd: [
        {
          id: "category-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${categoryName} — каталог площадок`,
            url: `${SITE_URL}/category/${slug}`,
          },
        },
        {
          id: "category-breadcrumbs",
          payload: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE_URL}/catalog` },
              { "@type": "ListItem", position: 3, name: categoryName, item: `${SITE_URL}/category/${slug}` },
            ],
          },
        },
      ],
    });
  }, [categoryName, slug]);

  async function loadCategory(): Promise<void> {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const categoriesRes = await fetch(`${API}/api/categories`);
      const categoriesPayload = categoriesRes.ok ? ((await categoriesRes.json()) as Category[]) : [];
      const matched = categoriesPayload.find((item) => categoryToSlug(item.name) === slug);
      const resolvedName = matched?.name ?? slugToCategory(slug);
      setCategoryName(resolvedName);

      const universeRes = await fetch(`${API}/api/venues?category=${encodeURIComponent(resolvedName)}`);
      if (universeRes.ok) {
        setCategoryUniverse((await universeRes.json()) as Venue[]);
      } else {
        setCategoryUniverse([]);
      }

      const params = new URLSearchParams();
      params.set("category", resolvedName);
      if (query) params.set("q", query);
      if (region) params.set("region", region);
      if (capacity) params.set("capacity", capacity);
      if (sort) params.set("sort", sort);

      const venuesRes = await fetch(`${API}/api/venues?${params.toString()}`);
      if (!venuesRes.ok) {
        setError("Не удалось загрузить площадки категории.");
        setVenuesByCategory([]);
      } else {
        setVenuesByCategory((await venuesRes.json()) as Venue[]);
      }
    } catch {
      setError("Ошибка сети при загрузке категории.");
      setVenuesByCategory([]);
      setCategoryUniverse([]);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event: FormEvent): void {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (region) params.set("region", region);
    if (capacity) params.set("capacity", capacity);
    if (sort) params.set("sort", sort);
    void trackEvent("category_filter_apply", {
      category: categoryName || slug || "",
      region: region || "all",
      hasQuery: Boolean(query),
      hasCapacity: Boolean(capacity),
      sort,
    });
    setSearchParams(params);
  }

  function resetFilters(): void {
    setQuery("");
    setRegion("");
    setCapacity("");
    setSort("recommended");
    setSearchParams(new URLSearchParams({ sort: "recommended" }));
  }

  const regions = useMemo(() => [...new Set(categoryUniverse.map((item) => item.region))], [categoryUniverse]);

  return (
    <section className="section glass reveal-on-scroll">
      <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Каталог", to: "/catalog" }, { label: categoryName || "Категория" }]} />
      <Link to="/catalog" className="back-link">← Назад в категории</Link>
      <h1>
        Категория: <span className="grad">{categoryName || "..."}</span>
      </h1>
      <form className="search-grid" onSubmit={applyFilters}>
        <label className="filter-item">
          <span>Поиск по площадкам</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название или описание" />
        </label>
        <label className="filter-item">
          <span>Регион</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Все регионы</option>
            {regions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="filter-item">
          <span>Гостей</span>
          <input type="number" min="1" placeholder="Например, 50" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </label>
        <label className="filter-item">
          <span>Сортировка</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Рекомендованные</option>
            <option value="price_asc">Цена ниже</option>
            <option value="price_desc">Цена выше</option>
            <option value="rating_desc">Рейтинг</option>
          </select>
        </label>
        <button type="submit" className="primary search-submit">Применить</button>
        <button type="button" className="ghost-btn search-submit" onClick={resetFilters}>Сбросить</button>
      </form>
      <p className="muted">Найдено площадок: {venuesByCategory.length}</p>
      {loading ? <p className="muted">Загрузка площадок...</p> : null}
      {!loading && error ? <p className="error-note">{error}</p> : null}
      {!loading && !error && venuesByCategory.length === 0 ? (
        <div className="empty-state">
          <h3>Площадок в категории не найдено</h3>
          <p>Скорректируйте фильтры или вернитесь к выбору категории.</p>
          <div className="empty-actions">
            <button type="button" className="primary" onClick={resetFilters}>Сбросить фильтры</button>
            <Link to="/catalog" className="become-owner">Выбрать другую категорию</Link>
          </div>
        </div>
      ) : null}
      <div className="cards-grid">
        {venuesByCategory.slice(0, 48).map((venue) => (
          <article key={venue.id} className="venue-card">
            <Link to={`/venue/${venue.id}`} className="venue-link-card">
              <img src={venue.images[0]} alt={venue.title} loading="lazy" />
              <div className="card-body">
                <h3>{venue.title}</h3>
                <p><span className="category-pill">{venue.category}</span> · {venue.region}</p>
                <p>{venue.capacity} гостей · {venue.metroMinutes} мин</p>
                <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
                <span className="rating-corner">★ {venue.rating}</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function VenuePage() {
  const { id } = useParams();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarVenues, setSimilarVenues] = useState<Venue[]>([]);
  const [activeImage, setActiveImage] = useState("");
  const [venueLoading, setVenueLoading] = useState(true);
  const [lead, setLead] = useState({ name: "", phone: "", comment: "" });
  const [leadMessage, setLeadMessage] = useState("");

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    if (!venue || !id) return;
    applySeo({
      title: `${venue.title} — аренда площадки | VmestoRu`,
      description: `${venue.category} в ${venue.region}. Рейтинг ${venue.rating}, вместимость до ${venue.capacity} гостей, от ${formatRub(venue.pricePerHour)} ₽/час.`,
      path: `/venue/${id}`,
      type: "article",
      image: venue.images[0],
      jsonLd: [
        {
          id: "venue-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "Place",
            name: venue.title,
            description: venue.description,
            image: venue.images[0],
            address: {
              "@type": "PostalAddress",
              addressLocality: venue.city,
              addressRegion: venue.region,
              streetAddress: venue.address,
              addressCountry: "RU",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: venue.rating,
              reviewCount: venue.reviewsCount,
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "RUB",
              price: venue.pricePerHour,
              availability: "https://schema.org/InStock",
              url: `${SITE_URL}/venue/${id}`,
            },
          },
        },
        {
          id: "venue-breadcrumbs",
          payload: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE_URL}/catalog` },
              { "@type": "ListItem", position: 3, name: venue.category, item: `${SITE_URL}/category/${categoryToSlug(venue.category)}` },
              { "@type": "ListItem", position: 4, name: venue.title, item: `${SITE_URL}/venue/${id}` },
            ],
          },
        },
      ],
    });
  }, [venue, id]);

  async function load(): Promise<void> {
    if (!id) return;
    setVenueLoading(true);

    const [venueRes, reviewRes] = await Promise.all([
      fetch(`${API}/api/venues/${id}`),
      fetch(`${API}/api/venues/${id}/reviews`),
    ]);

    if (venueRes.ok) {
      const loadedVenue = (await venueRes.json()) as Venue;
      setVenue(loadedVenue);
      setActiveImage(loadedVenue.images[0] ?? "");
    }
    if (reviewRes.ok) setReviews((await reviewRes.json()) as Review[]);
    const similarRes = await fetch(`${API}/api/venues/${id}/similar`);
    if (similarRes.ok) setSimilarVenues((await similarRes.json()) as Venue[]);
    setVenueLoading(false);
  }

  async function sendLead(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!id) return;

    const response = await fetch(`${API}/api/venues/${id}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });

    const payload = await response.json();
    if (!response.ok) {
      setLeadMessage(payload.message ?? "Ошибка отправки заявки");
      return;
    }

    void trackEvent("lead_submit", { venueId: id });
    setLeadMessage(payload.message);
    setLead({ name: "", phone: "", comment: "" });
  }

  if (venueLoading || !venue) {
    return (
      <section className="section glass">
        <div className="skeleton-block" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
      </section>
    );
  }

  return (
    <section className="section glass venue-page reveal-on-scroll">
      <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Каталог", to: "/catalog" }, { label: venue.category, to: `/category/${categoryToSlug(venue.category)}` }, { label: venue.title }]} />
      <Link to="/" className="back-link">← Назад к поиску</Link>
      <img
        className="venue-hero"
        src={activeImage || venue.images[0]}
        alt={venue.title}
        onError={(e) => {
          if (e.currentTarget.src !== DEFAULT_OG_IMAGE) e.currentTarget.src = DEFAULT_OG_IMAGE;
        }}
      />
      {venue.images.length > 0 ? (
        <div className="venue-thumbs" aria-label="Фотографии площадки">
          {venue.images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={image === (activeImage || venue.images[0]) ? "venue-thumb active" : "venue-thumb"}
              onClick={() => setActiveImage(image)}
              aria-label={`Показать фото ${index + 1}`}
            >
              <img
                src={image}
                alt={`${venue.title} фото ${index + 1}`}
                loading="lazy"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_OG_IMAGE) e.currentTarget.src = DEFAULT_OG_IMAGE;
                }}
              />
            </button>
          ))}
        </div>
      ) : null}
      <p className="muted">Фото: {venue.images.length}</p>
      <div className="row-between">
        <h1>{venue.title}</h1>
        <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
      </div>
      <p>{venue.description}</p>

      <div className="info-grid">
        <div><strong>Категория</strong><p>{venue.category}</p></div>
        <div><strong>Адрес</strong><p>{venue.address}</p></div>
        <div><strong>Вместимость</strong><p>до {venue.capacity} гостей</p></div>
        <div><strong>От метро</strong><p>{venue.metroMinutes} минут</p></div>
        <div><strong>Рейтинг</strong><p>★ {venue.rating} ({venue.reviewsCount})</p></div>
        <div><strong>Отмена</strong><p>{venue.cancellationPolicy}</p></div>
      </div>

      <div className="phone-box">
        <h3>Телефон арендодателя</h3>
        <p>{venue.phone}</p>
      </div>

      <div className="amenities">
        {venue.amenities.map((item) => <span key={item}>{item}</span>)}
      </div>

      <form className="lead-form" onSubmit={sendLead}>
        <h3>Оставить заявку арендодателю</h3>
        <input placeholder="Ваше имя" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} required />
        <input placeholder="Телефон" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} required />
        <textarea placeholder="Комментарий" value={lead.comment} onChange={(e) => setLead({ ...lead, comment: e.target.value })} />
        <button type="submit" className="primary">Отправить заявку</button>
        {leadMessage ? <p className="ok">{leadMessage}</p> : null}
      </form>

      <section className="reviews-block">
        <h3>Отзывы</h3>
        <p className="muted">Публикуются только подтвержденные отзывы после модерации.</p>
        {reviews.length === 0 ? <p className="muted">Пока нет опубликованных отзывов. Новые отзывы появляются после проверки.</p> : null}
        {reviews.map((review) => (
          <article key={review.id}>
            <p>
              <strong>{review.author}</strong> · ★ {review.rating}{" "}
              {review.verified ? <span className="review-badge">Подтвержденный отзыв</span> : null}
            </p>
            <p>{review.text}</p>
          </article>
        ))}
      </section>

      {similarVenues.length > 0 ? (
        <section className="section similar-block reveal-on-scroll">
          <h3>Похожие площадки</h3>
          <div className="cards-grid">
            {similarVenues.map((item) => (
              <article key={item.id} className="venue-card">
                <Link to={`/venue/${item.id}`} className="venue-link-card">
                  <img src={item.images[0]} alt={item.title} />
                  <div className="card-body">
                    <h3>{item.title}</h3>
                    <p><span className="category-pill">{item.category}</span> · {item.region}</p>
                    <p className="price">от {formatRub(item.pricePerHour)} ₽/час</p>
                    <span className="rating-corner">★ {item.rating}</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function OwnerPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [owner, setOwner] = useState<Owner | null>(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [ownerVenues, setOwnerVenues] = useState<Venue[]>([]);
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboard | null>(null);
  const [ownerRequests, setOwnerRequests] = useState<OwnerLead[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState("");
  const [requestSlaFilter, setRequestSlaFilter] = useState("");
  const [requestQuery, setRequestQuery] = useState("");

  useEffect(() => {
    applySeo({
      title: "Кабинет арендодателя — VmestoRu",
      description: "Управление площадками, заявками и статусом подписки для арендодателей VmestoRu.",
      path: "/owner",
      noindex: true,
      jsonLd: [
        {
          id: "owner-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Кабинет арендодателя",
            url: `${SITE_URL}/owner`,
          },
        },
      ],
    });
  }, []);

  const [venueForm, setVenueForm] = useState({
    title: "",
    region: "Москва",
    city: "Москва",
    address: "",
    category: "Лофт",
    capacity: "50",
    pricePerHour: "5000",
    description: "",
    amenities: "Wi-Fi, Проектор, Звук",
    images: [] as string[]
  });
  const [photoUrlInput, setPhotoUrlInput] = useState("");

  async function auth(event: FormEvent): Promise<void> {
    event.preventDefault();

    const endpoint = mode === "login" ? "/api/owner/login" : "/api/owner/register";

    const payload = mode === "login"
      ? { email: authForm.email, password: authForm.password }
      : { name: authForm.name, email: authForm.email, password: authForm.password };

    const response = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await response.json();
    if (!response.ok) {
      setMessage(json.message ?? "Ошибка авторизации");
      return;
    }

    setOwner(json.owner as Owner);
    setMessage("Успешный вход");
    await loadOwnerVenues((json.owner as Owner).id);
    await loadOwnerDashboard((json.owner as Owner).id);
    await loadOwnerRequests((json.owner as Owner).id, "", "", "");
  }

  async function loadOwnerVenues(ownerId: string): Promise<void> {
    const response = await fetch(`${API}/api/owner/venues?ownerId=${encodeURIComponent(ownerId)}`);
    if (!response.ok) return;
    setOwnerVenues((await response.json()) as Venue[]);
  }

  async function loadOwnerDashboard(ownerId: string): Promise<void> {
    const response = await fetch(`${API}/api/owner/dashboard?ownerId=${encodeURIComponent(ownerId)}`);
    if (!response.ok) return;
    setOwnerDashboard((await response.json()) as OwnerDashboard);
  }

  async function loadOwnerRequests(ownerId: string, status: string, sla: string, q: string): Promise<void> {
    const params = new URLSearchParams({ ownerId });
    if (status) params.set("status", status);
    if (sla) params.set("sla", sla);
    if (q) params.set("q", q);
    const response = await fetch(`${API}/api/owner/requests?${params.toString()}`);
    if (!response.ok) return;
    setOwnerRequests((await response.json()) as OwnerLead[]);
  }

  async function addVenue(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!owner) return;
    if (venueForm.images.length < 3) {
      setMessage("Добавьте минимум 3 фотографии площадки");
      return;
    }

    const response = await fetch(`${API}/api/owner/venues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerId: owner.id,
        title: venueForm.title,
        region: venueForm.region,
        city: venueForm.city,
        address: venueForm.address,
        category: venueForm.category,
        capacity: Number(venueForm.capacity),
        pricePerHour: Number(venueForm.pricePerHour),
        description: venueForm.description,
        amenities: venueForm.amenities.split(",").map((item) => item.trim()).filter(Boolean),
        images: venueForm.images,
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setMessage(json.message ?? "Не удалось добавить площадку");
      return;
    }

    setMessage("Площадка добавлена");
    setVenueForm({
      ...venueForm,
      title: "",
      address: "",
      description: "",
      images: []
    });
    setPhotoUrlInput("");
    await loadOwnerVenues(owner.id);
    await loadOwnerDashboard(owner.id);
  }

  function addPhotoToVenue(): void {
    const normalized = photoUrlInput.trim();
    if (!normalized) return;
    try {
      const parsed = new URL(normalized);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setMessage("Ссылка на фото должна начинаться с http или https");
        return;
      }
    } catch {
      setMessage("Некорректная ссылка на фото");
      return;
    }

    if (venueForm.images.includes(normalized)) {
      setMessage("Это фото уже добавлено");
      return;
    }

    setVenueForm((prev) => ({ ...prev, images: [...prev.images, normalized] }));
    setPhotoUrlInput("");
    setMessage("");
  }

  function removePhotoFromVenue(index: number): void {
    setVenueForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  function promotePhoto(index: number): void {
    setVenueForm((prev) => {
      if (index <= 0 || index >= prev.images.length) return prev;
      const next = [...prev.images];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return { ...prev, images: next };
    });
  }

  async function deleteVenue(venueId: string): Promise<void> {
    if (!owner) return;
    const confirmed = window.confirm("Удалить площадку? Действие необратимо.");
    if (!confirmed) return;

    const response = await fetch(`${API}/api/owner/venues/${encodeURIComponent(venueId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: owner.id })
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setMessage(payload.message ?? "Не удалось удалить площадку");
      return;
    }

    setMessage("Площадка удалена");
    await loadOwnerVenues(owner.id);
    await loadOwnerDashboard(owner.id);
    await loadOwnerRequests(owner.id, requestStatusFilter, requestSlaFilter, requestQuery);
  }

  async function updateLeadStatus(requestId: string, status: OwnerLead["status"]): Promise<void> {
    if (!owner) return;
    const response = await fetch(`${API}/api/owner/requests/${encodeURIComponent(requestId)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: owner.id, status })
    });
    const json = await response.json();
    if (!response.ok) {
      setMessage(json.message ?? "Не удалось обновить статус");
      return;
    }
    await loadOwnerRequests(owner.id, requestStatusFilter, requestSlaFilter, requestQuery);
    await loadOwnerDashboard(owner.id);
  }

  async function applyRequestFilters(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!owner) return;
    await loadOwnerRequests(owner.id, requestStatusFilter, requestSlaFilter, requestQuery);
  }

  const nextAction = useMemo(() => {
    if (!owner) return "";
    if (owner.trialStatus === "expired") return "Пробный период завершен. Обратитесь в поддержку для продления доступа.";
    if (ownerVenues.length === 0) return "Добавьте первую площадку: минимум 3 фото и подробное описание.";
    const pending = ownerRequests.filter((item) => item.status === "new").length;
    if (pending > 0) return `У вас ${pending} новых заявок. Рекомендуем ответить в течение 30 минут для лучшей конверсии.`;
    return "Следующий шаг: улучшайте карточки (фото, удобства, описание) для роста конверсии.";
  }, [owner, ownerVenues.length, ownerRequests]);
  const hasAdminSession = Boolean(localStorage.getItem("vmestoru-admin-session")?.trim());

  return (
    <section className="section glass owner-page reveal-on-scroll">
      <h1>
        Кабинет <span className="grad">арендодателя</span>
      </h1>

      {!owner ? (
        <form className="owner-auth" onSubmit={auth}>
          <p className="ok">Для новых арендодателей действует 3 месяца бесплатного доступа.</p>
          <div className="tabs">
            <button type="button" className={mode === "login" ? "tab active" : "tab"} onClick={() => setMode("login")}>Вход</button>
            <button type="button" className={mode === "register" ? "tab active" : "tab"} onClick={() => setMode("register")}>Регистрация</button>
          </div>
          {mode === "register" ? (
            <input placeholder="Имя" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />
          ) : null}
          <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
          <input type="password" placeholder="Пароль" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
          <button type="submit" className="primary">{mode === "login" ? "Войти" : "Создать аккаунт"}</button>
        </form>
      ) : (
        <>
          {ownerDashboard ? (
            <section className="owner-dashboard">
              <article className="metric-card">
                <p>Просмотры (mock)</p>
                <strong>{ownerDashboard.metrics.viewsMock}</strong>
              </article>
              <article className="metric-card">
                <p>Заявки</p>
                <strong>{ownerDashboard.metrics.leadsTotal}</strong>
              </article>
              <article className="metric-card">
                <p>Подтверждено</p>
                <strong>{ownerDashboard.metrics.confirmedTotal}</strong>
              </article>
              <article className="metric-card">
                <p>Конверсия</p>
                <strong>{ownerDashboard.metrics.conversionRate}%</strong>
              </article>
            </section>
          ) : null}

          <div className="owner-status">
            <p><strong>{owner.name}</strong> ({owner.email})</p>
            <p>Статус запуска: 3 месяца бесплатно для новых арендодателей</p>
            <p>Пробный доступ до: {owner.trialEndsAt}</p>
            <p>{ownerDashboard?.trial ? `Осталось дней: ${ownerDashboard.trial.daysLeft}` : owner.trialStatus === "active" ? "Пробный доступ активен" : "Пробный доступ завершен"}</p>
            {nextAction ? <p className="next-action">{nextAction}</p> : null}
          </div>

          <div className="owner-admin-tools">
            <h3>Служебные инструменты</h3>
            <p className="muted">Модерация отзывов и anti-fraud проверка доступны в отдельной панели.</p>
            <Link to="/admin/reviews" className="primary owner-admin-link">Открыть модерацию отзывов</Link>
            <p className="muted">{hasAdminSession ? "Сессия модератора активна в этом браузере." : "Для входа в модерацию потребуется ключ доступа."}</p>
          </div>

          <form className="owner-venue-form" onSubmit={addVenue}>
            <h3>Добавить площадку (можно несколько)</h3>
            <label className="filter-item">
              <span>Название площадки</span>
              <input value={venueForm.title} onChange={(e) => setVenueForm({ ...venueForm, title: e.target.value })} placeholder="Например: Loft Aurora" required />
            </label>
            <label className="filter-item">
              <span>Полный адрес</span>
              <input value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} placeholder="Улица, дом, ориентир" required />
            </label>
            <div className="three-cols">
              <label className="filter-item">
                <span>Регион</span>
                <input
                  value={venueForm.region}
                  onChange={(e) => setVenueForm({ ...venueForm, region: e.target.value })}
                  placeholder="Например: Республика Коми"
                />
              </label>
              <label className="filter-item">
                <span>Город</span>
                <input
                  value={venueForm.city}
                  onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })}
                  placeholder="Например: Ухта"
                />
              </label>
              <label className="filter-item">
                <span>Вместимость</span>
                <input type="number" min="1" value={venueForm.capacity} onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })} />
              </label>
              <label className="filter-item">
                <span>Цена за час (₽)</span>
                <input type="number" min="1" value={venueForm.pricePerHour} onChange={(e) => setVenueForm({ ...venueForm, pricePerHour: e.target.value })} />
              </label>
            </div>
            <label className="filter-item">
              <span>Категория</span>
              <input value={venueForm.category} onChange={(e) => setVenueForm({ ...venueForm, category: e.target.value })} placeholder="Например: Лофт" />
            </label>
            <label className="filter-item">
              <span>Описание</span>
              <textarea value={venueForm.description} onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })} placeholder="Опишите формат, преимущества, ограничения" required />
            </label>
            <label className="filter-item">
              <span>Удобства (через запятую)</span>
              <input value={venueForm.amenities} onChange={(e) => setVenueForm({ ...venueForm, amenities: e.target.value })} placeholder="Wi-Fi, Проектор, Звук, Парковка" />
            </label>
            <div className="photo-builder">
              <label className="filter-item">
                <span>Добавить фотографию по ссылке</span>
                <input
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <button type="button" className="chip" onClick={addPhotoToVenue}>Добавить фото</button>
            </div>
            <p className="muted">Фото добавлено: {venueForm.images.length} (минимум 3). Первое фото будет обложкой.</p>
            <div className="photo-preview-grid">
              {venueForm.images.map((image, index) => (
                <article key={`${image}-${index}`} className="photo-preview-card">
                  <img src={image} alt={`Фото площадки ${index + 1}`} />
                  <div className="photo-preview-actions">
                    <button type="button" className="chip" onClick={() => promotePhoto(index)} disabled={index === 0}>
                      {index === 0 ? "Обложка" : "Сделать обложкой"}
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => removePhotoFromVenue(index)}>Удалить</button>
                  </div>
                </article>
              ))}
            </div>
            <button type="submit" className="primary">Добавить площадку</button>
          </form>

          <section className="owner-venues">
            <h3>Мои площадки: {ownerVenues.length}</h3>
            <div className="cards-grid">
              {ownerVenues.map((venue) => (
                <article key={venue.id} className="venue-card">
                  <img src={venue.images[0]} alt={venue.title} />
                  <div className="card-body">
                    <h3>{venue.title}</h3>
                    <p><span className="category-pill">{venue.category}</span></p>
                    <p>{venue.address}</p>
                    <span className="rating-corner">★ {venue.rating}</span>
                    <button type="button" className="ghost-btn owner-delete-btn" onClick={() => void deleteVenue(venue.id)}>Удалить</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {ownerDashboard?.completeness?.length ? (
            <section className="owner-completeness">
              <h3>Качество карточек</h3>
              {ownerDashboard.completeness.map((item) => (
                <article key={item.venueId} className="completeness-item">
                  <div className="row-between">
                    <strong>{item.venueTitle}</strong>
                    <span>{item.score}%</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${item.score}%` }} />
                  </div>
                  <p>{item.tip}</p>
                </article>
              ))}
            </section>
          ) : null}

          <section className="owner-requests">
            <h3>Заявки арендаторов</h3>
            <form className="requests-filters" onSubmit={applyRequestFilters}>
              <input
                placeholder="Поиск: имя, телефон, площадка"
                value={requestQuery}
                onChange={(e) => setRequestQuery(e.target.value)}
              />
              <select value={requestStatusFilter} onChange={(e) => setRequestStatusFilter(e.target.value)}>
                <option value="">Все статусы</option>
                <option value="new">Новые</option>
                <option value="in_progress">В работе</option>
                <option value="call_scheduled">Созвон</option>
                <option value="confirmed">Подтверждено</option>
                <option value="rejected">Отклонено</option>
              </select>
              <select value={requestSlaFilter} onChange={(e) => setRequestSlaFilter(e.target.value)}>
                <option value="">SLA: все</option>
                <option value="breached">SLA нарушен</option>
                <option value="ok">SLA в норме</option>
              </select>
              <button type="submit" className="chip">Применить</button>
            </form>
            {ownerRequests.length === 0 ? <p>Пока нет заявок</p> : null}
            {ownerRequests.map((request) => (
              <article key={request.id} className="request-card">
                <div className="row-between">
                  <strong>{request.name} · {request.phone}</strong>
                  <span className={request.isSlaBreached ? "sla-bad" : "sla-ok"}>
                    SLA {request.responseSlaMinutes} мин · прошло {request.ageMinutes} мин
                  </span>
                </div>
                <p>{request.venueTitle} · {request.venueAddress}</p>
                {request.comment ? <p>{request.comment}</p> : null}
                <div className="status-actions">
                  <button type="button" className="chip" onClick={() => void updateLeadStatus(request.id, "in_progress")}>В работе</button>
                  <button type="button" className="chip" onClick={() => void updateLeadStatus(request.id, "call_scheduled")}>Созвон</button>
                  <button type="button" className="chip" onClick={() => void updateLeadStatus(request.id, "confirmed")}>Подтвердить</button>
                  <button type="button" className="chip" onClick={() => void updateLeadStatus(request.id, "rejected")}>Отклонить</button>
                </div>
                <p className="muted">Текущий статус: {request.status}</p>
              </article>
            ))}
          </section>
        </>
      )}

      {message ? <p className="ok">{message}</p> : null}
    </section>
  );
}

function AdminReviewsPage() {
  const [adminAccessKey, setAdminAccessKey] = useState("");
  const [adminSession, setAdminSession] = useState(() => localStorage.getItem("vmestoru-admin-session") ?? "");
  const [adminSessionExpiresAt, setAdminSessionExpiresAt] = useState(() => localStorage.getItem("vmestoru-admin-session-expires-at") ?? "");
  const [moderatorName, setModeratorName] = useState(() => localStorage.getItem("vmestoru-moderator-name") ?? "Moderator");
  const [status, setStatus] = useState("pending");
  const [riskMin, setRiskMin] = useState("0");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [summary, setSummary] = useState<AdminReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeReviewId, setActiveReviewId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    applySeo({
      title: "Модерация отзывов — VmestoRu",
      description: "Очередь модерации отзывов с антифрод-сигналами и ручным подтверждением публикации.",
      path: "/admin/reviews",
      noindex: true,
      jsonLd: [
        {
          id: "admin-reviews-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Модерация отзывов",
            url: `${SITE_URL}/admin/reviews`,
          },
        },
      ],
    });
  }, []);

  useEffect(() => {
    if (!adminSession.trim()) return;
    void loadReviews(status);
  }, [status, adminSession]);

  useEffect(() => {
    if (!adminSession.trim()) return;
    void verifyAdminSession();
  }, []);

  function clearAdminSession(nextError = ""): void {
    setAdminSession("");
    setAdminSessionExpiresAt("");
    localStorage.removeItem("vmestoru-admin-session");
    localStorage.removeItem("vmestoru-admin-session-expires-at");
    if (nextError) setError(nextError);
  }

  async function verifyAdminSession(): Promise<void> {
    try {
      const response = await fetch(`${API}/api/admin/session`, {
        headers: { "x-admin-session": adminSession.trim() },
      });
      if (!response.ok) {
        clearAdminSession("Сессия модератора истекла. Войдите заново.");
        return;
      }
      const payload = (await response.json()) as { expiresAt?: string };
      if (payload.expiresAt) {
        setAdminSessionExpiresAt(payload.expiresAt);
        localStorage.setItem("vmestoru-admin-session-expires-at", payload.expiresAt);
      }
      void loadSummary();
    } catch {
      clearAdminSession("Не удалось проверить сессию модерации.");
    }
  }

  async function loginModerator(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!adminAccessKey.trim()) {
      setError("Введите ключ доступа модератора.");
      return;
    }
    setError("");
    try {
      const response = await fetch(`${API}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKey: adminAccessKey.trim(),
          moderator: moderatorName.trim() || "Moderator",
        }),
      });
      if (!response.ok) {
        setError(response.status === 403 ? "Неверный ключ доступа." : "Не удалось авторизоваться в модерации.");
        return;
      }
      const payload = (await response.json()) as { token: string; expiresAt: string };
      setAdminSession(payload.token);
      setAdminSessionExpiresAt(payload.expiresAt);
      setAdminAccessKey("");
      localStorage.setItem("vmestoru-admin-session", payload.token);
      localStorage.setItem("vmestoru-admin-session-expires-at", payload.expiresAt);
      await loadReviews(status);
      await loadSummary();
    } catch {
      setError("Ошибка сети при авторизации модератора.");
    }
  }

  async function loadReviews(nextStatus: string): Promise<void> {
    if (!adminSession.trim()) {
      setError("Введите ключ доступа и войдите в модерацию.");
      setReviews([]);
      return;
    }
    setLoading(true);
    setError("");
    const query = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : "";
    try {
      const response = await fetch(`${API}/api/admin/reviews${query}`, {
        headers: { "x-admin-session": adminSession.trim() },
      });
      if (!response.ok) {
        if (response.status === 403) {
          clearAdminSession("Сессия модератора истекла. Войдите заново.");
        } else {
          setError("Не удалось загрузить очередь модерации.");
        }
        setReviews([]);
      } else {
        setReviews((await response.json()) as AdminReview[]);
        setSelectedIds([]);
        void loadSummary();
      }
    } catch {
      setError("Ошибка сети при загрузке модерации.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  async function moderateReview(reviewId: string, nextStatus: "published" | "hidden"): Promise<void> {
    if (!adminSession.trim()) return;
    setActiveReviewId(reviewId);
    setError("");
    try {
      const response = await fetch(`${API}/api/admin/reviews/${encodeURIComponent(reviewId)}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-session": adminSession.trim(),
        },
        body: JSON.stringify({ status: nextStatus, note: notes[reviewId] ?? "", moderator: moderatorName.trim() || "Moderator" }),
      });
      if (!response.ok) {
        if (response.status === 403) {
          clearAdminSession("Сессия модератора истекла. Войдите заново.");
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? "Не удалось выполнить модерацию.");
        return;
      }
      await loadReviews(status);
    } finally {
      setActiveReviewId("");
    }
  }

  async function moderateBulk(nextStatus: "published" | "hidden"): Promise<void> {
    if (!adminSession.trim() || selectedIds.length === 0) return;
    setActiveReviewId("bulk");
    setError("");
    try {
      await Promise.all(
        selectedIds.map((reviewId) =>
          fetch(`${API}/api/admin/reviews/${encodeURIComponent(reviewId)}/moderate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-session": adminSession.trim(),
            },
            body: JSON.stringify({ status: nextStatus, note: notes[reviewId] ?? "", moderator: moderatorName.trim() || "Moderator" }),
          })
        )
      );
      await loadReviews(status);
    } catch {
      setError("Не удалось выполнить bulk-модерацию.");
    } finally {
      setActiveReviewId("");
    }
  }

  function toggleSelected(reviewId: string): void {
    setSelectedIds((prev) => (prev.includes(reviewId) ? prev.filter((id) => id !== reviewId) : [...prev, reviewId]));
  }

  function toggleAllFiltered(items: AdminReview[]): void {
    const ids = items.map((item) => item.id);
    if (!ids.length) return;
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  function saveAdminKey(event: FormEvent): void {
    void loginModerator(event);
  }

  async function loadSummary(): Promise<void> {
    if (!adminSession.trim()) return;
    try {
      const response = await fetch(`${API}/api/admin/reviews/summary`, {
        headers: { "x-admin-session": adminSession.trim() },
      });
      if (!response.ok) {
        if (response.status === 403) clearAdminSession("Сессия модератора истекла. Войдите заново.");
        return;
      }
      setSummary((await response.json()) as AdminReviewSummary);
    } catch {
      // ignore summary fetch errors
    }
  }

  const filteredReviews = useMemo(() => {
    const riskThreshold = Number.parseInt(riskMin || "0", 10);
    const minRisk = Number.isFinite(riskThreshold) ? Math.max(0, riskThreshold) : 0;
    return reviews.filter((item) => item.riskScore >= minRisk).filter((item) => (flaggedOnly ? item.riskFlags.length > 0 : true));
  }, [reviews, riskMin, flaggedOnly]);

  return (
    <section className="section glass reveal-on-scroll">
      <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Модерация отзывов" }]} />
      <h1>Модерация отзывов</h1>
      <p className="muted">Публикуйте только подтвержденные отзывы и скрывайте подозрительные кейсы по риск-флагам.</p>

      <form className="admin-key-form" onSubmit={saveAdminKey}>
        <label className="filter-item">
          <span>Ключ доступа</span>
          <input
            value={adminAccessKey}
            onChange={(e) => setAdminAccessKey(e.target.value)}
            placeholder="Введите ключ модератора"
          />
        </label>
        <button type="submit" className="primary">Войти</button>
        {adminSessionExpiresAt ? <span className="muted">Сессия до {new Date(adminSessionExpiresAt).toLocaleString("ru-RU")}</span> : null}
      </form>
      <div className="admin-filters">
        <label className="filter-item">
          <span>Имя модератора</span>
          <input
            value={moderatorName}
            onChange={(e) => {
              setModeratorName(e.target.value);
              localStorage.setItem("vmestoru-moderator-name", e.target.value);
            }}
            placeholder="Например, QA Lead"
          />
        </label>
      </div>

      {summary ? (
        <section className="moderation-summary">
          <article className="metric-card"><p>Всего</p><strong>{summary.total}</strong></article>
          <article className="metric-card"><p>Pending</p><strong>{summary.pending}</strong></article>
          <article className="metric-card"><p>High-risk pending</p><strong>{summary.highRiskPending}</strong></article>
          <article className="metric-card"><p>Avg risk pending</p><strong>{summary.avgRiskPending}</strong></article>
        </section>
      ) : null}

      <div className="admin-filters">
        <label className="filter-item">
          <span>Статус</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Ожидают</option>
            <option value="published">Опубликованы</option>
            <option value="hidden">Скрыты</option>
          </select>
        </label>
        <button type="button" className="ghost-btn" onClick={() => void loadReviews(status)}>Обновить</button>
      </div>
      <div className="admin-filters">
        <label className="filter-item">
          <span>Risk score от</span>
          <input type="number" min="0" max="100" value={riskMin} onChange={(e) => setRiskMin(e.target.value)} />
        </label>
        <label className="filter-item admin-flag-toggle">
          <span>Показывать только с флагами</span>
          <button type="button" className={flaggedOnly ? "chip active" : "chip"} onClick={() => setFlaggedOnly((prev) => !prev)}>
            {flaggedOnly ? "Да" : "Нет"}
          </button>
        </label>
      </div>
      <div className="moderation-toolbar">
        <button type="button" className="chip" onClick={() => toggleAllFiltered(filteredReviews)}>
          {filteredReviews.length > 0 && filteredReviews.every((item) => selectedIds.includes(item.id))
            ? "Снять выбор"
            : "Выбрать все"}
        </button>
        <span className="muted">Выбрано: {selectedIds.length}</span>
        <button type="button" className="primary" disabled={selectedIds.length === 0 || activeReviewId === "bulk"} onClick={() => void moderateBulk("published")}>
          Bulk: опубликовать
        </button>
        <button type="button" className="ghost-btn" disabled={selectedIds.length === 0 || activeReviewId === "bulk"} onClick={() => void moderateBulk("hidden")}>
          Bulk: скрыть
        </button>
      </div>

      {loading ? <p className="muted">Загрузка очереди модерации...</p> : null}
      {error ? <p className="error-note">{error}</p> : null}

      {!loading && !error && filteredReviews.length === 0 ? (
        <div className="empty-state">
          <h3>Очередь пуста</h3>
          <p>Для выбранных фильтров пока нет отзывов.</p>
        </div>
      ) : null}

      <div className="moderation-list">
        {filteredReviews.map((review) => (
          <article key={review.id} className="moderation-card">
            <div className="row-between">
              <strong>{review.venueTitle}</strong>
              <div className="moderation-meta">
                <button
                  type="button"
                  className={selectedIds.includes(review.id) ? "chip active" : "chip"}
                  onClick={() => toggleSelected(review.id)}
                >
                  {selectedIds.includes(review.id) ? "Выбрано" : "Выбрать"}
                </button>
                <span className="chip">★ {review.rating}</span>
              </div>
            </div>
            <p className="muted">
              {review.author} · {new Date(review.createdAt).toLocaleString("ru-RU")}
            </p>
            <p>{review.text}</p>
            <p className={review.riskScore >= 60 ? "risk-high" : "muted"}>Risk score: {review.riskScore}</p>
            <p className="muted">Флаги: {review.riskFlags.length ? review.riskFlags.join(", ") : "нет"}</p>
            <textarea
              placeholder="Комментарий модератора (необязательно)"
              value={notes[review.id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [review.id]: e.target.value }))}
            />
            <div className="empty-actions">
              <button
                type="button"
                className="primary"
                onClick={() => void moderateReview(review.id, "published")}
                disabled={activeReviewId === review.id}
              >
                Опубликовать
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => void moderateReview(review.id, "hidden")}
                disabled={activeReviewId === review.id}
              >
                Скрыть
              </button>
            </div>
          </article>
        ))}
      </div>
      {summary?.recentActions?.length ? (
        <section className="section similar-block reveal-on-scroll">
          <h3>Последние действия модерации</h3>
          {summary.recentActions.slice(0, 6).map((item) => (
            <p key={item.id} className="muted">
              {new Date(item.createdAt).toLocaleString("ru-RU")} · {item.moderator} · {item.reviewId}: {item.previousStatus} → {item.nextStatus}
            </p>
          ))}
        </section>
      ) : null}
    </section>
  );
}

function PrivacyPage() {
  useEffect(() => {
    applySeo({
      title: "Политика конфиденциальности — VmestoRu",
      description: "Политика обработки персональных данных сервиса VmestoRu.",
      path: "/privacy",
      jsonLd: [
        {
          id: "privacy-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Политика конфиденциальности",
            url: `${SITE_URL}/privacy`,
          },
        },
      ],
    });
  }, []);

  return (
    <section className="section glass legal-page reveal-on-scroll">
      <h1>Политика конфиденциальности</h1>
      <p>
        Настоящая политика описывает, как сервис VmestoRu собирает, использует, хранит и защищает персональные данные
        пользователей в соответствии с требованиями законодательства РФ.
      </p>
      <h3>1. Какие данные мы обрабатываем</h3>
      <p>Имя, телефон, email (если указан), тексты заявок и обращений, технические данные устройства, cookies, действия в интерфейсе.</p>
      <h3>2. Цели обработки</h3>
      <p>Подбор площадок, передача заявок арендодателям, поддержка пользователей, предотвращение злоупотреблений, аналитика качества сервиса.</p>
      <h3>3. Правовые основания</h3>
      <p>Обработка выполняется на основании согласия пользователя, исполнения пользовательского запроса и законных интересов оператора.</p>
      <h3>4. Передача третьим лицам</h3>
      <p>Данные передаются только тем лицам и сервисам, которые участвуют в оказании услуги: арендодателям, хостинг-провайдерам, Telegram API (для поддержки и уведомлений).</p>
      <h3>5. Сроки хранения</h3>
      <p>Данные хранятся не дольше, чем это требуется для целей обработки и выполнения обязательств по заявке, если более длительный срок не установлен законом.</p>
      <h3>6. Права пользователя</h3>
      <p>Пользователь вправе запросить уточнение, обновление, ограничение или удаление своих данных, а также отозвать согласие на обработку.</p>
      <h3>7. Cookies</h3>
      <p>Cookies используются для сохранения настроек интерфейса, стабильной работы сайта и аналитики пользовательских сценариев.</p>
      <h3>8. Безопасность</h3>
      <p>Мы применяем организационные и технические меры защиты, включая ограничение доступа, журналирование административных действий и шифрование трафика (HTTPS).</p>
      <h3>9. Контакты оператора</h3>
      <p>По вопросам персональных данных и конфиденциальности: +7 (995) 592-62-60, Telegram поддержки и форма обращения в разделе “Поддержка”.</p>
    </section>
  );
}

function NotFoundPage() {
  const location = useLocation();

  useEffect(() => {
    applySeo({
      title: "Страница не найдена — VmestoRu",
      description: "Запрошенная страница не найдена. Перейдите в каталог площадок VmestoRu.",
      path: location.pathname || "/404",
      noindex: true,
      jsonLd: [
        {
          id: "not-found-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "404",
            url: `${SITE_URL}${location.pathname || "/404"}`,
          },
        },
      ],
    });
  }, [location.pathname]);

  return (
    <section className="section glass reveal-on-scroll">
      <h1>Страница не найдена</h1>
      <div className="empty-state">
        <p>Похоже, ссылка устарела или была введена с ошибкой.</p>
        <div className="empty-actions">
          <Link to="/" className="primary">На главную</Link>
          <Link to="/catalog" className="become-owner">Открыть каталог</Link>
        </div>
      </div>
    </section>
  );
}

function CookieBanner() {
  const [accepted, setAccepted] = useState(() => localStorage.getItem("vmestoru-cookie-consent") === "accepted");
  if (accepted) return null;

  return (
    <div className="cookie-banner glass">
      <p>Мы используем cookies для стабильной работы сервиса и аналитики.</p>
      <div className="cookie-actions">
        <Link to="/privacy">Политика конфиденциальности</Link>
        <button
          type="button"
          className="primary"
          onClick={() => {
            localStorage.setItem("vmestoru-cookie-consent", "accepted");
            setAccepted(true);
          }}
        >
          Принять
        </button>
      </div>
    </div>
  );
}

function Footer() {
  const [supportForm, setSupportForm] = useState({ name: "", phone: "", message: "" });
  const [supportMessage, setSupportMessage] = useState("");
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);

  async function sendSupportRequest(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSupportMessage("");
    const response = await fetch(`${API}/api/support/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...supportForm, page: window.location.pathname })
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setSupportMessage(payload.message ?? "Не удалось отправить запрос. Попробуйте позже.");
      return;
    }
    setSupportMessage(payload.message ?? "Запрос отправлен.");
    setSupportForm({ name: "", phone: "", message: "" });
  }

  return (
    <footer id="support" className="footer glass">
      <div className="footer-grid">
        <div>
          <Link to="/" className="footer-brand" aria-label="VmestoRu — на главную">
            <img src="/favicon.svg" alt="Логотип VmestoRu" className="footer-brand-logo" width={28} height={28} />
            <strong>VmestoRu</strong>
          </Link>
          <p>Премиальная платформа аренды площадок под мероприятия.</p>
        </div>
        <div>
          <h4>Навигация</h4>
          <p><Link to="/">Каталог</Link></p>
          <p><Link to="/owner">Арендодателю</Link></p>
          <p><Link to="/privacy">Политика конфиденциальности</Link></p>
        </div>
        <div>
          <h4>Контакты</h4>
          <p>+7 (995) 592-62-60</p>
          <button type="button" className="primary support-open-btn" onClick={() => setSupportModalOpen(true)}>
            Написать в поддержку
          </button>
        </div>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} VmestoRu. Все права защищены.</p>
      {isSupportModalOpen ? (
        <div
          className="support-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-modal-title"
          onClick={() => setSupportModalOpen(false)}
        >
          <div className="support-modal glass" onClick={(event) => event.stopPropagation()}>
            <div className="support-modal-head">
              <h4 id="support-modal-title">Написать в поддержку</h4>
              <button type="button" className="ghost-btn" onClick={() => setSupportModalOpen(false)}>Закрыть</button>
            </div>
            <form className="support-form" onSubmit={sendSupportRequest}>
              <p className="muted">Заполните форму, и команда свяжется с вами.</p>
              <div className="support-grid">
                <input
                  placeholder="Ваше имя"
                  value={supportForm.name}
                  onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                  required
                />
                <input
                  placeholder="Телефон"
                  value={supportForm.phone}
                  onChange={(e) => setSupportForm({ ...supportForm, phone: e.target.value })}
                  required
                />
              </div>
              <textarea
                placeholder="Опишите вопрос или проблему"
                value={supportForm.message}
                onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                required
              />
              <button type="submit" className="primary">Отправить в поддержку</button>
              {supportMessage ? <p className="ok">{supportMessage}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </footer>
  );
}

function App() {
  const [theme, toggleTheme] = useTheme();
  return (
    <BrowserRouter>
      <AppContent theme={theme} onToggleTheme={toggleTheme} />
    </BrowserRouter>
  );
}

function AppContent({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const location = useLocation();
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || "Unknown frontend error";
      void reportFrontendError(message, "error");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : event.reason?.message || JSON.stringify(event.reason ?? "Unknown rejection");
      void reportFrontendError(reason, "unhandledrejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    if (targets.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.18 }
    );

    targets.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <div className="animated-background" aria-hidden="true" />
      <Header theme={theme} onToggleTheme={onToggleTheme} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/venue/:id" element={<VenuePage />} />
          <Route path="/owner" element={<OwnerPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
