import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
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
type Review = { id: string; venueId: string; author: string; rating: number; text: string; createdAt: string };
type Owner = {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: "inactive" | "active";
  nextBillingDate: string | null;
};

type Theme = "light" | "dark";

const envApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const inferredApiBase =
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8090"
    : "";
const rawApiBase = envApiBase && envApiBase.length > 0 ? envApiBase : inferredApiBase;
const API = rawApiBase.endsWith("/") ? rawApiBase.slice(0, -1) : rawApiBase;

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
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

function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <header className="header glass">
      <div className="brand">
        <span className="brand-dot" />
        <div>
          <strong>VmestoRu</strong>
          <p>Премиальная аренда площадок для мероприятий</p>
        </div>
      </div>

      <nav className="nav">
        <Link to="/">Главная</Link>
        <Link to="/owner">Арендодателю</Link>
      </nav>

      <div className="header-actions">
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          {theme === "light" ? "Темная тема" : "Светлая тема"}
        </button>
        <Link to="/owner" className="become-owner">
          Стать арендодателем
        </Link>
      </div>
    </header>
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
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("recommended");

  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<Venue[]>([]);
  const [aiMessage, setAiMessage] = useState("");

  const regions = useMemo(() => [...new Set(allVenues.map((item) => item.region))], [allVenues]);

  useEffect(() => {
    void bootstrap();
  }, []);

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

  async function handleSearch(event: FormEvent): Promise<void> {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (region) params.set("region", region);
    if (category) params.set("category", category);
    if (capacity) params.set("capacity", capacity);
    if (date) params.set("date", date);
    params.set("sort", sort);

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
      <section className="hero glass">
        <p className="eyebrow">Премиальный сервис под любые мероприятия</p>
        <h1>
          Найдите <span className="grad">идеальную площадку</span> за пару минут
        </h1>
        <p>
          На главной доступны 8 самых популярных категорий. В каждой категории — 10-15 лучших вариантов.
        </p>

        <form className="search-grid" onSubmit={handleSearch}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Лофт, конференция, свадьба..." />
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Все регионы</option>
            {regions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Все категории</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>{item.name}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="number" min="1" placeholder="Гостей" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Рекомендованные</option>
            <option value="price_asc">Цена ниже</option>
            <option value="price_desc">Цена выше</option>
            <option value="rating_desc">Рейтинг</option>
          </select>
          <button type="submit" className="primary">Найти</button>
        </form>

        <form className="ai-search" onSubmit={handleAiSearch}>
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="AI-поиск: нужен лофт в Москве на 60 гостей до 120000"
          />
          <button type="submit">AI-подбор</button>
        </form>
        {aiMessage ? <p className="ai-note">{aiMessage}</p> : null}
      </section>

      {aiResult.length > 0 ? (
        <section className="section glass">
          <h2>AI-подбор</h2>
          <div className="cards-grid">
            {aiResult.map((venue) => (
              <article key={venue.id} className="venue-card" onClick={() => navigate(`/venue/${venue.id}`)}>
                <img src={venue.images[0]} alt={venue.title} loading="lazy" />
                <div className="card-body">
                  <h3>{venue.title}</h3>
                  <p>{venue.category} · {venue.region}</p>
                  <p>от {formatRub(venue.pricePerHour)} ₽/час</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section glass">
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
                <p>{venue.category} · {venue.region}</p>
                <p>{venue.capacity} гостей · {venue.metroMinutes} мин</p>
                <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {featured.map((group) => (
        <section key={group.id} className="section glass">
          <div className="row-between">
            <h2>{group.name}</h2>
            <span>{group.venues.length} вариантов</span>
          </div>
          <div className="cards-grid">
            {group.venues.slice(0, 12).map((venue) => (
              <article key={venue.id} className="venue-card" onClick={() => navigate(`/venue/${venue.id}`)}>
                <img src={venue.images[0]} alt={venue.title} loading="lazy" />
                <div className="card-body">
                  <h3>{venue.title}</h3>
                  <p>{venue.region} · рейтинг {venue.rating}</p>
                  <p className="price">от {formatRub(venue.pricePerHour)} ₽/час</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function VenuePage() {
  const { id } = useParams();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lead, setLead] = useState({ name: "", phone: "", comment: "" });
  const [leadMessage, setLeadMessage] = useState("");

  useEffect(() => {
    void load();
  }, [id]);

  async function load(): Promise<void> {
    if (!id) return;

    const [venueRes, reviewRes] = await Promise.all([
      fetch(`${API}/api/venues/${id}`),
      fetch(`${API}/api/venues/${id}/reviews`),
    ]);

    if (venueRes.ok) setVenue((await venueRes.json()) as Venue);
    if (reviewRes.ok) setReviews((await reviewRes.json()) as Review[]);
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

    setLeadMessage(payload.message);
    setLead({ name: "", phone: "", comment: "" });
  }

  if (!venue) {
    return <section className="section glass"><p>Загрузка...</p></section>;
  }

  return (
    <section className="section glass venue-page">
      <Link to="/" className="back-link">← Назад к поиску</Link>
      <img className="venue-hero" src={venue.images[0]} alt={venue.title} />
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
        {reviews.map((review) => (
          <article key={review.id}>
            <p><strong>{review.author}</strong> · ★ {review.rating}</p>
            <p>{review.text}</p>
          </article>
        ))}
      </section>
    </section>
  );
}

function OwnerPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [owner, setOwner] = useState<Owner | null>(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [ownerVenues, setOwnerVenues] = useState<Venue[]>([]);

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
    images: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80"
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

    setOwner(json.owner as Owner);
    setMessage("Успешный вход");
    await loadOwnerVenues((json.owner as Owner).id);
  }

  async function loadOwnerVenues(ownerId: string): Promise<void> {
    const response = await fetch(`${API}/api/owner/venues?ownerId=${encodeURIComponent(ownerId)}`);
    if (!response.ok) return;
    setOwnerVenues((await response.json()) as Venue[]);
  }

  async function activateSubscription(): Promise<void> {
    if (!owner) return;

    const response = await fetch(`${API}/api/owner/subscription/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: owner.id })
    });

    const json = await response.json();
    if (!response.ok) {
      setMessage(json.message ?? "Не удалось активировать подписку");
      return;
    }

    setOwner({ ...owner, subscriptionStatus: "active", nextBillingDate: json.nextBillingDate as string });
    setMessage(`Оплата 2000 ₽ принята. Подписка активна до ${json.nextBillingDate}`);
  }

  async function addVenue(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!owner) return;

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
        images: venueForm.images.split(",").map((item) => item.trim()).filter(Boolean),
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setMessage(json.message ?? "Не удалось добавить площадку");
      return;
    }

    setMessage("Площадка добавлена");
    setVenueForm({ ...venueForm, title: "", address: "", description: "" });
    await loadOwnerVenues(owner.id);
  }

  return (
    <section className="section glass owner-page">
      <h1>
        Кабинет <span className="grad">арендодателя</span>
      </h1>

      {!owner ? (
        <form className="owner-auth" onSubmit={auth}>
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
          <div className="owner-status">
            <p><strong>{owner.name}</strong> ({owner.email})</p>
            <p>Подписка: {owner.subscriptionStatus === "active" ? "Активна" : "Не активна"}</p>
            <p>Тариф: 2000 ₽ / 30 дней</p>
            {owner.subscriptionStatus !== "active" ? (
              <button type="button" className="primary" onClick={activateSubscription}>Оплатить 2000 ₽</button>
            ) : (
              <p>Действует до: {owner.nextBillingDate}</p>
            )}
          </div>

          <form className="owner-venue-form" onSubmit={addVenue}>
            <h3>Добавить площадку (можно несколько)</h3>
            <input placeholder="Название" value={venueForm.title} onChange={(e) => setVenueForm({ ...venueForm, title: e.target.value })} required />
            <input placeholder="Адрес" value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} required />
            <div className="three-cols">
              <select value={venueForm.region} onChange={(e) => setVenueForm({ ...venueForm, region: e.target.value, city: e.target.value })}>
                <option value="Москва">Москва</option>
                <option value="Санкт-Петербург">Санкт-Петербург</option>
                <option value="Казань">Казань</option>
                <option value="Екатеринбург">Екатеринбург</option>
                <option value="Новосибирск">Новосибирск</option>
              </select>
              <input type="number" min="1" placeholder="Вместимость" value={venueForm.capacity} onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })} />
              <input type="number" min="1" placeholder="Цена/час" value={venueForm.pricePerHour} onChange={(e) => setVenueForm({ ...venueForm, pricePerHour: e.target.value })} />
            </div>
            <input placeholder="Категория (например Лофт)" value={venueForm.category} onChange={(e) => setVenueForm({ ...venueForm, category: e.target.value })} />
            <textarea placeholder="Описание" value={venueForm.description} onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })} required />
            <input placeholder="Удобства через запятую" value={venueForm.amenities} onChange={(e) => setVenueForm({ ...venueForm, amenities: e.target.value })} />
            <input placeholder="URL фото" value={venueForm.images} onChange={(e) => setVenueForm({ ...venueForm, images: e.target.value })} />
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
                    <p>{venue.category}</p>
                    <p>{venue.address}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {message ? <p className="ok">{message}</p> : null}
    </section>
  );
}

function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="animated-background" aria-hidden="true" />
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/venue/:id" element={<VenuePage />} />
            <Route path="/owner" element={<OwnerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
