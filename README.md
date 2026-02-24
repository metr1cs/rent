# VmestoRu Platform

Новый проект с чистого листа:
- `apps/web`: premium-сайт аренды площадок для мероприятий
- `apps/api`: API каталога, карточек площадок, заявок, кабинета арендодателя и mock-оплаты подписки 2000 RUB / 30 дней
- `ai_team`: система AI-агентов и автообучения (оркестратор, scorer, playbooks)

## Основная логика продукта
- На главной: 8 популярных категорий, в каждой 10-15 вариантов
- Пользовательский поток: поиск -> карточка площадки (отдельная страница) -> телефон/заявка
- Поток арендодателя: регистрация -> оплата подписки (mock 2000 RUB) -> добавление нескольких площадок
- Поддержка светлой/темной темы, анимаций и AI-поиска

## Запуск API/Web
```bash
npm install
npm run dev:api
npm run dev:web
```

## Telegram-уведомления на телефон
API умеет отправлять уведомления в Telegram при:
- новой регистрации арендодателя
- новой заявке на площадку

Переменные окружения для API:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `SUPPORT_TELEGRAM_CHAT_ID` (опционально, отдельный чат/группа для поддержки)
- `ADMIN_NOTIFY_KEY` (для защищенного тестового endpoint)

Пример файла: `apps/api/.env.example`

Тест отправки уведомления:
```bash
curl -X POST http://localhost:8090/api/admin/notify/test -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

### Админ-отчет по оплатам и должникам
```bash
curl http://localhost:8090/api/admin/billing/overview -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

### Рассылка уведомлений по должникам в Telegram
```bash
curl -X POST http://localhost:8090/api/admin/billing/notify-debtors -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

### Прогон напоминаний (3 дня / 1 день / должники)
```bash
curl -X POST http://localhost:8090/api/admin/billing/reminders/run -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

### Аналитика воронки (admin)
```bash
curl http://localhost:8090/api/admin/analytics/funnel -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

### Операционная готовность (admin)
```bash
curl http://localhost:8090/api/admin/ops/readiness -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

### Отзывы: anti-fraud и модерация (admin)
- Публичный endpoint отзывов возвращает только `published` отзывы.
- Создать отзыв можно только после подтвержденной заявки на площадку.
- Подозрительные отзывы уходят в `pending`.
- Действия модератора пишутся в аудит-лог.

Просмотр очереди модерации:
```bash
curl "http://localhost:8090/api/admin/reviews?status=pending" -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

Модерация:
```bash
curl -X POST "http://localhost:8090/api/admin/reviews/R-3/moderate" \
  -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"published","note":"manual check ok","moderator":"QA Lead"}'
```

Сводка модерации (pending/high-risk/recent actions):
```bash
curl "http://localhost:8090/api/admin/reviews/summary" -H "x-admin-key: YOUR_ADMIN_NOTIFY_KEY"
```

## Build
```bash
npm run build
```

## Engineering Process
- Playbook: `docs/ENGINEERING_PLAYBOOK.md`
- Release checklist: `docs/RELEASE_CHECKLIST.md`
- PR template: `.github/pull_request_template.md`
- Production deploy workflow: `.github/workflows/deploy.yml`
- SEO strategy/forecast: `docs/SEO_STRATEGY_2026_Q2.md`
- Observability alerts: `docs/OBSERVABILITY_ALERTS.md`

## Хранение данных API (персистентность)
- API сохраняет runtime-данные в JSON-файл между рестартами.
- По умолчанию файл: `apps/api/data/store.json`
- Можно переопределить путь:
```bash
DATA_STORE_FILE=/absolute/path/to/store.json npm run start -w apps/api
```

## Smoke checks
```bash
npm run smoke:catalog
npm run smoke:trust
```

## Поддержка и управление площадками
- Поддержка из сайта отправляется в Telegram через `POST /api/support/requests`.
- Удаление площадки арендодателем: `DELETE /api/owner/venues/:id` (с `ownerId` в body).

## AI Team demo
```bash
python3 run_demo.py
python3 run_autotrain.py
python3 run_interaction_audit.py
```

## AI-команда (расширенная)
- `TechLead/PM/Design/Frontend/Backend/QA/DevOps/Security/Growth/Analytics/Support/Decision`
- `SREAgent`: надежность, мониторинг, runbooks
- `QAAutomationAgent`: автоматизация регрессий и smoke-gates
- `ProductAnalystAgent`: воронка, KPI, growth-гипотезы
- `LegalComplianceAgent`: legal/compliance и риски данных
- `CRMRetentionAgent`: сценарии удержания, напоминания, dunning-flow
