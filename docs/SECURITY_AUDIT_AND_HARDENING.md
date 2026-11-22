# Аудит безпеки та системне укріплення BizX Platform

**Дата проведення:** 22 листопада 2026  
**Гілка впровадження:** `fix-repo-security-hardening` (від актуальної `origin/dev`, комміт `4f0ec60`)  
**Обсяг перевірки:** Весь монорепозиторій (`apps/api`, `apps/bizx-landing`, `apps/bizx-admin`, `apps/bizx-platform-admin`, `apps/bizx-mobile`, `packages/api-client`, `packages/common-types`, `packages/database`, `packages/ui`, `packages/utils`, `docker-compose.yml`).

---

## 1. Методологія та межі аудиту

Аудит проведено двома незалежними ізольованими субагентами-аудиторами **без попереднього контексту** (модель незалежного white-box OWASP code review):

1. **Backend Security Code Auditor** — повний аудит NestJS API, Drizzle ORM, JWT/cookie-сесій, RBAC, Escrow/фінансових переходів, завантаження файлів, Cloudflare R2 / HMAC підписів, DNS-верифікації доменів, логів, Docker та seed-скриптів.
2. **Frontend & Mobile Security Auditor** — повний аудит Next.js лендингу (`middleware.ts`, `next.config.ts`, вітрини, кабінету), Vite бізнес-адмінки та платформної адмінки, Expo/React Native мобільного застосунку, спільного `@bizx/api-client`, `@bizx/ui` та `@bizx/utils`.

> **Примітка щодо етичних меж:** Замість реальних наступальних атак, перехоплення трафіку між субагентами або генерації шкідливих експлойтів і фішингових посилань було виконано вичерпний статичний white-box OWASP аудит коду й конфігурацій з подальшим впровадженням системних захистів та автоматизованою оборонною верифікацією (перевірка HTTP-заголовків безпеки, відхилення path traversal / невалідних UUID / чужого `Origin` / неавторизованих запитів / формул CSV).

---

## 2. Зведена таблиця результатів аудиту

### 2.1. Backend (`apps/api`, `packages/database`, `packages/common-types`, `docker-compose.yml`)

| ID | Критичність | Категорія / Проблема | Статус | Як виправлено |
|---|---|---|---|---|
| **C-1** | Critical | Жорстко вшиті fallback-секрети (`JWT_SECRET`, `MEDIA_SIGNING_SECRET`) у `AuthModule`, `StorageService`, `StoresService` та `docker-compose.yml` | **Виправлено** | Створено `security-config.ts` з fail-fast перевіркою `validateSecurityConfig()` на старті: у non-dev середовищах обов’язкові унікальні секрети ≥ 32 символів (окремі для JWT і медіа). Оновлено `docker-compose.yml`. |
| **C-2** | Critical | Cross-tenant HMAC signing oracle для приватних вкладень (`order-chat/*`, `inbox/*`) — можна було прикріпити чужий шлях `/storage/file/order-chat/...` у своєму чаті та отримати підпис | **Виправлено** | Приватні завантаження скоупнуто у `order-chat/<orderId>/` та `inbox/<threadId>/`; додано `StorageService.assertAttachmentsScopedToPrefix()` на кожному записі повідомлень і `assertNotPrivateAttachmentUrl()` на розсилках; додано скоупнутий маршрут `POST /platform/support/threads/:threadId/upload`. |
| **C-3** | Critical | Вимкнений CSRF-захист на cookie-ендпоінтах `/auth/refresh` та `/auth/logout` + широкий `path: '/'` для `refresh_token` cookie | **Виправлено** | Створено `CsrfOriginGuard` (перевірка `Origin`/`Referer` за allowlist + обов’язковий `X-Requested-With` / JSON `Content-Type`), застосовано на `refresh`/`logout`; `refresh_token` cookie обмежено `path: '/auth'`; `JwtAuthGuard` більше не приймає `access_token` із cookies. |
| **H-1** | High | Обхід модераторського бану закладу: повторний `PATCH /stores/:id { status: 'suspended' }` власником скидав `suspendedUntil` та `suspensionReason` | **Виправлено** | Мутація `suspendedUntil`, `suspensionReason` та `archivedAt` у `StoresService.updateStore` тепер жорстко обмежена умовою `isActuallyChangingStatus` (не-платформний користувач ніколи не може обнулити поля модераторського блокування). |
| **H-2** | High | Гонки стану (TOCTOU / double-clawback / double-release) в Escrow та спорах (`respondRefundOffer`, `withdrawDispute`, `resolvePlatformDispute`, `revokeStrike`) + розмороження Escrow на неоплачених карткових замовленнях | **Виправлено** | Додано `SELECT ... FOR UPDATE` блокування рядка замовлення + атомарні умовні `UPDATE ... WHERE ... RETURNING` переходи у `OrdersService` та `DisputesService`; перевірку `isActuallyPaid` уніфіковано для всіх шляхів розмороження Escrow. |
| **H-3** | High | Fail-open умова для mock-білінгу (`NODE_ENV === 'production'`), що дозволяло безкоштовно активувати платні тарифи у staging/unset `NODE_ENV` | **Виправлено** | Переведено на fail-closed перевірку `!isLocalDevEnv() && process.env.ALLOW_MOCK_BILLING !== 'true'` у `SubscriptionsService.subscribe`. |
| **H-4** | High | Відсутність глобального `JwtAuthGuard` за замовчуванням (ризик забути `@UseGuards` у майбутніх контролерах) | **Виправлено** | `JwtAuthGuard` зареєстровано як глобальний `APP_GUARD` у `AppModule` (secure-by-default); публічні маршрути явно марковано `@Public()`. |
| **H-5** | High | Відсутність `Content-Disposition: attachment` для PDF/SVG/не-растрових файлів у `/storage/file/*`, можливий path traversal або невідомі префікси | **Виправлено** | Створено `canonicalizeStorageKey()` з явним allowlist директорій, блокуванням `..`, `\`, `%2e/%2f/%5c`, `//`, NUL-байтів; розширення файлу виводиться з провалідованого MIME; для не-растрових файлів примусово виставляється `Content-Disposition: attachment` + `Content-Security-Policy: default-src 'none'; sandbox`. |
| **H-6** | High | Відсутність HTTP-заголовків безпеки, ліміту JSON-тіла, `trust proxy`, жорсткого CORS для production | **Виправлено** | Створено `securityHeadersMiddleware`, вимкнено `x-powered-by`, додано `json/urlencoded({ limit: '1mb' })`, налаштовано `parseTrustProxySetting()`, у prod CORS допускає лише HTTPS без `localhost` і довільних портів. |
| **H-7** | High | Ручна перевірка JWT без перевірки активного статусу користувача у `ProductsController` та `StoresService.getStorePreview` + передача `previewToken` у query string | **Виправлено** | Створено єдиний `AuthTokenVerifierService` (HS256 pinning, `tokenType === 'access'`, UUID check, жива перевірка статусу користувача у PostgreSQL); `getStorePreview` перевіряє активність `actorId` і підтримує заголовок `X-Store-Preview-Token`. |
| **H-8** | High | Неатомарне одноразове використання refresh-токена (race window при паралельному `/auth/refresh`) | **Виправлено** | `AuthService.refresh` виконує атомарний `DELETE ... RETURNING` замість окремих `SELECT` + `DELETE`. |
| **H-9** | High | Відсутність rate limiting на завантаження файлів, DNS-перевірку, створення замовлень, прев’ю та тікети підтримки | **Виправлено** | Додано `@Throttle` на `auth/refresh`, `auth/logout`, `auth/me/avatar`, `storage/upload`, `storage/presigned-upload`, `stores/:id/logo|banner|domain/verify|preview-token|preview|resolve-host`, `products/:id/image`, `orders`, `orders/:id/messages/upload`, `inbox/threads/support`, `inbox/threads/:id/upload`. |
| **M-1..M-11** | Medium | Неконтрольовані `...dto` spreads (mass assignment), неекрановані `%/_` в `ILIKE`, внутрішній DNS у `verifyStoreDomain`, PII у публічних відгуках / `getMyStores` / страйках / прев’ю, TOCTOU ліміту закладів та розсилок, `bcrypt` 10 раундів, user enumeration на логіні, presigned upload TTL / `ContentLength`, HPP array на query-параметрах, витік облікових даних Redis у логах, відсутність захисту `seed.ts` у prod | **Виправлено** | Явні whitelist-об’єкти при `UPDATE`; `escapeIlikePattern`; виділений `dns.Resolver` з публічними резолверами (`1.1.1.1`, `8.8.8.8`) і таймаутом 3.5с; приховано `orderId`/`customerId` у публічних відгуках, `domainVerificationToken`/`payoutBalance` за правами у `getMyStores`, `ownerEmail` у прев’ю для не-персоналу та ID модераторів у страйках для власників; `pg_advisory_xact_lock` для квот закладів і розсилок; `BCRYPT_ROUNDS = 12` + constant-time dummy compare при логіні; presigned TTL 300с + `ContentLength`; HPP-захист `typeof === 'string'`; `SafeUuidPipe` на всіх UUID-параметрах; редагування пароля Redis у логах; захист `seed.ts` у production. |
| **L-1..L-5** | Low | `Math.random()` у генераторі номерів замовлень, відсутність санітизації 500-помилок і PG `22001`, прогалини у Zod-лімітах (`max(100)` на масивах, `max(128)` / `min(8)` на паролях, заборона внутрішніх TLD у кастомних доменах) | **Виправлено** | `crypto.randomInt` у `OrdersService`; безпечне логування 500 і мапінг PG `22001` у `PgExceptionFilter`; жорсткіші Zod-схеми в `@bizx/common-types` (`safeMediaUrlSchema`, ліміти паролів/масивів/пошуку, блокування IP-літералів та `.local`/`.internal`/`.arpa` доменів). |

### 2.2. Frontend, Shared UI & Mobile (`apps/bizx-landing`, `apps/bizx-admin`, `apps/bizx-platform-admin`, `apps/bizx-mobile`, `packages/ui`, `packages/api-client`, `packages/utils`)

| ID | Критичність | Категорія / Проблема | Статус | Як виправлено |
|---|---|---|---|---|
| **FE-H1** | High | Зберігання access JWT у `localStorage` + перехресне читання ключів між лендингом, бізнес-адмінкою та платформною адмінкою | **Частково виправлено / Потребує погодження архітектури** | Негайно ізольовано `localStorage`-ключі по застосунках (прибрано перехресне читання/запис між 3 веб-застосунками) та підключено повне очищення стану на 401/logout. Повна міграція на in-memory access token + same-site cookie винесена на погодження користувача (див. Розділ 4). |
| **FE-H2** | High | Відсутність HTTP-заголовків безпеки (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) у Next.js лендингу та Vite-адмінках | **Виправлено** | Налаштовано `headers()` і `poweredByHeader: false` у `apps/bizx-landing/next.config.ts`; додано `server.headers` / `preview.headers` та `<meta name="referrer" content="no-referrer" />` в `apps/bizx-admin` та `apps/bizx-platform-admin`. |
| **FE-H3** | High | Відсутність валідації URL вкладень у `OrderChatBox` та `MobileChatThread` (ризик `javascript:`/`data:` URI при ін’єкції або підміні відповіді) | **Виправлено** | Додано `sanitizeUiUrl` у `@bizx/ui` та `sanitizeNavigationUrl` + `Linking.canOpenURL` у `MobileChatThread`; оновлено `resolveMediaUrl` та `resolveMobileMediaUrl` з жорсткою забороною `javascript:`, `data:`, `vbscript:` та несанкціонованого `blob:`. |
| **FE-H4** | High | Несанітизовані `host`/`slug` у Next.js `middleware.ts` без кешу та з витоком таймерів | **Виправлено** | Впроваджено `isValidSlug`, `isValidCustomHostname`, `INTERNAL_API_URL`, `redirect: 'error'`, `finally { clearTimeout }`, та обмежений TTL-кеш (до 500 записів / 30с). |
| **FE-H5** | High | Витік `previewToken` через URL query string `?preview=...` у `Referer` / історію браузера / логи | **Виправлено** | Перенесено токен у URL-фрагмент `#preview=...`, негайне очищення адресного рядка через `window.history.replaceState`, а API-клієнт передає його у заголовку `X-Store-Preview-Token`. |
| **FE-H6** | High | Spreadsheet Formula Injection (CWE-1236) при експорті CSV/Excel в аналітиці + відомі CVE у `xlsx@0.18.5` | **Виправлено (CWE-1236) / Потребує погодження залежності (`xlsx`)** | Усі клітинки Excel/CSV нейтралізуються через `sanitizeSpreadsheetRows()` (префікс `'` для `=`, `+`, `-`, `@`, `\t`, `\r`); експорт CSV переведено на zero-dep `serializeSafeCsv()` + `sanitizeFilenameSegment()`. Заміна пакета `xlsx` винесена на погодження (Розділ 4). |
| **FE-M1..M5** | Medium | Необроблена подія `bizx:unauthorized` в обох адмінках та мобільному додатку (застарілі дані лишалися у пам’яті після 401/logout); відхилений логін в адмінках не викликав `auth.logout()` на сервері; широкі `<input accept="image/*">` (приймали `.svg`) без клієнтської перевірки розміру/MIME; неекранований `encodePathSegment` у маршрутах API-клієнта; прототипні пошуки в `I18n.resolveKey` та `RoleIcon`; відсутність `noopener` у `PlatformLayout` | **Виправлено** | Підключено `bizx:unauthorized` і повний reset сторів у `bizx-admin`, `bizx-platform-admin`, `bizx-landing`, `bizx-mobile`; при відхиленні доступу викликається `auth.logout()`; усі file-інпути переведено на явні MIME + `validateUploadFile()` + revoke `blob:` URL; додано `encodePathSegment()` у `@bizx/api-client`; виправлено `hasOwnProperty` у `I18n` і `RoleIcon` та `replaceAll` замість `new RegExp`; додано `rel="noopener noreferrer"`; додано `autoComplete` та `minLength={8}` на полях паролів. |
| **FE-M6** | Medium | Відсутність `expo-secure-store` у мобільному додатку (токен лише в оперативній пам’яті, `EXPO_PUBLIC_API_URL` не враховувався) | **Частково виправлено / Потребує погодження залежності** | Додано підтримку `process.env.EXPO_PUBLIC_API_URL` та очищення `useCartStore`/`useMobileStoresStore` на 401/logout. Додавання `expo-secure-store` винесено на погодження (Розділ 4). |

---

## 3. Каталог перевикористовуваних захисних інструментів (Security Toolkit)

Усі захисні механізми оформлені як багаторазові модулі, щоб **будь-який новий функціонал автоматично успадковував захист**:

### Backend (`apps/api/src/common/security/` та `apps/api/src/auth/`)

| Модуль / Файл | Призначення | Як використовувати у новому коді |
|---|---|---|
| `JwtAuthGuard` (глобальний `APP_GUARD`) | Закриває **всі** нові маршрути за замовчуванням | Не потрібно додавати `@UseGuards(JwtAuthGuard)` на нові контролери; публічні ендпоінти явно позначайте `@Public()`. |
| `AuthTokenVerifierService` (`apps/api/src/auth/auth-token-verifier.service.ts`) | Єдине джерело верифікації JWT (`HS256`, `tokenType === 'access'`, UUID, перевірка активності користувача в БД) | Використовуйте `verifyOptionalBearerHeader()` на публічних маршрутах з опціональною авторизацією. |
| `CsrfOriginGuard` (`apps/api/src/common/security/csrf-origin.guard.ts`) | Захист cookie-ендпоінтів від CSRF (allowlist `Origin`/`Referer` + перевірка `X-Requested-With` / JSON) | Додавайте `@UseGuards(CsrfOriginGuard)` на будь-який новий маршрут, що читає cookies. |
| `securityHeadersMiddleware` (`apps/api/src/common/security/security-headers.middleware.ts`) | Глобальні HTTP-заголовки (`nosniff`, `DENY`, `no-referrer`, `Permissions-Policy`, `COOP`, `CORP`, `HSTS`) | Активний автоматично для всіх маршрутів Express/NestJS. |
| `security-config.ts` (`apps/api/src/common/security/security-config.ts`) | Fail-fast валідація секретів, єдиний CORS allowlist, `isLocalDevEnv()`, `parseTrustProxySetting()` | Ніколи не читайте `process.env.JWT_SECRET \|\| '...'` напряму — використовуйте `getJwtSecret()`, `getPreviewJwtSecret()`, `getMediaSigningSecret()`. |
| `SafeUuidPipe` (`apps/api/src/common/security/safe-uuid.pipe.ts`) | Строга перевірка RFC-4122 UUID у `@Param()` до звернення до БД | Додавайте `@Param('id', SafeUuidPipe)` на кожен UUID-параметр маршруту. |
| `safe-storage-key.ts` (`apps/api/src/common/security/safe-storage-key.ts`) | `canonicalizeStorageKey()`, `getSafeExtensionForMime()`, `sanitizeAttachmentFileName()`, `SAFE_INLINE_IMAGE_MIMES` | Використовуйте для будь-яких операцій зі сховищем R2; завжди передавайте `file.mimetype` у `storageService.generateFileKey()`. |
| `StorageService.assertAttachmentsScopedToPrefix()` / `assertNotPrivateAttachmentUrl()` | Запобігання cross-tenant HMAC signing oracle | Викликайте при збереженні вкладень у будь-який новий приватний чат/сущність із префіксом `<entity>/<entityId>`. |

### Shared & Frontend (`packages/utils`, `packages/ui`, `packages/api-client`, `packages/common-types`)

| Інструмент | Пакет | Призначення |
|---|---|---|
| `isValidSlug`, `isValidCustomHostname`, `encodePathSegment`, `escapeIlikePattern` | `@bizx/utils` | Безпечна валідація маршрутів, хостів та екранування `ILIKE` запитів. |
| `sanitizeNavigationUrl`, `sanitizeMediaUrl` | `@bizx/utils` | Суворий allowlist протоколів (`https:`/`http:`/відносні), блокування `javascript:`, `data:`, `vbscript:`, `blob:`, SVG. |
| `sanitizeSpreadsheetCell`, `sanitizeSpreadsheetRows`, `serializeSafeCsv`, `sanitizeFilenameSegment` | `@bizx/utils` | Повний захист від CSV/Excel Formula Injection (CWE-1236) та безпечні імена файлів. |
| `UPLOAD_POLICIES`, `validateUploadFile` | `@bizx/utils` | Єдина клієнтська перевірка MIME, розширення та ліміту 10 МБ перед завантаженням. |
| `SafeExternalLink`, `sanitizeUiUrl`, `SAFE_CHAT_ACCEPT`, `SAFE_RASTER_IMAGE_ACCEPT` | `@bizx/ui` | Готовий компонент зовнішніх посилань (`noopener noreferrer` + URL-санітизація) і константи `accept`. |
| `safeMediaUrlSchema` | `@bizx/common-types` | Zod-схема для всіх URL медіафайлів у DTO. |
| `X-Requested-With: XMLHttpRequest` + `encodePathSegment` | `@bizx/api-client` | Автоматичний CSRF-заголовок на всіх мутаціях і refresh-запитах та безпечне кодування сегментів шляху. |

### Чек-лист безпеки для нових фіч

1. Новий ендпоінт захищений за замовчуванням (`JwtAuthGuard`); додайте `@Public()` лише якщо він дійсно публічний, і `@Throttle(...)` для ресурсоємних/публічних дій.
2. Усі `:id` параметри використовують `SafeUuidPipe`; усі body/query проходять через `ZodValidationPipe` із явними лімітами `.max(...)`.
3. При `UPDATE` у БД завжди передавайте явний whitelist полів (заборонено `...dto` spread).
4. Усі пошуки через `ilike` обов’язково обгортаються в `escapeIlikePattern(...)`.
5. Усі фінансові / квотні операції виконуються всередині `db.transaction` з `FOR UPDATE` або `pg_advisory_xact_lock` та умовним `WHERE ... RETURNING`.
6. Приватні файли зберігаються тільки в директоріях `<scope>/<resourceId>/` і перевіряються через `assertAttachmentsScopedToPrefix()`.
7. Нові посилання у UI використовують `SafeExternalLink` або `sanitizeNavigationUrl`; нові експорти таблиць — `sanitizeSpreadsheetRows` / `serializeSafeCsv`; нові завантаження файлів — `validateUploadFile` + явний `accept`.

---

## 4. Архітектурні та пакетні рішення, що потребують погодження користувача

Відповідно до правил `AGENTS.md` (п. 1 — заборона встановлення залежностей без схвалення; п. 2 — погодження глибоких/ламаючих архітектурних змін), наступні 3 покращення підготовлені як пропозиції на вибір:

1. **Повна відмова від `localStorage` для веб-access JWT (перехід на in-memory closure + `HttpOnly` cookie silent refresh):**
   - *Наразі:* ключі вже ізольовані між застосунками, але у разі XSS-вразливості токен все ще доступний з `localStorage`.
   - *Нюанс:* потребує єдиного домену/піддоменів у prod (наприклад, `api.bizx.ua`, `admin.bizx.ua`, `panel.bizx.ua` з `Domain=.bizx.ua` і `SameSite=Lax`/`Strict`) або reverse-proxy у dev.
2. **Заміна `xlsx@0.18.5` (містить відомі CVE: `CVE-2023-30533`, `CVE-2024-22363`) у `apps/bizx-admin` та `apps/bizx-platform-admin`:**
   - *Наразі:* експорт CSV вже переведено на власний zero-dep `serializeSafeCsv()`, а всі комірки Excel нейтралізовані від CWE-1236, проте сама бібліотека `xlsx@0.18.5` досі використовується для генерації `.xlsx`.
   - *Варіанти:* перехід на `exceljs` / `write-excel-file` (найлегший і без відомих CVE) або відмова від `.xlsx` на користь безпечного `.csv`.
3. **Захищене зберігання сесії у мобільному застосунку (`expo-secure-store`):**
   - *Наразі:* токен зберігається в пам’яті (скидається при перезапуску додатку).
   - *Варіант:* встановлення `expo-secure-store` (Keychain на iOS / Keystore на Android) для персистентної та апаратно захищеної авторизації.
