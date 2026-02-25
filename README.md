# VmestoRu Platform

Монорепозиторий проекта аренды площадок `vmestoru.ru`.

## Что в репозитории
- `apps/web` — frontend (React + Vite)
- `apps/api-laravel` — основной backend (Laravel + MySQL)
- `apps/api` — legacy backend (Node.js, временный)
- `docs` — регламенты, SEO, релизные чеклисты, безопасность, аналитика

## Полные инструкции
- Полный гайд по установке/запуску/тестам/деплою: [docs/FULL_SETUP_GUIDE.md](docs/FULL_SETUP_GUIDE.md)
- Подключение оплаты (текущий mock + production-переход): [docs/PAYMENTS_INTEGRATION.md](docs/PAYMENTS_INTEGRATION.md)

## Быстрый старт (локально)
```bash
cd "/Users/arec/var/www/New project"
npm install

cd apps/api-laravel
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

cd /Users/arec/var/www/New\ project/apps/web
cp .env.example .env
```

Запуск:
```bash
cd "/Users/arec/var/www/New project"
npm run dev:api
# новый терминал
npm run dev:web
```

Проверки:
- API: `http://localhost:8090/health`
- Web: `http://localhost:5173`

## Production preview
```bash
cd "/Users/arec/var/www/New project"
npm run build
cd apps/web
npm run start
```
Откроется на `http://localhost:4173`.

## Тесты
```bash
cd "/Users/arec/var/www/New project"
npm run test:api:laravel
npm run smoke:all
npm run e2e:critical
npm run qa:cycle
```

## Деплой
- Workflow: `.github/workflows/deploy.yml`
- Триггеры: tag `v*` или ручной `workflow_dispatch`
- GitHub Secrets: `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`

## Сопутствующие документы
- [docs/ENGINEERING_PLAYBOOK.md](docs/ENGINEERING_PLAYBOOK.md)
- [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)
- [docs/SEO_STRATEGY_2026_Q2.md](docs/SEO_STRATEGY_2026_Q2.md)
- [docs/OBSERVABILITY_ALERTS.md](docs/OBSERVABILITY_ALERTS.md)
- [docs/ANTIFRAUD_DEPLOY_CHECKLIST.md](docs/ANTIFRAUD_DEPLOY_CHECKLIST.md)
- [docs/ADMIN_MODERATION_SLA.md](docs/ADMIN_MODERATION_SLA.md)
- [docs/LEGAL_PUBLIC_PACK.md](docs/LEGAL_PUBLIC_PACK.md)
