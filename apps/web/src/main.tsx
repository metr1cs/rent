import React, { type ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
type AdminOverview = {
  moderator: string;
  generatedAt: string;
  totals: {
    owners: number;
    venues: number;
    publishedVenues: number;
    hiddenVenues: number;
    leads: number;
    supportRequests: number;
    reviews: number;
    pendingReviews: number;
  };
  leads: Record<"new" | "in_progress" | "call_scheduled" | "confirmed" | "rejected", number>;
  support: Record<"new" | "in_progress" | "resolved" | "rejected", number>;
};
type AdminOwnerRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  trialStatus: "active" | "expired";
  trialEndsAt: string;
  subscriptionStatus: "inactive" | "active";
  nextBillingDate: string | null;
  venuesCount: number;
  leadsCount: number;
};
type AdminVenueRow = Venue & {
  ownerName: string;
  ownerEmail: string;
  leadsCount: number;
};
type AdminLeadRow = OwnerLead & {
  ownerId: string;
  ownerName: string;
};
type AdminSupportRow = {
  id: string;
  name: string;
  phone: string;
  message: string;
  page: string;
  status: "new" | "in_progress" | "resolved" | "rejected";
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
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
  areaMin: string;
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
type UiLanguage = "ru" | "en" | "zh" | "es" | "fr" | "de" | "ar" | "hi" | "pt";
type UiCopy = {
  brandTagline: string;
  catalog: string;
  howToUse: string;
  forOwners: string;
  backToCatalog: string;
  language: string;
  openMenu: string;
  switchTheme: string;
  footerNav: string;
  footerCatalog: string;
  footerOwner: string;
  footerPrivacy: string;
  footerContacts: string;
  footerSupportButton: string;
  footerLead: string;
};

const uiCopy: Record<UiLanguage, UiCopy> = {
  ru: {
    brandTagline: "Премиальная аренда площадок для мероприятий",
    catalog: "Каталог",
    howToUse: "Как пользоваться",
    forOwners: "Для арендодателей",
    backToCatalog: "Назад в каталог",
    language: "Язык",
    openMenu: "Открыть меню",
    switchTheme: "Переключить тему",
    footerNav: "Навигация",
    footerCatalog: "Каталог",
    footerOwner: "Арендодателю",
    footerPrivacy: "Политика конфиденциальности",
    footerContacts: "Контакты",
    footerSupportButton: "Написать в поддержку",
    footerLead: "Премиальная платформа аренды площадок под мероприятия."
  },
  en: {
    brandTagline: "Premium event space rentals",
    catalog: "Catalog",
    howToUse: "How it works",
    forOwners: "For owners",
    backToCatalog: "Back to catalog",
    language: "Language",
    openMenu: "Open menu",
    switchTheme: "Switch theme",
    footerNav: "Navigation",
    footerCatalog: "Catalog",
    footerOwner: "For owners",
    footerPrivacy: "Privacy policy",
    footerContacts: "Contacts",
    footerSupportButton: "Contact support",
    footerLead: "Premium platform for event venue rentals."
  },
  zh: {
    brandTagline: "高端活动场地租赁平台",
    catalog: "目录",
    howToUse: "使用方式",
    forOwners: "房东入口",
    backToCatalog: "返回目录",
    language: "语言",
    openMenu: "打开菜单",
    switchTheme: "切换主题",
    footerNav: "导航",
    footerCatalog: "目录",
    footerOwner: "房东入口",
    footerPrivacy: "隐私政策",
    footerContacts: "联系方式",
    footerSupportButton: "联系支持",
    footerLead: "高端活动场地租赁平台。"
  },
  es: {
    brandTagline: "Alquiler premium de espacios para eventos",
    catalog: "Catalogo",
    howToUse: "Como funciona",
    forOwners: "Para propietarios",
    backToCatalog: "Volver al catalogo",
    language: "Idioma",
    openMenu: "Abrir menu",
    switchTheme: "Cambiar tema",
    footerNav: "Navegacion",
    footerCatalog: "Catalogo",
    footerOwner: "Para propietarios",
    footerPrivacy: "Politica de privacidad",
    footerContacts: "Contactos",
    footerSupportButton: "Contactar soporte",
    footerLead: "Plataforma premium de alquiler de espacios para eventos."
  },
  fr: {
    brandTagline: "Location premium d'espaces evenementiels",
    catalog: "Catalogue",
    howToUse: "Comment ca marche",
    forOwners: "Pour les proprietaires",
    backToCatalog: "Retour au catalogue",
    language: "Langue",
    openMenu: "Ouvrir le menu",
    switchTheme: "Changer le theme",
    footerNav: "Navigation",
    footerCatalog: "Catalogue",
    footerOwner: "Pour les proprietaires",
    footerPrivacy: "Politique de confidentialite",
    footerContacts: "Contacts",
    footerSupportButton: "Contacter le support",
    footerLead: "Plateforme premium de location d'espaces evenementiels."
  },
  de: {
    brandTagline: "Premium-Mietplattform fur Eventflachen",
    catalog: "Katalog",
    howToUse: "So funktioniert's",
    forOwners: "Fur Vermieter",
    backToCatalog: "Zuruck zum Katalog",
    language: "Sprache",
    openMenu: "Menu offnen",
    switchTheme: "Thema wechseln",
    footerNav: "Navigation",
    footerCatalog: "Katalog",
    footerOwner: "Fur Vermieter",
    footerPrivacy: "Datenschutzrichtlinie",
    footerContacts: "Kontakte",
    footerSupportButton: "Support kontaktieren",
    footerLead: "Premium-Plattform fur die Vermietung von Eventflachen."
  },
  ar: {
    brandTagline: "منصة مميزة لتأجير أماكن الفعاليات",
    catalog: "الكتالوج",
    howToUse: "كيفية الاستخدام",
    forOwners: "للملاك",
    backToCatalog: "العودة إلى الكتالوج",
    language: "اللغة",
    openMenu: "فتح القائمة",
    switchTheme: "تبديل المظهر",
    footerNav: "التنقل",
    footerCatalog: "الكتالوج",
    footerOwner: "للملاك",
    footerPrivacy: "سياسة الخصوصية",
    footerContacts: "جهات الاتصال",
    footerSupportButton: "تواصل مع الدعم",
    footerLead: "منصة مميزة لتأجير أماكن الفعاليات."
  },
  hi: {
    brandTagline: "इवेंट स्पेस रेंटल के लिए प्रीमियम प्लेटफॉर्म",
    catalog: "कैटलॉग",
    howToUse: "कैसे उपयोग करें",
    forOwners: "मालिकों के लिए",
    backToCatalog: "कैटलॉग पर वापस",
    language: "भाषा",
    openMenu: "मेनू खोलें",
    switchTheme: "थीम बदलें",
    footerNav: "नेविगेशन",
    footerCatalog: "कैटलॉग",
    footerOwner: "मालिकों के लिए",
    footerPrivacy: "गोपनीयता नीति",
    footerContacts: "संपर्क",
    footerSupportButton: "सपोर्ट से संपर्क करें",
    footerLead: "इवेंट स्पेस रेंटल के लिए प्रीमियम प्लेटफॉर्म।"
  },
  pt: {
    brandTagline: "Plataforma premium de locacao de espacos para eventos",
    catalog: "Catalogo",
    howToUse: "Como usar",
    forOwners: "Para proprietarios",
    backToCatalog: "Voltar ao catalogo",
    language: "Idioma",
    openMenu: "Abrir menu",
    switchTheme: "Alternar tema",
    footerNav: "Navegacao",
    footerCatalog: "Catalogo",
    footerOwner: "Para proprietarios",
    footerPrivacy: "Politica de privacidade",
    footerContacts: "Contatos",
    footerSupportButton: "Falar com suporte",
    footerLead: "Plataforma premium de locacao de espacos para eventos."
  }
};

const envApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const inferredApiBase =
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8090"
    : "";
const rawApiBase = envApiBase && envApiBase.length > 0 ? envApiBase : inferredApiBase;
const API = rawApiBase.endsWith("/") ? rawApiBase.slice(0, -1) : rawApiBase;
const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || "https://vmestoru.ru").replace(/\/+$/, "");
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon-512x512.png`;
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

const OWNER_POPULAR_AMENITIES = [
  "Wi-Fi",
  "Проектор",
  "Звук",
  "Парковка",
  "Сцена",
  "Кухня",
  "Кондиционер",
  "Гардероб",
  "Флипчарт",
  "Отдельный вход",
];

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

function regionToSlug(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, "-"));
}

function categoryWebpArt(name: string): string {
  const index = CATEGORY_ART_ORDER.findIndex((item) => item === name);
  if (index >= 0) return `/catalog-art/c${String(index + 1).padStart(2, "0")}.webp`;
  return "/catalog-art/c01.webp";
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

function dataUrlSizeBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) return 0;
  return Math.floor((base64.length * 3) / 4);
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

function useLanguage(): [UiLanguage, (next: UiLanguage) => void] {
  const [language, setLanguage] = useState<UiLanguage>(() => {
    const saved = localStorage.getItem("vmestoru-language");
    const allowed: UiLanguage[] = ["ru", "en", "zh", "es", "fr", "de", "ar", "hi", "pt"];
    return allowed.includes(saved as UiLanguage) ? (saved as UiLanguage) : "ru";
  });

  useEffect(() => {
    localStorage.setItem("vmestoru-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return [language, (next) => setLanguage(next)];
}

function DateField({ value, onChange }: { value: Date | undefined; onChange: (date: Date | undefined) => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <div className="date-picker-wrap">
      <button type="button" className="date-trigger" onClick={() => setOpened((prev) => !prev)}>
        {value ? value.toLocaleDateString("ru-RU") : "Выберите дату"}
      </button>
      {opened ? (
        <div className="date-modal-overlay" onClick={() => setOpened(false)}>
          <div className="date-popover" role="dialog" aria-modal="true" aria-label="Выбор даты" onClick={(event) => event.stopPropagation()}>
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

function Header({
  theme,
  onToggleTheme,
  language,
  onLanguageChange
}: {
  theme: Theme;
  onToggleTheme: () => void;
  language: UiLanguage;
  onLanguageChange: (next: UiLanguage) => void;
}) {
  const location = useLocation();
  const isOwnerRoute = location.pathname.startsWith("/owner");
  const [menuOpen, setMenuOpen] = useState(false);
  const t = uiCopy[language];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="header glass">
      <Link to="/" className="brand brand-link" aria-label="VmestoRu — на главную">
        <img src="/favicon.svg" alt="Логотип VmestoRu" className="brand-logo" width={68} height={68} />
        <div>
          <strong>VmestoRu</strong>
          <p>{t.brandTagline}</p>
        </div>
      </Link>
      <nav className="header-nav">
        <Link to="/catalog">{t.catalog}</Link>
        <a href="/#how-it-works">{t.howToUse}</a>
      </nav>

      <div className="header-controls">
        <button
          type="button"
          className={menuOpen ? "header-burger is-open" : "header-burger"}
          aria-label={t.openMenu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={menuOpen ? "header-menu open" : "header-menu"}>
        <div className="header-actions">
          <Link to={isOwnerRoute ? "/" : "/owner"} className="become-owner">
            {isOwnerRoute ? t.backToCatalog : t.forOwners}
          </Link>
          <label className="filter-item header-language">
            <span>{t.language}</span>
            <select value={language} onChange={(e) => onLanguageChange(e.target.value as UiLanguage)}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ar">العربية</option>
              <option value="hi">हिन्दी</option>
              <option value="pt">Português</option>
            </select>
          </label>
          <button
            type="button"
            className={theme === "dark" ? "theme-switch is-dark" : "theme-switch"}
            onClick={onToggleTheme}
            aria-label={t.switchTheme}
            title={t.switchTheme}
          >
            <span className="theme-switch-track" aria-hidden="true">
              <span className="theme-switch-thumb">{theme === "light" ? "☀" : "☾"}</span>
            </span>
          </button>
        </div>
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
  const [areaMin, setAreaMin] = useState("");
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
            email: "info@vmestoru.ru",
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
            email: "info@vmestoru.ru",
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
    if (areaMin) params.set("areaMin", areaMin);
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
    setAreaMin("");
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
      label: [category || "Все категории", region || "Все регионы", capacity ? `${capacity} гостей` : "", areaMin ? `от ${areaMin} м2` : ""].filter(Boolean).join(" · "),
      query,
      region,
      category,
      capacity,
      areaMin,
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
    setAreaMin(item.areaMin ?? "");
    setDate(item.date ? new Date(item.date) : undefined);
    setSort(item.sort);
    setQuickFilters(item.quickFilters);

    const params = new URLSearchParams();
    if (item.query) params.set("q", item.query);
    if (item.region) params.set("region", item.region);
    if (item.category) params.set("category", item.category);
    if (item.capacity) params.set("capacity", item.capacity);
    if (item.areaMin) params.set("areaMin", item.areaMin);
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
            <span>Площадь (м2)</span>
            <input type="number" min="1" placeholder="Например, 120" value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
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
                  <p>{venue.areaSqm} м2 · {venue.capacity} гостей</p>
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
                  <p>{venue.areaSqm} м2 · {venue.capacity} гостей · {venue.metroMinutes} мин</p>
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
              <div className="category-tile-placeholder">скоро появится фото</div>
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
                  <p>{venue.areaSqm} м2 · {venue.capacity} гостей</p>
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
            <Link key={item} to={`/city/${regionToSlug(item)}`} className="seo-link-pill muted-city">{item}</Link>
          ))}
        </div>
        <div className="static-category-grid">
          {homeCategoryCards.map((item) => (
            <Link key={`home-static-${item.id}`} className="static-category-card" to={`/category/${categoryToSlug(item.name)}`}>
              <div className="static-category-placeholder">скоро появится фото</div>
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

  const visibleVenues = useMemo(() => {
    return venues
      .filter((item) => (region ? item.region === region : true))
      .filter((item) => {
        if (!query) return true;
        const normalized = query.trim().toLowerCase();
        return `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(normalized);
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 48);
  }, [venues, region, query]);

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
            <div className="category-tile-placeholder">скоро появится фото</div>
            <div className="category-tile-body">
              <h3>{item.name}</h3>
              <p>{item.count} площадок</p>
            </div>
          </Link>
        ))}
      </div>
      <section className="section glass reveal-on-scroll">
        <div className="row-between">
          <h2>Площадки в каталоге</h2>
          <span>{visibleVenues.length} вариантов</span>
        </div>
        {visibleVenues.length === 0 ? <p className="muted">По текущим фильтрам площадок не найдено.</p> : null}
        <div className="cards-grid">
          {visibleVenues.map((venue) => (
            <article key={`catalog-venue-${venue.id}`} className="venue-card" onClick={() => navigate(`/venue/${venue.id}`)}>
              <img src={venue.images[0]} alt={venue.title} loading="lazy" />
              <div className="card-body">
                <h3>{venue.title}</h3>
                <p><span className="category-pill">{venue.category}</span> · {venue.region}</p>
                <p>{venue.areaSqm} м2 · {venue.capacity} гостей</p>
                <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
                <span className="rating-corner">★ {venue.rating}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
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
            <Link key={item} to={`/city/${regionToSlug(item)}`} className="seo-link-pill muted-city">{item}</Link>
          ))}
        </div>
        <div className="static-category-grid">
          {categoryCards.map((item) => (
            <Link key={`catalog-static-${item.id}`} className="static-category-card" to={`/category/${categoryToSlug(item.name)}`}>
              <div className="static-category-placeholder">скоро появится фото</div>
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

function CityPage() {
  const { citySlug } = useParams();
  const [regionName, setRegionName] = useState("");
  const [categoryCards, setCategoryCards] = useState<Array<{ id: string; name: string; image: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void bootstrap();
  }, [citySlug]);

  useEffect(() => {
    if (!citySlug) return;
    const path = `/city/${citySlug}`;
    applySeo({
      title: `${regionName || "Город"} — аренда площадок по категориям | VmestoRu`,
      description: `Каталог площадок по категориям в городе ${regionName || "..."}. Выбирайте формат и переходите к релевантным локациям.`,
      path,
      noindex: !regionName || categoryCards.length === 0,
      jsonLd: [
        {
          id: "city-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Каталог площадок: ${regionName || "Город"}`,
            url: `${SITE_URL}${path}`,
          },
        },
      ],
    });
  }, [citySlug, regionName, categoryCards.length]);

  async function bootstrap(): Promise<void> {
    if (!citySlug) return;
    setLoading(true);
    setError("");
    try {
      const [categoriesRes, venuesRes] = await Promise.all([fetch(`${API}/api/categories`), fetch(`${API}/api/venues`)]);
      if (!categoriesRes.ok || !venuesRes.ok) {
        setError("Не удалось загрузить страницу города.");
        setCategoryCards([]);
        setRegionName("");
        return;
      }
      const categories = (await categoriesRes.json()) as Category[];
      const venues = (await venuesRes.json()) as Venue[];
      const allRegions = [...new Set(venues.map((item) => item.region))];
      const resolvedRegion = allRegions.find((item) => regionToSlug(item) === citySlug) ?? "";
      setRegionName(resolvedRegion);
      if (!resolvedRegion) {
        setCategoryCards([]);
        setError("Город не найден в каталоге.");
        return;
      }
      const cards = categories
        .map((category) => {
          const count = venues.filter((venue) => venue.category === category.name && venue.region === resolvedRegion).length;
          return {
            id: category.id,
            name: category.name,
            image: categoryWebpArt(category.name),
            count,
          };
        })
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru-RU"));
      setCategoryCards(cards);
    } catch {
      setError("Ошибка сети при загрузке города.");
      setCategoryCards([]);
      setRegionName("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section glass reveal-on-scroll">
      <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Каталог", to: "/catalog" }, { label: regionName || "Город" }]} />
      <h1>Площадки в городе: <span className="grad">{regionName || "..."}</span></h1>
      {loading ? <p className="muted">Загрузка...</p> : null}
      {!loading && error ? <p className="error-note">{error}</p> : null}
      {!loading && !error ? (
        <div className="category-grid">
          {categoryCards.map((item) => (
            <Link key={item.id} className="category-tile" to={`/category/${categoryToSlug(item.name)}/${regionToSlug(regionName)}`}>
              <div className="category-tile-placeholder">скоро появится фото</div>
              <div className="category-tile-body">
                <h3>{item.name}</h3>
                <p>{item.count} площадок</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CategoryPage() {
  const { slug, citySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryName, setCategoryName] = useState("");
  const [lockedRegion, setLockedRegion] = useState("");
  const [venuesByCategory, setVenuesByCategory] = useState<Venue[]>([]);
  const [categoryUniverse, setCategoryUniverse] = useState<Venue[]>([]);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [region, setRegion] = useState(citySlug ? "" : (searchParams.get("region") ?? ""));
  const [capacity, setCapacity] = useState(searchParams.get("capacity") ?? "");
  const [areaMin, setAreaMin] = useState(searchParams.get("areaMin") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setRegion(citySlug ? "" : (searchParams.get("region") ?? ""));
    setCapacity(searchParams.get("capacity") ?? "");
    setAreaMin(searchParams.get("areaMin") ?? "");
    setSort(searchParams.get("sort") || "recommended");
    void loadCategory();
  }, [slug, citySlug, searchParams]);

  useEffect(() => {
    if (!slug || !categoryName) return;
    const basePath = citySlug ? `/category/${slug}/${citySlug}` : `/category/${slug}`;
    const hasSeoFilters = Boolean(query || capacity || areaMin || sort !== "recommended" || (!citySlug && region));
    const normalizedRegion = citySlug ? lockedRegion : region;
    const titleRegionSuffix = normalizedRegion ? ` в ${normalizedRegion}` : "";
    const descriptionRegionSuffix = normalizedRegion ? ` в городе ${normalizedRegion}` : "";
    void trackEvent("category_open", { category: categoryName, source: "direct" });
    applySeo({
      title: `${categoryName}${titleRegionSuffix} — аренда площадок | VmestoRu`,
      description: `Подбор площадок категории «${categoryName}»${descriptionRegionSuffix}: сравнивайте рейтинг, цену и доступность в городах России.`,
      path: basePath,
      noindex: hasSeoFilters || (citySlug ? !lockedRegion : false),
      jsonLd: [
        {
          id: "category-page",
          payload: {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${categoryName}${titleRegionSuffix} — каталог площадок`,
            url: `${SITE_URL}${basePath}`,
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
              ...(lockedRegion
                ? [{ "@type": "ListItem", position: 4, name: lockedRegion, item: `${SITE_URL}${basePath}` }]
                : []),
            ],
          },
        },
      ],
    });
  }, [categoryName, slug, citySlug, lockedRegion, query, capacity, areaMin, sort, region]);

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
      let universeData: Venue[] = [];
      if (universeRes.ok) {
        universeData = (await universeRes.json()) as Venue[];
        setCategoryUniverse(universeData);
      } else {
        setCategoryUniverse([]);
      }

      const resolvedRegion = citySlug
        ? [...new Set(universeData.map((item) => item.region))].find((item) => regionToSlug(item) === citySlug) ?? ""
        : "";
      setLockedRegion(resolvedRegion);
      if (citySlug) setRegion(resolvedRegion);

      const params = new URLSearchParams();
      params.set("category", resolvedName);
      if (query) params.set("q", query);
      const effectiveRegion = citySlug ? resolvedRegion : region;
      if (effectiveRegion) params.set("region", effectiveRegion);
      if (capacity) params.set("capacity", capacity);
      if (areaMin) params.set("areaMin", areaMin);
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
    if (!citySlug && region) params.set("region", region);
    if (capacity) params.set("capacity", capacity);
    if (areaMin) params.set("areaMin", areaMin);
    if (sort) params.set("sort", sort);
    void trackEvent("category_filter_apply", {
      category: categoryName || slug || "",
      region: citySlug ? (lockedRegion || "all") : (region || "all"),
      hasQuery: Boolean(query),
      hasCapacity: Boolean(capacity),
      hasAreaMin: Boolean(areaMin),
      sort,
    });
    setSearchParams(params);
  }

  function resetFilters(): void {
    setQuery("");
    setRegion(citySlug ? lockedRegion : "");
    setCapacity("");
    setAreaMin("");
    setSort("recommended");
    setSearchParams(new URLSearchParams({ sort: "recommended" }));
  }

  const regions = useMemo(() => [...new Set(categoryUniverse.map((item) => item.region))], [categoryUniverse]);
  const availableRegions = lockedRegion ? [lockedRegion] : regions;
  const headingSuffix = lockedRegion ? ` в ${lockedRegion}` : "";

  return (
    <section className="section glass reveal-on-scroll">
      <Breadcrumbs
        items={[
          { label: "Главная", to: "/" },
          { label: "Каталог", to: "/catalog" },
          { label: categoryName || "Категория" },
          ...(lockedRegion ? [{ label: lockedRegion }] : []),
        ]}
      />
      <Link to="/catalog" className="back-link">← Назад в категории</Link>
      <h1>
        Категория: <span className="grad">{categoryName || "..."}{headingSuffix}</span>
      </h1>
      <form className="search-grid" onSubmit={applyFilters}>
        <label className="filter-item">
          <span>Поиск по площадкам</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название или описание" />
        </label>
        <label className="filter-item">
          <span>{lockedRegion ? "Город" : "Регион"}</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)} disabled={Boolean(lockedRegion)}>
            <option value="">Все регионы</option>
            {availableRegions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="filter-item">
          <span>Гостей</span>
          <input type="number" min="1" placeholder="Например, 50" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </label>
        <label className="filter-item">
          <span>Площадь (м2)</span>
          <input type="number" min="1" placeholder="Например, 120" value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
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
                <p>{venue.areaSqm} м2 · {venue.capacity} гостей · {venue.metroMinutes} мин</p>
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
      description: `${venue.category} в ${venue.region}. Площадь ${venue.areaSqm} м2, вместимость до ${venue.capacity} гостей, от ${formatRub(venue.pricePerHour)} ₽/час.`,
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
    setLeadMessage(`${payload.message}. Площадка: ${venue.title}`);
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
        <div><strong>Площадь</strong><p>{venue.areaSqm} м2</p></div>
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
        <h3>Оставить заявку на площадку «{venue.title}»</h3>
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
                    <p>{item.areaSqm} м2 · {item.capacity} гостей</p>
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
  const OWNER_SESSION_KEY = "vmestoru-owner-id";
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
  const [isSubmittingVenue, setIsSubmittingVenue] = useState(false);
  const [ownerCategories, setOwnerCategories] = useState<string[]>([]);
  const [updatingRequestId, setUpdatingRequestId] = useState("");
  const [editingVenueId, setEditingVenueId] = useState("");

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

  useEffect(() => {
    const savedOwnerId = localStorage.getItem(OWNER_SESSION_KEY)?.trim();
    if (!savedOwnerId) return;
    void restoreOwnerSession(savedOwnerId);
  }, []);

  useEffect(() => {
    void loadOwnerCategories();
  }, []);

  const [venueForm, setVenueForm] = useState({
    title: "",
    region: "Москва",
    city: "Москва",
    address: "",
    category: "Лофт",
    capacity: "50",
    areaSqm: "120",
    pricePerHour: "5000",
    description: "",
    amenities: ["Wi-Fi", "Проектор", "Звук"] as string[],
    images: [] as string[]
  });

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

    const authedOwner = json.owner as Owner;
    setOwner(authedOwner);
    localStorage.setItem(OWNER_SESSION_KEY, authedOwner.id);
    setMessage("Успешный вход");
    await loadOwnerVenues(authedOwner.id);
    await loadOwnerDashboard(authedOwner.id);
    await loadOwnerRequests(authedOwner.id, "", "", "");
  }

  async function restoreOwnerSession(ownerId: string): Promise<void> {
    try {
      const response = await fetch(`${API}/api/owner/profile?ownerId=${encodeURIComponent(ownerId)}`);
      if (!response.ok) {
        localStorage.removeItem(OWNER_SESSION_KEY);
        return;
      }
      const payload = (await response.json()) as { owner: Owner };
      setOwner(payload.owner);
      await loadOwnerVenues(ownerId);
      await loadOwnerDashboard(ownerId);
      await loadOwnerRequests(ownerId, requestStatusFilter, requestSlaFilter, requestQuery);
    } catch {
      localStorage.removeItem(OWNER_SESSION_KEY);
    }
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

  async function loadOwnerCategories(): Promise<void> {
    try {
      const response = await fetch(`${API}/api/categories`);
      if (!response.ok) return;
      const payload = (await response.json()) as Category[];
      const names = payload.map((item) => item.name).filter(Boolean);
      setOwnerCategories(names);
    } catch {
      setOwnerCategories([]);
    }
  }

  async function addVenue(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!owner) return;
    setMessage("");
    if (venueForm.images.length < 3) {
      setMessage("Добавьте минимум 3 фотографии площадки");
      return;
    }
    if (!venueForm.region.trim() || !venueForm.city.trim() || !venueForm.category.trim()) {
      setMessage("Заполните регион, город и категорию площадки");
      return;
    }
    if (Number(venueForm.capacity) <= 0 || Number(venueForm.areaSqm) <= 0 || Number(venueForm.pricePerHour) <= 0) {
      setMessage("Проверьте числовые поля: вместимость, площадь и цена должны быть больше 0");
      return;
    }

    setIsSubmittingVenue(true);

    try {
      const response = await fetch(
        editingVenueId ? `${API}/api/owner/venues/${encodeURIComponent(editingVenueId)}` : `${API}/api/owner/venues`,
        {
        method: editingVenueId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: owner.id,
          title: venueForm.title,
          region: venueForm.region,
          city: venueForm.city,
          address: venueForm.address,
          category: venueForm.category,
          capacity: Number(venueForm.capacity),
          areaSqm: Number(venueForm.areaSqm),
          pricePerHour: Number(venueForm.pricePerHour),
          description: venueForm.description,
          amenities: venueForm.amenities,
          images: venueForm.images,
        })
      });

      const contentType = response.headers.get("content-type") ?? "";
      let messageFromServer = "";
      if (contentType.includes("application/json")) {
        const json = (await response.json().catch(() => ({}))) as { message?: string };
        messageFromServer = json.message ?? "";
      } else {
        const raw = await response.text().catch(() => "");
        messageFromServer = raw.slice(0, 180);
      }
      if (!response.ok) {
        setMessage(messageFromServer || `Не удалось добавить площадку (HTTP ${response.status})`);
        return;
      }

      setMessage(editingVenueId ? "Площадка обновлена" : "Площадка добавлена");
      setVenueForm({
        ...venueForm,
        title: "",
        address: "",
        description: "",
        images: []
      });
      setEditingVenueId("");
      await loadOwnerVenues(owner.id);
      await loadOwnerDashboard(owner.id);
    } catch {
      setMessage("Ошибка сети или слишком большой размер загружаемых фото.");
    } finally {
      setIsSubmittingVenue(false);
    }
  }

  async function addPhotosFromDevice(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (files.length === 0) return;

    const maxPhotos = 20;
    const maxFileSizeBytes = 8 * 1024 * 1024;
    const maxTotalBytes = 40 * 1024 * 1024;
    const existingTotalBytes = venueForm.images.reduce((sum, image) => sum + dataUrlSizeBytes(image), 0);
    const availableSlots = Math.max(0, maxPhotos - venueForm.images.length);
    if (availableSlots <= 0) {
      setMessage(`Можно добавить максимум ${maxPhotos} фотографий`);
      return;
    }

    const selected = files.slice(0, availableSlots);
    const loaded: string[] = [];
    let rejectedCount = 0;

    let nextTotalBytes = existingTotalBytes;
    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        rejectedCount += 1;
        continue;
      }
      if (file.size > maxFileSizeBytes) {
        rejectedCount += 1;
        continue;
      }
      if (nextTotalBytes + file.size > maxTotalBytes) {
        rejectedCount += 1;
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        if (!dataUrl || venueForm.images.includes(dataUrl) || loaded.includes(dataUrl)) continue;
        loaded.push(dataUrl);
        nextTotalBytes += file.size;
      } catch {
        rejectedCount += 1;
      }
    }

    if (loaded.length > 0) {
      setVenueForm((prev) => ({ ...prev, images: [...prev.images, ...loaded] }));
      setMessage(
        rejectedCount > 0
          ? `Добавлено фото: ${loaded.length}. Пропущено: ${rejectedCount} (формат/размер).`
          : `Добавлено фото: ${loaded.length}.`
      );
    } else {
      setMessage("Не удалось добавить фото. Проверьте формат изображения и размер (до 8 МБ).");
    }
  }

  function removePhotoFromVenue(index: number): void {
    setVenueForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  function toggleAmenity(amenity: string): void {
    setVenueForm((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists ? prev.amenities.filter((item) => item !== amenity) : [...prev.amenities, amenity]
      };
    });
  }

  function startEditVenue(venue: Venue): void {
    setEditingVenueId(venue.id);
    setVenueForm({
      title: venue.title,
      region: venue.region,
      city: venue.city,
      address: venue.address,
      category: venue.category,
      capacity: String(venue.capacity),
      areaSqm: String(venue.areaSqm),
      pricePerHour: String(venue.pricePerHour),
      description: venue.description,
      amenities: venue.amenities,
      images: venue.images
    });
    setMessage("Режим редактирования площадки");
  }

  function cancelEditVenue(): void {
    setEditingVenueId("");
    setVenueForm({
      title: "",
      region: "Москва",
      city: "Москва",
      address: "",
      category: ownerCategories[0] ?? "Лофт",
      capacity: "50",
      areaSqm: "120",
      pricePerHour: "5000",
      description: "",
      amenities: ["Wi-Fi", "Проектор", "Звук"],
      images: []
    });
    setMessage("Редактирование отменено");
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
    const current = ownerRequests.find((item) => item.id === requestId);
    if (current?.status === status) {
      setMessage("Этот статус уже установлен");
      return;
    }

    setUpdatingRequestId(requestId);
    setOwnerRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, status } : item)));

    try {
      const response = await fetch(`${API}/api/owner/requests/${encodeURIComponent(requestId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: owner.id, status })
      });
      const json = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setOwnerRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, status: current?.status ?? item.status } : item)));
        setMessage(json.message ?? "Не удалось обновить статус");
        return;
      }

      setMessage("Статус заявки обновлен");
      await loadOwnerRequests(owner.id, requestStatusFilter, requestSlaFilter, requestQuery);
      await loadOwnerDashboard(owner.id);
    } catch {
      setOwnerRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, status: current?.status ?? item.status } : item)));
      setMessage("Не удалось обновить статус: ошибка сети");
    } finally {
      setUpdatingRequestId("");
    }
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

          <form className="owner-venue-form" onSubmit={addVenue}>
            <h3>{editingVenueId ? "Редактировать площадку" : "Добавить площадку (можно несколько)"}</h3>
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
                  required
                />
              </label>
              <label className="filter-item">
                <span>Город</span>
                <input
                  value={venueForm.city}
                  onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })}
                  placeholder="Например: Ухта"
                  required
                />
              </label>
              <label className="filter-item">
                <span>Вместимость</span>
                <input type="number" min="1" value={venueForm.capacity} onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })} required />
              </label>
              <label className="filter-item">
                <span>Площадь (м2)</span>
                <input type="number" min="1" value={venueForm.areaSqm} onChange={(e) => setVenueForm({ ...venueForm, areaSqm: e.target.value })} required />
              </label>
              <label className="filter-item">
                <span>Цена за час (₽)</span>
                <input type="number" min="1" value={venueForm.pricePerHour} onChange={(e) => setVenueForm({ ...venueForm, pricePerHour: e.target.value })} required />
              </label>
            </div>
            <label className="filter-item">
              <span>Категория</span>
              <select value={venueForm.category} onChange={(e) => setVenueForm({ ...venueForm, category: e.target.value })} required>
                {ownerCategories.length > 0 ? (
                  ownerCategories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))
                ) : (
                  <option value={venueForm.category}>{venueForm.category}</option>
                )}
              </select>
            </label>
            <label className="filter-item">
              <span>Описание</span>
              <textarea value={venueForm.description} onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })} placeholder="Опишите формат, преимущества, ограничения" required />
            </label>
            <label className="filter-item">
              <span>Удобства</span>
              <div className="amenities-checklist">
                {OWNER_POPULAR_AMENITIES.map((item) => (
                  <label key={item} className="amenity-check">
                    <input
                      type="checkbox"
                      checked={venueForm.amenities.includes(item)}
                      onChange={() => toggleAmenity(item)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </label>
            <div className="photo-builder">
              <label className="filter-item">
                <span>Загрузить фотографии (JPG/PNG/WEBP, до 8 МБ)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void addPhotosFromDevice(e)}
                />
              </label>
            </div>
            <p className="muted">Фото добавлено: {venueForm.images.length} (минимум 3, максимум 20). Первое фото будет обложкой.</p>
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
            <div className="status-actions">
              <button type="submit" className="primary" disabled={isSubmittingVenue}>
                {isSubmittingVenue ? "Сохраняем..." : editingVenueId ? "Сохранить изменения" : "Добавить площадку"}
              </button>
              {editingVenueId ? (
                <button type="button" className="ghost-btn" onClick={cancelEditVenue} disabled={isSubmittingVenue}>
                  Отменить редактирование
                </button>
              ) : null}
            </div>
            {message ? <p className={message.includes("добавлена") || message.includes("обновлена") ? "ok" : "error-note"}>{message}</p> : null}
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
                    <p>{venue.areaSqm} м2 · {venue.capacity} гостей</p>
                    <p>{venue.address}</p>
                    <span className="rating-corner">★ {venue.rating}</span>
                    <button type="button" className="primary owner-edit-btn" onClick={() => startEditVenue(venue)}>Редактировать</button>
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
                  <button
                    type="button"
                    className={request.status === "in_progress" ? "chip active" : "chip"}
                    onClick={() => void updateLeadStatus(request.id, "in_progress")}
                    disabled={updatingRequestId === request.id}
                  >
                    В работе
                  </button>
                  <button
                    type="button"
                    className={request.status === "call_scheduled" ? "chip active" : "chip"}
                    onClick={() => void updateLeadStatus(request.id, "call_scheduled")}
                    disabled={updatingRequestId === request.id}
                  >
                    Созвон
                  </button>
                  <button
                    type="button"
                    className={request.status === "confirmed" ? "chip active" : "chip"}
                    onClick={() => void updateLeadStatus(request.id, "confirmed")}
                    disabled={updatingRequestId === request.id}
                  >
                    Подтвердить
                  </button>
                  <button
                    type="button"
                    className={request.status === "rejected" ? "chip active" : "chip"}
                    onClick={() => void updateLeadStatus(request.id, "rejected")}
                    disabled={updatingRequestId === request.id}
                  >
                    Отклонить
                  </button>
                </div>
                <p className="muted">Текущий статус: {request.status}</p>
              </article>
            ))}
            {message ? <p className={message.includes("Не удалось") || message.includes("ошибка") ? "error-note" : "ok"}>{message}</p> : null}
          </section>
        </>
      )}

      {!owner ? (message ? <p className="error-note">{message}</p> : null) : null}
    </section>
  );
}

function AdminPanelPage() {
  const [adminAccessKey, setAdminAccessKey] = useState("");
  const [adminSession, setAdminSession] = useState(() => localStorage.getItem("vmestoru-admin-session") ?? "");
  const [adminSessionExpiresAt, setAdminSessionExpiresAt] = useState(() => localStorage.getItem("vmestoru-admin-session-expires-at") ?? "");
  const [moderatorName, setModeratorName] = useState(() => localStorage.getItem("vmestoru-moderator-name") ?? "Admin");
  const [tab, setTab] = useState<"overview" | "owners" | "venues" | "requests" | "support" | "reviews">("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [ownersRows, setOwnersRows] = useState<AdminOwnerRow[]>([]);
  const [venueRows, setVenueRows] = useState<AdminVenueRow[]>([]);
  const [leadRows, setLeadRows] = useState<AdminLeadRow[]>([]);
  const [supportRows, setSupportRows] = useState<AdminSupportRow[]>([]);
  const [reviewSummary, setReviewSummary] = useState<AdminReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    applySeo({
      title: "Админка — VmestoRu",
      description: "Центр управления пользователями, площадками, заявками, поддержкой и модерацией.",
      path: "/admin",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (!adminSession.trim()) return;
    void verifySession();
  }, [adminSession]);

  useEffect(() => {
    if (!adminSession.trim()) return;
    void loadAll();
  }, [adminSession, query]);

  function clearSession(nextError = ""): void {
    setAdminSession("");
    setAdminSessionExpiresAt("");
    localStorage.removeItem("vmestoru-admin-session");
    localStorage.removeItem("vmestoru-admin-session-expires-at");
    if (nextError) setError(nextError);
  }

  async function verifySession(): Promise<void> {
    try {
      const response = await fetch(`${API}/api/admin/session`, {
        headers: { "x-admin-session": adminSession.trim() },
      });
      if (!response.ok) {
        clearSession("Сессия администратора истекла. Войдите снова.");
        return;
      }
      const payload = (await response.json()) as { expiresAt?: string };
      if (payload.expiresAt) {
        setAdminSessionExpiresAt(payload.expiresAt);
        localStorage.setItem("vmestoru-admin-session-expires-at", payload.expiresAt);
      }
    } catch {
      clearSession("Не удалось проверить сессию администратора.");
    }
  }

  async function login(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!adminAccessKey.trim()) {
      setError("Введите ключ доступа администратора.");
      return;
    }
    setError("");
    try {
      const response = await fetch(`${API}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: adminAccessKey.trim(), moderator: moderatorName.trim() || "Admin" }),
      });
      if (!response.ok) {
        setError(response.status === 403 ? "Неверный ключ доступа." : "Не удалось войти в админку.");
        return;
      }
      const payload = (await response.json()) as { token: string; expiresAt: string };
      setAdminSession(payload.token);
      setAdminSessionExpiresAt(payload.expiresAt);
      localStorage.setItem("vmestoru-admin-session", payload.token);
      localStorage.setItem("vmestoru-admin-session-expires-at", payload.expiresAt);
      localStorage.setItem("vmestoru-moderator-name", moderatorName.trim() || "Admin");
      setAdminAccessKey("");
      await loadAll(payload.token);
    } catch {
      setError("Ошибка сети при входе в админку.");
    }
  }

  function sessionHeaders(tokenOverride?: string): Record<string, string> {
    return { "x-admin-session": (tokenOverride ?? adminSession).trim() };
  }

  async function loadAll(tokenOverride?: string): Promise<void> {
    const token = (tokenOverride ?? adminSession).trim();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const q = query.trim();
      const qSuffix = q ? `?q=${encodeURIComponent(q)}` : "";
      const [overviewRes, ownersRes, venuesRes, leadsRes, supportRes, reviewSummaryRes] = await Promise.all([
        fetch(`${API}/api/admin/overview`, { headers: sessionHeaders(token) }),
        fetch(`${API}/api/admin/owners${qSuffix}`, { headers: sessionHeaders(token) }),
        fetch(`${API}/api/admin/venues${qSuffix}`, { headers: sessionHeaders(token) }),
        fetch(`${API}/api/admin/requests${qSuffix}`, { headers: sessionHeaders(token) }),
        fetch(`${API}/api/admin/support${qSuffix}`, { headers: sessionHeaders(token) }),
        fetch(`${API}/api/admin/reviews/summary`, { headers: sessionHeaders(token) }),
      ]);
      if ([overviewRes, ownersRes, venuesRes, leadsRes, supportRes, reviewSummaryRes].some((item) => item.status === 403)) {
        clearSession("Сессия администратора истекла. Войдите снова.");
        return;
      }
      if (!overviewRes.ok || !ownersRes.ok || !venuesRes.ok || !leadsRes.ok || !supportRes.ok || !reviewSummaryRes.ok) {
        setError("Не удалось загрузить данные админки.");
        return;
      }
      setOverview((await overviewRes.json()) as AdminOverview);
      setOwnersRows((await ownersRes.json()) as AdminOwnerRow[]);
      setVenueRows((await venuesRes.json()) as AdminVenueRow[]);
      setLeadRows((await leadsRes.json()) as AdminLeadRow[]);
      setSupportRows((await supportRes.json()) as AdminSupportRow[]);
      setReviewSummary((await reviewSummaryRes.json()) as AdminReviewSummary);
    } catch {
      setError("Ошибка сети при загрузке админ-данных.");
    } finally {
      setLoading(false);
    }
  }

  async function updateOwnerAccess(ownerId: string, payload: Partial<Pick<AdminOwnerRow, "trialStatus" | "subscriptionStatus">>): Promise<void> {
    setNotice("");
    const response = await fetch(`${API}/api/admin/owners/${encodeURIComponent(ownerId)}/access`, {
      method: "PATCH",
      headers: { ...sessionHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setNotice("Не удалось обновить доступ арендодателя.");
      return;
    }
    setNotice("Доступ арендодателя обновлен.");
    await loadAll();
  }

  async function toggleVenuePublication(venueId: string, nextPublished: boolean): Promise<void> {
    setNotice("");
    const response = await fetch(`${API}/api/admin/venues/${encodeURIComponent(venueId)}`, {
      method: "PATCH",
      headers: { ...sessionHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: nextPublished }),
    });
    if (!response.ok) {
      setNotice("Не удалось обновить публикацию площадки.");
      return;
    }
    setNotice(nextPublished ? "Площадка опубликована." : "Площадка скрыта.");
    await loadAll();
  }

  async function removeVenueByAdmin(venueId: string): Promise<void> {
    setNotice("");
    const response = await fetch(`${API}/api/admin/venues/${encodeURIComponent(venueId)}`, {
      method: "DELETE",
      headers: sessionHeaders(),
    });
    if (!response.ok) {
      setNotice("Не удалось удалить площадку.");
      return;
    }
    setNotice("Площадка удалена администратором.");
    await loadAll();
  }

  async function updateRequestStatus(requestId: string, status: AdminLeadRow["status"]): Promise<void> {
    setNotice("");
    const response = await fetch(`${API}/api/admin/requests/${encodeURIComponent(requestId)}/status`, {
      method: "PATCH",
      headers: { ...sessionHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setNotice("Не удалось обновить статус заявки.");
      return;
    }
    setNotice("Статус заявки обновлен.");
    await loadAll();
  }

  async function updateSupportStatus(requestId: string, status: AdminSupportRow["status"]): Promise<void> {
    setNotice("");
    const response = await fetch(`${API}/api/admin/support/${encodeURIComponent(requestId)}`, {
      method: "PATCH",
      headers: { ...sessionHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setNotice("Не удалось обновить статус обращения.");
      return;
    }
    setNotice("Статус обращения обновлен.");
    await loadAll();
  }

  if (!adminSession.trim()) {
    return (
      <section className="section glass reveal-on-scroll">
        <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Админка" }]} />
        <h1>Админка</h1>
        <p className="muted">Единый центр управления пользователями, площадками, заявками и поддержкой.</p>
        <form className="admin-key-form" onSubmit={login}>
          <label className="filter-item">
            <span>Ключ доступа</span>
            <input value={adminAccessKey} onChange={(e) => setAdminAccessKey(e.target.value)} placeholder="Введите admin key" />
          </label>
          <label className="filter-item">
            <span>Имя администратора</span>
            <input value={moderatorName} onChange={(e) => setModeratorName(e.target.value)} />
          </label>
          <button type="submit" className="primary">Войти</button>
        </form>
        {error ? <p className="error-note">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="section glass reveal-on-scroll admin-page">
      <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Админка" }]} />
      <div className="row-between">
        <h1>Админка</h1>
        <div className="admin-session-meta">
          <span className="muted">Сессия до {adminSessionExpiresAt ? new Date(adminSessionExpiresAt).toLocaleString("ru-RU") : "-"}</span>
          <button type="button" className="ghost-btn" onClick={() => clearSession()}>Выйти</button>
        </div>
      </div>
      <div className="admin-topbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по админке: пользователь, площадка, заявка, обращение"
        />
        <button type="button" className="chip" onClick={() => void loadAll()}>Обновить</button>
      </div>
      <div className="tabs admin-tabs">
        <button type="button" className={tab === "overview" ? "tab active" : "tab"} onClick={() => setTab("overview")}>Обзор</button>
        <button type="button" className={tab === "owners" ? "tab active" : "tab"} onClick={() => setTab("owners")}>Пользователи</button>
        <button type="button" className={tab === "venues" ? "tab active" : "tab"} onClick={() => setTab("venues")}>Площадки</button>
        <button type="button" className={tab === "requests" ? "tab active" : "tab"} onClick={() => setTab("requests")}>Заявки</button>
        <button type="button" className={tab === "support" ? "tab active" : "tab"} onClick={() => setTab("support")}>Поддержка</button>
        <button type="button" className={tab === "reviews" ? "tab active" : "tab"} onClick={() => setTab("reviews")}>Модерация</button>
      </div>
      {loading ? <p className="muted">Загрузка админ-панели...</p> : null}
      {error ? <p className="error-note">{error}</p> : null}
      {notice ? <p className="ok">{notice}</p> : null}

      {tab === "overview" && overview ? (
        <section className="admin-grid">
          <article className="metric-card"><p>Пользователи</p><strong>{overview.totals.owners}</strong></article>
          <article className="metric-card"><p>Площадки (публичные)</p><strong>{overview.totals.publishedVenues}</strong></article>
          <article className="metric-card"><p>Площадки (скрытые)</p><strong>{overview.totals.hiddenVenues}</strong></article>
          <article className="metric-card"><p>Заявки</p><strong>{overview.totals.leads}</strong></article>
          <article className="metric-card"><p>Поддержка</p><strong>{overview.totals.supportRequests}</strong></article>
          <article className="metric-card"><p>Отзывы pending</p><strong>{overview.totals.pendingReviews}</strong></article>
        </section>
      ) : null}

      {tab === "owners" ? (
        <div className="admin-list">
          {ownersRows.map((owner) => (
            <article key={owner.id} className="admin-card">
              <div className="row-between">
                <strong>{owner.name}</strong>
                <span className="muted">{owner.email}</span>
              </div>
              <p className="muted">Площадок: {owner.venuesCount} · Заявок: {owner.leadsCount}</p>
              <p>Trial: {owner.trialStatus} · Subscription: {owner.subscriptionStatus}</p>
              <div className="status-actions">
                <button type="button" className="chip" onClick={() => void updateOwnerAccess(owner.id, { trialStatus: "active" })}>Trial active</button>
                <button type="button" className="chip" onClick={() => void updateOwnerAccess(owner.id, { trialStatus: "expired" })}>Trial expired</button>
                <button type="button" className="chip" onClick={() => void updateOwnerAccess(owner.id, { subscriptionStatus: "active" })}>Sub active</button>
                <button type="button" className="chip" onClick={() => void updateOwnerAccess(owner.id, { subscriptionStatus: "inactive" })}>Sub inactive</button>
              </div>
            </article>
          ))}
          {ownersRows.length === 0 ? <p className="muted">Пользователи не найдены.</p> : null}
        </div>
      ) : null}

      {tab === "venues" ? (
        <div className="admin-list">
          {venueRows.map((venue) => (
            <article key={venue.id} className="admin-card">
              <div className="row-between">
                <strong>{venue.title}</strong>
                <span className={venue.isPublished === false ? "chip" : "chip active"}>{venue.isPublished === false ? "Скрыта" : "Опубликована"}</span>
              </div>
              <p className="muted">{venue.category} · {venue.region} · {venue.ownerName}</p>
              <p className="muted">Заявок: {venue.leadsCount} · {venue.areaSqm} м2 · {venue.capacity} гостей</p>
              <div className="status-actions">
                <button type="button" className="chip" onClick={() => void toggleVenuePublication(venue.id, venue.isPublished === false)}>
                  {venue.isPublished === false ? "Опубликовать" : "Скрыть"}
                </button>
                <button type="button" className="ghost-btn" onClick={() => void removeVenueByAdmin(venue.id)}>Удалить</button>
              </div>
            </article>
          ))}
          {venueRows.length === 0 ? <p className="muted">Площадки не найдены.</p> : null}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="admin-list">
          {leadRows.map((request) => (
            <article key={request.id} className="admin-card">
              <div className="row-between">
                <strong>{request.name} · {request.phone}</strong>
                <span className="chip">{request.status}</span>
              </div>
              <p className="muted">{request.venueTitle} · {request.ownerName}</p>
              {request.comment ? <p>{request.comment}</p> : null}
              <div className="status-actions">
                <button type="button" className="chip" onClick={() => void updateRequestStatus(request.id, "in_progress")}>В работу</button>
                <button type="button" className="chip" onClick={() => void updateRequestStatus(request.id, "call_scheduled")}>Созвон</button>
                <button type="button" className="chip" onClick={() => void updateRequestStatus(request.id, "confirmed")}>Подтвердить</button>
                <button type="button" className="chip" onClick={() => void updateRequestStatus(request.id, "rejected")}>Отклонить</button>
              </div>
            </article>
          ))}
          {leadRows.length === 0 ? <p className="muted">Заявки не найдены.</p> : null}
        </div>
      ) : null}

      {tab === "support" ? (
        <div className="admin-list">
          {supportRows.map((request) => (
            <article key={request.id} className="admin-card">
              <div className="row-between">
                <strong>{request.name} · {request.phone}</strong>
                <span className="chip">{request.status}</span>
              </div>
              <p className="muted">Страница: {request.page}</p>
              <p>{request.message}</p>
              <div className="status-actions">
                <button type="button" className="chip" onClick={() => void updateSupportStatus(request.id, "in_progress")}>В работе</button>
                <button type="button" className="chip" onClick={() => void updateSupportStatus(request.id, "resolved")}>Решено</button>
                <button type="button" className="chip" onClick={() => void updateSupportStatus(request.id, "rejected")}>Отклонено</button>
              </div>
            </article>
          ))}
          {supportRows.length === 0 ? <p className="muted">Обращения не найдены.</p> : null}
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div className="admin-list">
          <article className="admin-card">
            <h3>Модерация отзывов</h3>
            <p className="muted">Pending: {reviewSummary?.pending ?? 0} · High-risk: {reviewSummary?.highRiskPending ?? 0}</p>
            <p className="muted">Рекомендуем назначить 1-2 ответственных модератора с ежедневной проверкой очереди.</p>
            <Link to="/admin/reviews" className="primary">Открыть модерацию отзывов</Link>
          </article>
        </div>
      ) : null}
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
        Настоящая Политика определяет порядок обработки и защиты персональных данных пользователей сервиса VmestoRu
        и подготовлена с учетом требований законодательства Российской Федерации, включая Федеральный закон № 152-ФЗ
        «О персональных данных», № 149-ФЗ «Об информации, информационных технологиях и о защите информации» и № 242-ФЗ.
      </p>
      <h3>1. Оператор и область действия</h3>
      <p>
        Оператором персональных данных является команда сервиса VmestoRu. Политика применяется ко всем данным,
        получаемым через сайт, формы заявок, личный кабинет арендодателя и обращения в поддержку.
      </p>
      <h3>2. Категории персональных данных</h3>
      <p>
        Мы обрабатываем: имя, номер телефона, адрес электронной почты (если указан), содержимое заявок и сообщений,
        данные профиля арендодателя, сведения о площадках, технические журналы событий, IP-адрес, cookies и метаданные браузера.
      </p>
      <h3>3. Цели обработки</h3>
      <p>
        Данные используются для подбора площадок, передачи заявок арендодателям, исполнения пользовательских запросов,
        обеспечения работы личного кабинета, клиентской поддержки, предотвращения злоупотреблений, улучшения качества сервиса
        и соблюдения обязательных требований законодательства.
      </p>
      <h3>4. Правовые основания</h3>
      <p>
        Основания обработки: согласие субъекта персональных данных, необходимость исполнения договора или преддоговорных действий,
        законный интерес оператора при условии соблюдения прав пользователя, а также выполнение требований законодательства РФ.
      </p>
      <h3>5. Передача и поручение обработки</h3>
      <p>
        Данные могут передаваться арендодателям (в части заявки), хостинг-провайдеру, сервисам веб-аналитики,
        а также техническим подрядчикам в объеме, необходимом для работы платформы. При передаче применяются договорные
        обязательства о конфиденциальности и защите данных.
      </p>
      <h3>6. Трансграничная передача</h3>
      <p>
        При использовании внешних сервисов возможна трансграничная передача данных. Такая передача осуществляется
        только при наличии правового основания и с применением мер защиты, эквивалентных требованиям российского законодательства.
      </p>
      <h3>7. Сроки хранения и удаление</h3>
      <p>
        Персональные данные хранятся не дольше, чем это требуется для целей обработки, либо в сроки, предусмотренные законом.
        По достижении целей обработки данные удаляются или обезличиваются, если иное не требуется законодательством.
      </p>
      <h3>8. Права субъекта персональных данных</h3>
      <p>
        Пользователь вправе запросить доступ к своим данным, уточнение, блокирование, удаление, ограничение обработки,
        переносимость (если применимо), отзыв согласия и обжалование действий оператора в уполномоченный орган.
      </p>
      <h3>9. Cookies и аналитика</h3>
      <p>
        Сайт использует cookies и аналогичные технологии для авторизации, сохранения пользовательских настроек,
        аналитики и повышения удобства интерфейса. Пользователь может изменить настройки cookies в браузере,
        но это может повлиять на корректность отдельных функций.
      </p>
      <h3>10. Меры защиты информации</h3>
      <p>
        Мы применяем организационные и технические меры безопасности: разграничение доступа, журналирование действий,
        резервирование, контроль целостности данных, использование HTTPS, а также регулярные проверки критичных сценариев.
      </p>
      <h3>11. Работа с обращениями</h3>
      <p>
        Запросы по вопросам обработки персональных данных рассматриваются в разумный срок, предусмотренный законодательством.
        Для идентификации заявителя оператор может запросить дополнительную информацию.
      </p>
      <h3>12. Контакты и обновления Политики</h3>
      <p>
        По вопросам персональных данных: info@vmestoru.ru, +7 (995) 592-62-60, форма в разделе поддержки.
        Оператор вправе обновлять Политику; актуальная редакция публикуется на этой странице и вступает в силу с даты публикации.
      </p>
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

function Footer({ language }: { language: UiLanguage }) {
  const [supportForm, setSupportForm] = useState({ name: "", phone: "", message: "" });
  const [supportMessage, setSupportMessage] = useState("");
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);
  const t = uiCopy[language];

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
            <img src="/favicon.svg" alt="Логотип VmestoRu" className="footer-brand-logo" width={56} height={56} />
            <strong>VmestoRu</strong>
          </Link>
          <p>{t.footerLead}</p>
        </div>
        <div>
          <h4>{t.footerNav}</h4>
          <p><Link to="/catalog">{t.footerCatalog}</Link></p>
          <p><Link to="/owner">{t.footerOwner}</Link></p>
          <p><Link to="/privacy">{t.footerPrivacy}</Link></p>
        </div>
        <div>
          <h4>{t.footerContacts}</h4>
          <p>+7 (995) 592-62-60</p>
          <p><a href="mailto:info@vmestoru.ru">info@vmestoru.ru</a></p>
          <button type="button" className="primary support-open-btn" onClick={() => setSupportModalOpen(true)}>
            {t.footerSupportButton}
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
  const [language, setLanguage] = useLanguage();
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
        <Header theme={theme} onToggleTheme={onToggleTheme} language={language} onLanguageChange={setLanguage} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/city/:citySlug" element={<CityPage />} />
          <Route path="/category/:slug/:citySlug" element={<CategoryPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/venue/:id" element={<VenuePage />} />
          <Route path="/owner" element={<OwnerPage />} />
          <Route path="/admin" element={<AdminPanelPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer language={language} />
      <CookieBanner />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
