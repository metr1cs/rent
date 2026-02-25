# Подключение оплаты (инструкция)

## 1. Текущее состояние
Сейчас в проекте используется `mock`-режим оплаты подписки арендодателя.

Реализация:
- endpoint: `POST /api/owner/subscription/checkout`
- файл: `apps/api-laravel/routes/api.php`
- результат: подписка становится `active`, `nextBillingDate = now() + 30 days`
- в ответе возвращается `paymentMode: "mock"`

Проверка:
```bash
curl -X POST http://localhost:8090/api/owner/subscription/checkout \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"O-1"}'
```

## 2. Что нужно для production-оплаты
Рекомендуемый провайдер для РФ: YooKassa (или CloudPayments).

Нужно получить у провайдера:
- `shop_id`
- `secret_key`
- webhook secret (или подпись по заголовкам провайдера)
- return URL: `https://vmestoru.ru/owner/billing/result`
- webhook URL: `https://vmestoru.ru/api/payments/webhook/yookassa`

## 3. Переменные окружения (добавить в `apps/api-laravel/.env`)
```dotenv
PAYMENTS_PROVIDER=yookassa
PAYMENTS_ENABLED=true
PAYMENT_CURRENCY=RUB
PAYMENT_SUBSCRIPTION_AMOUNT=2000
PAYMENT_SUBSCRIPTION_DAYS=30

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=https://vmestoru.ru/owner/billing/result
YOOKASSA_WEBHOOK_SECRET=
```

## 4. Рекомендуемая схема данных
Добавить таблицы:
- `payments`
- `subscriptions`
- `payment_events`

Минимальные поля `payments`:
- `id`
- `owner_id`
- `provider` (`yookassa`)
- `provider_payment_id`
- `amount`
- `currency`
- `status` (`pending`, `succeeded`, `failed`, `canceled`)
- `idempotence_key`
- `created_at`, `updated_at`

## 5. Backend-логика (Laravel)
### 5.1 Checkout
`POST /api/owner/subscription/checkout`:
- создать запись `payments` со статусом `pending`
- создать платеж у провайдера
- вернуть `confirmation_url` на frontend

### 5.2 Webhook
`POST /api/payments/webhook/yookassa`:
- проверить подпись webhook
- сделать idempotent обработку
- обновить `payments.status`
- при `succeeded` активировать подписку у owner (`active`, `next_billing_date`)
- записать событие в `payment_events`

### 5.3 Проверка статуса
`GET /api/owner/subscription/status`:
- брать статус из `subscriptions/payments`, не из mock-поля напрямую

## 6. Frontend-логика
### 6.1 Кнопка оплаты
При клике:
- вызвать `POST /api/owner/subscription/checkout`
- если пришел `confirmationUrl`, выполнить redirect

### 6.2 Страница результата
`/owner/billing/result`:
- прочитать параметры возврата
- запросить `GET /api/owner/subscription/status`
- показать статус: `Успешно / В обработке / Ошибка`

## 7. Безопасность
- обязательная валидация webhook подписи
- idempotency key при создании платежа
- запрет доверять статусу из query-параметров return URL
- rate limit на `/api/payments/webhook/*`
- логирование всех платежных событий

## 8. Тестовый план перед запуском
1. Успешный платеж активирует подписку.
2. Повторный webhook не дублирует списание/активацию.
3. Неуспешный платеж оставляет подписку `inactive`.
4. Сломанная подпись webhook отклоняется (`401/403`).
5. UI корректно показывает состояние после возврата.

## 9. Чеклист перехода с mock на real
1. Добавлены env-переменные и секреты.
2. Реализован webhook endpoint и проверка подписи.
3. Включены таблицы `payments/subscriptions/payment_events`.
4. В `checkout` убрана активация подписки без провайдера.
5. Обновлены e2e/smoke тесты платежного пути.
6. Прогнан staging-тест с реальным провайдером.
7. Только после staging включить `PAYMENTS_ENABLED=true` на production.
