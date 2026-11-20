# Аудит BizX Platform (4 независимых субагента) + План реализации рассылок и доработок

Документ фиксирует результаты комплексной проверки ветки `feat-admin-moderation-ui-strikes-subscriptions` 4 независимыми субагентами, уже закрытые критические уязвимости и runtime-баги (коммиты `254b758`..`64c8998`), а также утверждённый план поэтапной реализации новой функциональности и рефакторинга в ветке `feat-repo-broadcasts-audit-roadmap`.

---

## 1. Утверждённые решения пользователя

1. **Зависимости (`AGENTS.md` Правило 1 — одобрено):**
   - Удалить неиспользуемые `@mui/icons-material`, `@emotion/react`, `@emotion/styled` из `packages/ui`.
   - Установить `@nestjs/throttler` в `apps/api` для rate-limiting критичных маршрутов (auth, загрузки, рассылки).
2. **Юридическая модель подписки на акции при 1-м заказе (Strict Opt-In — максимальное соответствие закону UA + EU GDPR):**
   - На 1-м заказе в магазине показывается **неотмеченная** галочка `☐ Отримувати акції, знижки та спецпропозиції від «{storeName}»`.
   - Пользователь сам осознанно ставит галочку, если хочет получать акции.
   - Если пользователь не поставил галочку — в БД фиксируется `prompt_shown_at` и `status = 'unsubscribed'`, и при повторных заказах система больше не навязывает чекбокс и никогда не подписывает автоматически.
   - На странице витрины (Web + Mobile) доступна кнопка ручной подписки/отписки, а в каждом промо-письме в Почте BizX — кнопка отписки в 1 клик.
3. **Квоты промо-рассылок и авто-скидок:**
   - Дневной лимит по тарифу на заведение: `Starter — 1/день`, `Pro — 3/день`, `Enterprise — 10/день` (обновить описания тарифов в `SUBSCRIPTION_PLANS`).
   - Авто-уведомления при скидке на товар (`oldPrice > price`, скидка ≥ 5% или углубление ≥ +5%) расходуют общий дневной лимит тарифа и защищены 24-часовым cooldown на один товар.
4. **Порядок выполнения:** все 4 этапа (**A → B → C → D**) выполняются последовательно, полноценно, с `check-types`, production `build` и живыми проверками после каждого этапа.

---

## 2. Итоги 4 независимых аудитов

### 2.1 Аудит 1 — UI-компоненты и дедупликация
- **Уже исправлено (до ветвления, `64c8998`):**
  - В `packages/ui/src/components/select.tsx` иконки `@mui/icons-material` заменены на `lucide-react`.
  - В `apps/bizx-admin/src/views/ProductsView.tsx` нативный `confirm()` заменён на `<ConfirmModal />`.
  - В `apps/bizx-mobile/src/screens/ProfileScreen.tsx` удалён мёртвый дубликат формы входа (110 строк).
  - В `apps/bizx-landing/app/components/AuthModal.tsx` добавлены `Escape` и блокировка скролла `body`.
- **Осталось в Этапе D:**
  - Унифицировать токены `Input`/`Textarea`/`Select` в `@bizx/ui` и привести внутреннюю композицию (`AuthCard`, `RolesManager`, `TeamManager`, `OrderChatBox`, `ConfirmModal`) к единым примитивам и палитре `rose-*`.
  - Вынести общий компонент аналитики (устранить ~80% дублирования `PlatformAnalyticsView.tsx` и `DetailedAnalyticsView.tsx`).
  - Декомпозировать god-файлы `apps/bizx-landing/app/account/page.tsx` и `apps/bizx-landing/app/store/[slug]/page.tsx`.
  - Вынести копипасту хелперов (`formatMoney`, `getInitials`, `formatDate`, `PHONE_COUNTRIES`) в `@bizx/utils`.
  - Добавить мобильные примитивы (`MobileButton`, `MobileInput`, `MobileScreenHeader`, `MobileEmptyState`, `MobileAlertBanner`, `MobileStarRating`), подключить `MobilePhoneInput` в `CartScreen`.
  - Удалить неиспользуемый `apps/bizx-admin/src/views/ProfileView.tsx`.

### 2.2 Аудит 2 — API RBAC и Безопасность (133+ HTTP-теста, 13 ролей)
- **Уже закрыто и подтверждено (18/18 live-проверок, `64c8998`):**
  - **CRIT-1:** разделение секрета и типа токена `store_preview` (невозможно использовать как access JWT).
  - **CRIT-2:** `POST /auth/logout` проверяет подпись JWT вместо `jwtService.decode()`.
  - **CRIT-3:** строгая матрица переходов статусов магазина в `updateStore`.
  - **CRIT-4:** терминальные статусы заказов, запрет ручного `refunded`, атомарное начисление Escrow (`WHERE payout_status = 'held'`).
  - **CRIT-5:** агрегация дублей `productId`, атомарное списание склада `WHERE inventory_count >= qty`, фильтр `archivedAt IS NULL`, лимит `int32`.
  - **CRIT-6:** запрет `image/svg+xml`, проверка magic-bytes файлов, заголовки `nosniff` + `CSP: default-src 'none'; sandbox`.
  - **CRIT-7:** `subscribeDtoSchema.periodDays` ограничен `1..365`.
  - **HIGH-1..9, MED-1..10, LOW-1..6:** live-проверка `users.status` в `JwtAuthGuard`, глобальный `GlobalExceptionFilter` для Postgres-кодов, CORS allowlist, закрытие утечек `ownerEmail`/черновиков/UUID-перечисления, Multer `fileSize` лимиты, derived read-only store permissions для саппорта платформы.
- **Осталось в Этапах A, B, D:**
  - `@nestjs/throttler` rate limiting (Этап A).
  - Production-защита mock-подписки `ALLOW_MOCK_BILLING` (Этап B).
  - Подписанные приватные URL для вложений чатов/Почты (`order-chat/*`, `inbox/*`) (Этап D).

### 2.3 Аудит 3 — Функциональная полнота E2E
- **Уже исправлено (`64c8998`):**
  - Двойное деление рейтинга в мобилке (`5.0★` вместо `0.1`), резолв медиа-вложений в `MobileChatThread`, бейдж `'paid'` в `MobileBadge`.
  - Пустой `email` в `StoreSettingsView`, preview-токен для неопубликованных магазинов, блокировка записи в `suspended`/`archived` магазинах.
  - Учёт сообщений платформы в непрочитанных заказах, авто-снятие истёкших блокировок и лимит при даунгрейде тарифа, продление истёкших подписок на лендинге.
- **Осталось в Этапах A и B:**
  - **Этап A:** консоль техподдержки в `bizx-platform-admin` (закрывает «чёрную дыру» тикетов Почты), рассылки BizX, промо-кампании и авто-скидки бизнеса, подписки на витрине Web/Mobile, Strict Opt-In checkout, 1-клик отписка, прокачка мобильной Почты.
  - **Этап B:** реальная смена пароля (`POST /auth/change-password`), удаление фейковых вкладок Privacy/Integrations и хардкодного API-токена в `/account`, глобальная вкладка «Мої замовлення», публичный каталог `/stores`, CRUD категорий товаров (`PATCH /products/categories/:id` + UI), CRM-вкладка `CustomersView` (`GET /orders/store/:storeId/customers`), видимость страйков и кнопка отправки на модерацию в `StoreSettingsView`, поиск/фильтры заказов, stock clamping `inventoryCount` в корзине Web/Mobile, бейдж Почты на табе «Профіль» в мобилке.

### 2.4 Аудит 4 — Схема БД, миграции и i18n
- **Осталось в Этапе C:**
  - Чистка избыточных колонок/экспортов (`users.archived_at`, `orders.refund_offered_by_user_id`, удаление 24 мёртвых `drizzle-zod` экспортов).
  - Перевод `inbox_threads` / `inbox_messages` на `timestamp with time zone`.
  - Выравнивание partial unique index для `stores.custom_domain` (`WHERE archived_at IS NULL`) и добавление горячих индексов (`refresh_tokens(token_hash)`, `store_members(user_id)`, `orders(store_id, created_at)`, `orders(customer_id, created_at)`, `products(store_id, is_active)`).
  - Фильтрация `isNull(archivedAt)` в `analytics.service.ts`.
  - Добавление `statuses.payment.refunded` и полная локализация (`uk`/`en`) 4 вьюх `bizx-platform-admin`, `ProductsView`, `account/page.tsx`, мобильного приложения и приведение текстов ошибок API к единому языку.

---

## 3. Дорожная карта выполнения (ветка `feat-repo-broadcasts-audit-roadmap`)

- [x] **Этап A:** Зависимости (`-mui/-emotion`, `+@nestjs/throttler`), миграция `0011`, права RBAC, обновлённые лимиты тарифов, рассылки BizX, консоль поддержки, бизнес-маркетинг + авто-скидки, подписки на витрине Web/Mobile, Strict Opt-In checkout, 1-клик отписка + живой E2E тест.
- [x] **Этап B:** Смена пароля, чистка `/account` + «Мої замовлення», каталог `/stores`, CRUD категорий товаров, `CustomersView` (CRM), страйки и модерация в `StoreSettingsView`, фильтры заказов, stock checks корзины Web/Mobile, бейдж Почты на мобилке, production-guard mock billing.
- [x] **Этап C:** Миграция `0012` (индексы, `timestamptz`, чистка избыточных колонок), удаление `drizzle-zod` мёртвых экспортов, фикс `analytics.service.ts`, полная локализация `uk`/`en` и консистентность ошибок API.
- [ ] **Этап D:** UI-дедупликация (`@bizx/utils` общие хелперы, обновление `@bizx/ui` примитивов, общий аналитический дашборд, декомпозиция `account`/`store`, мобильные примитивы, удаление `ProfileView.tsx`) и приватные HMAC-подписанные URL для вложений чатов/Почты.
