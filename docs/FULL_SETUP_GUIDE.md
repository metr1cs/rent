# Полная инструкция по проекту VmestoRu

## 1. Где находится проект
Текущая рабочая директория проекта:
`/Users/arec/var/www/New project`

## 2. Состав проекта
- `apps/web` — frontend (React + Vite)
- `apps/api-laravel` — основной backend (Laravel + MySQL)
- `apps/api` — legacy backend (Node.js), временно для совместимости
- `docs` — регламенты, SEO, релизные чеклисты, аналитика
- `.github/workflows/deploy.yml` — production deploy через GitHub Actions

## 3. Требования к окружению
- Node.js 20+
- npm 10+
- PHP 8.2+
- Composer 2+
- MySQL 8+
- Nginx (для production)

## 4. Быстрый локальный запуск
### 4.1 Установка зависимостей
```bash
cd "/Users/arec/var/www/New project"
npm install
```

### 4.2 Настройка Laravel API
```bash
cd apps/api-laravel
cp .env.example .env
```

Обязательно заполнить в `apps/api-laravel/.env`:
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `ADMIN_PANEL_LOGIN`
- `ADMIN_PANEL_PASSWORD`
- `ADMIN_NOTIFY_KEY`

Далее:
```bash
php artisan key:generate
php artisan migrate --seed
```

### 4.3 Настройка frontend
Создать файл `apps/web/.env` на основе примера:
```bash
cd ../web
cp .env.example .env
```

### 4.4 Запуск сервисов
Из корня проекта:
```bash
cd "/Users/arec/var/www/New project"
npm run dev:api
```
Во втором терминале:
```bash
cd "/Users/arec/var/www/New project"
npm run dev:web
```

### 4.5 Проверка
- API health: `http://localhost:8090/health`
- Web: `http://localhost:5173`

## 5. Production сборка локально
```bash
cd "/Users/arec/var/www/New project"
npm run build
cd apps/web
npm run start
```
Проверка: `http://localhost:4173`

## 6. Тестирование перед релизом
Минимум:
```bash
cd "/Users/arec/var/www/New project"
npm run test:api:laravel
npm run smoke:all
npm run e2e:critical
npm run qa:cycle
```

## 7. Очистка данных (если нужен «чистый стенд»)
```bash
cd "/Users/arec/var/www/New project/apps/api-laravel"
php artisan migrate:fresh --seed
```

## 8. Деплой в production
CI/CD настроен через `.github/workflows/deploy.yml`:
- автодеплой по тегу `v*`
- ручной запуск через `workflow_dispatch`

### 8.1 Нужные GitHub Secrets
В репозитории добавить:
- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

### 8.2 Выпуск релиза
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 9. Админка
Вход в админ-панель использует значения из `.env`:
- `ADMIN_PANEL_LOGIN`
- `ADMIN_PANEL_PASSWORD`

Важно:
- не хранить production-логин/пароль в Git
- регулярно ротировать пароль и `ADMIN_NOTIFY_KEY`

## 10. Поддержка через Telegram
Если включено в API, заполнить в `apps/api-laravel/.env`:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `SUPPORT_TELEGRAM_CHAT_ID` (опционально)

## 11. SEO и юридические документы
См. документы:
- `docs/SEO_STRATEGY_2026_Q2.md`
- `docs/LEGAL_PUBLIC_PACK.md`
- `docs/RELEASE_CHECKLIST.md`

## 12. Частые проблемы
### 12.1 413 Request Entity Too Large
Причина: слишком большой payload с изображениями.
Что делать:
- уменьшать размер файлов
- перейти на загрузку через `multipart/form-data`
- настроить лимиты Nginx/PHP (`client_max_body_size`, `post_max_size`, `upload_max_filesize`)

### 12.2 После перезапуска «пропадает» сессия
Проверить:
- `SESSION_DRIVER`
- корректный домен/cookie policy
- отсутствие очистки storage/session

### 12.3 Не открывается `/catalog` на preview
Запускать именно `npm run start` в `apps/web` после `npm run build`.
