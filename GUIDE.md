# Полное практическое руководство разработчика BizX Platform

Добро пожаловать в проект **BizX Platform**! Это руководство создано простым языком с наглядными и тривиальными примерами, чтобы вы могли уверенно развивать платформу, создавать новые модули, подключать базы данных, писать интерфейсы и понимать, как взаимодействуют все части монорепозитория.

---

## 1. Архитектура монорепозитория: что и где лежит

Проект построен по принципу **монорепозитория** с использованием **pnpm workspaces** и **Turborepo**:

- **pnpm workspaces** объединяет все проекты под одним `node_modules` и связывает их между собой через ссылки (`workspace:*`).
- **Turborepo** запускает сборки, линтеры и тесты параллельно, кэшируя результаты (если код не менялся, повторный запуск мгновенный — _FULL TURBO_).

### Структура каталогов

```
bizx-platform/
├── apps/                         # Приложения сервиса
│   ├── api/                      # Бэкенд на Nest.js 11 (порт 3101)
│   ├── bizx-landing/             # Публичный SSR-сайт на Next.js 15 (порт 3100)
│   ├── bizx-admin/               # Панель управления SPA на React 19 + Vite (порт 3102)
│   └── bizx-mobile/              # Мобильное приложение на Expo SDK 52 + React Native (порт 8081)
│
├── packages/                     # Общие переиспользуемые модули
│   ├── api-client/               # Единый типизированный HTTP-клиент (fetch + refresh token)
│   ├── database/                 # Drizzle ORM + подключение к PostgreSQL
│   ├── ui/                       # Общие UI-компоненты (Tailwind + shadcn/ui)
│   ├── common-types/             # Общие Zod-схемы и TypeScript-типы (DTO)
│   ├── utils/                    # Вспомогательные функции (логгер, даты и др.)
│   ├── tailwind-config/          # Базовая конфигурация Tailwind и CSS-переменных
│   ├── typescript-config/        # Базовые конфиги tsconfig
│   └── eslint-config/            # Стандарты линтинга ESLint Flat Config
│
├── .env.example                  # Образец переменных окружения для всех сервисов
├── pnpm-workspace.yaml           # Декларация пакетов монорепозитория
├── turbo.json                    # Конфигурация задач Turborepo
└── GUIDE.md                      # Это руководство
```

---

## 2. Команды для запуска и разработки

Все команды можно запускать прямо из корневой директории:

| Команда            | Что делает                                                                 |
| :----------------- | :------------------------------------------------------------------------- |
| `pnpm dev`         | Запуск **всех** сервисов одновременно                                      |
| `pnpm dev:api`     | Запуск только бэкенда Nest.js (`http://localhost:3101`)                    |
| `pnpm dev:landing` | Запуск только лендинга Next.js (`http://localhost:3100`)                   |
| `pnpm dev:admin`   | Запуск только админки Vite (`http://localhost:3102`)                       |
| `pnpm dev:mobile`  | Запуск Metro-бандлера мобильного приложения Expo (`http://localhost:8081`) |
| `pnpm check-types` | Проверка типов TypeScript во всех приложениях и пакетах                    |
| `pnpm lint`        | Проверка кода линтером ESLint                                              |
| `pnpm lint:fix`    | Автоматическое исправление ошибок линтера                                  |
| `pnpm format`      | Форматирование всего проекта с помощью Prettier                            |

---

## 3. Общие типы и валидация (`packages/common-types`)

### Зачем нужен этот пакет?

Чтобы не дублировать типы данных и валидацию на фронтенде и бэкенде. Схема пишется один раз на **Zod**, и из неё автоматически получается тип TypeScript.

### Тривиальный пример создания новой схемы

Откройте [packages/common-types/src/index.ts](file:///C:/Users/vluki/Documents/Projects/bizx-platform/packages/common-types/src/index.ts) и добавьте:

```typescript
import { z } from 'zod';

// 1. Описываем схему валидации
export const createProductSchema = z.object({
  title: z.string().min(3, 'Название товара должно быть не короче 3 символов'),
  price: z.number().positive('Цена должна быть больше нуля')
});

// 2. Автоматически извлекаем TypeScript тип (DTO)
export type CreateProductDto = z.infer<typeof createProductSchema>;
```

Теперь этот `createProductSchema` и `CreateProductDto` можно импортировать:

- в `apps/api` (для валидации входящего тела запроса);
- в `apps/bizx-admin` или `apps/bizx-landing` (для валидации формы перед отправкой).

---

### 3.1. Клиентский HTTP-клиент (`packages/api-client`)

#### Почему не Axios?
Вместо Axios в проекте создан легковесный пакет `@bizx/api-client` на базе нативного **Fetch API**:
- **0 КБ лишних зависимостей** в бандлах фронтенда и мобилки.
- **Поддержка SSR в Next.js 15:** нативный `fetch` на 100% совместим с системой серверного кэширования Next.js (`cache: 'no-store'`, `revalidate`).
- **Единый для всех клиентов:** работает одинаково в вебе (Next.js, Vite SPA) и в React Native (Expo).
- **Встроенная защита и автообновление токенов:** при ошибке `401 Unauthorized` клиент автоматически вызывает `/auth/refresh` и повторяет оригинальный запрос без дублирования вызовов (с защитой мьютексом).

#### Пример использования в клиентских приложениях:

```typescript
import { createApiClient } from '@bizx/api-client';

// Создаем инстанс клиента:
export const api = createApiClient({
  baseUrl: 'http://localhost:3101'
});

// 1. Авторизация (вход)
const loginRes = await api.auth.login({
  email: 'owner@example.com',
  password: 'my-password-123'
});

// 2. Получение текущего профиля (GET /auth/me)
const me = await api.auth.me();

// 3. Выход (POST /auth/logout)
await api.auth.logout();

// 4. Произвольные запросы к API с типизацией:
const products = await api.client.get('/products');
```

---

## 4. База данных (`packages/database`) — Drizzle ORM

### Зачем нужен Drizzle ORM?

Drizzle — это современная типобезопасная ORM. Она не скрывает чистый SQL за сложной абстракцией, работает с максимальной скоростью и генерирует точные типы TypeScript.

### Пошаговый пример: Создание новой таблицы

#### Шаг 1: Создаем файл таблицы

Создайте файл `packages/database/src/schema/products.ts`:

```typescript
import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Типы для выборки и вставки:
export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;
```

#### Шаг 2: Экспортируем таблицу

В [packages/database/src/schema/index.ts](file:///C:/Users/vluki/Documents/Projects/bizx-platform/packages/database/src/schema/index.ts) добавьте:

```typescript
export * from './users.js';
export * from './products.js'; // <-- Добавили новую таблицу
```

#### Шаг 3: Применение к базе данных

- `pnpm db:push` — быстро применить изменения схемы к локальной базе данных без миграций.
- `pnpm db:generate` — сгенерировать миграцию в папку `drizzle`.
- `pnpm db:migrate` — накатить миграции.
- `pnpm db:studio` — открыть веб-интерфейс Drizzle Studio для просмотра и редактирования записей.

#### Шаг 4: Примеры запросов к БД в коде

```typescript
import { createDatabaseClient, eq } from '@bizx/database';

const db = createDatabaseClient();

// 1. Создание записи (INSERT)
const [newProduct] = await db
  .insert(products)
  .values({
    title: 'Кофеварка',
    price: 15000
  })
  .returning();

// 2. Получение всех записей (SELECT)
const allProducts = await db.select().from(products);

// 3. Поиск по условию (WHERE)
const item = await db.select().from(products).where(eq(products.id, someId));
```

---

## 5. UI-компоненты (`packages/ui`) — React + Tailwind

### Зачем нужен пакет `@bizx/ui`?

Чтобы и админка (`bizx-admin`), и лендинг (`bizx-landing`), и будущие сайты клиентов имели единые стилизованные кнопки, инпуты, модальные окна, темы оформления и цветовую палитру.

### Тривиальный пример: Создание компонента `Card` (Карточка)

1. Создайте файл `packages/ui/src/components/card.tsx`:

```tsx
import * as React from 'react';
import { cn } from '../lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border bg-card p-6 text-card-foreground shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
```

2. Экспортируйте его в [packages/ui/src/index.ts](file:///C:/Users/vluki/Documents/Projects/bizx-platform/packages/ui/src/index.ts):

```typescript
export * from './components/button';
export * from './components/card'; // <-- Добавили экспорт
export * from './lib/utils';
```

3. Используйте его в любом приложении:

```tsx
import { Card, Button } from '@bizx/ui';

export function MyWidget() {
  return (
    <Card className="max-w-md">
      <h2 className="text-xl font-bold mb-2">Заголовок карточки</h2>
      <p className="text-muted-foreground mb-4">Описание блока</p>
      <Button>Нажать</Button>
    </Card>
  );
}
```

> **Полезно знать:** функция `cn(...)` объединяет классы Tailwind с помощью `clsx` и `tailwind-merge`. Если вы передадите `<Card className="p-8">`, она корректно заменит стандартный `p-6` на `p-8` без конфликтов CSS.

---

## 6. Бэкенд (`apps/api`) — Nest.js

### Как устроен Nest.js?

Nest.js делит код на логические блоки — **Модули (Module)**. Каждый модуль состоит из:

1. **Controller** — принимает HTTP-запросы (`@Get()`, `@Post()`), валидирует входные параметры и отдает ответы.
2. **Service** — содержит бизнес-логику и работу с базой данных/сторонними API.
3. **Module** — регистрирует контроллер и сервис.

### Пример создания нового модуля `Products`

#### Шаг 1: Сервис (`apps/api/src/products/products.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { users } from '@bizx/database';

@Injectable()
export class ProductsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAll() {
    // Доступ к Drizzle ORM через базу данных:
    return await this.databaseService.db.select().from(users);
  }
}
```

#### Шаг 2: Контроллер (`apps/api/src/products/products.controller.ts`)

```typescript
import { Controller, Get } from '@nestjs/common';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts() {
    return await this.productsService.getAll();
  }
}
```

#### Шаг 3: Модуль (`apps/api/src/products/products.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}
```

#### Шаг 4: Регистрация в `app.module.ts`

В [apps/api/src/app.module.ts](file:///C:/Users/vluki/Documents/Projects/bizx-platform/apps/api/src/app.module.ts) просто добавьте `ProductsModule` в массив `imports`:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(...),
    DatabaseModule,
    StorageModule,
    QueuesModule,
    ProductsModule // <-- Подключили модуль
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
```

После этого эндпоинт `GET http://localhost:3101/products` станет активным!

### Фоновые задачи с Redis + BullMQ (`QueuesService`)

Если нужно выполнить долгую задачу (отправить письмо, обработать фото, сформировать PDF), её отправляют в очередь:

```typescript
// Внедряем QueuesService в конструктор сервиса:
constructor(private readonly queuesService: QueuesService) {}

// Добавляем задачу в очередь:
await this.queuesService.addJob('send-email', {
  to: 'client@example.com',
  subject: 'Добро пожаловать!'
});
```

### Загрузка файлов в Cloudflare R2 / S3 (`StorageService`)

Для загрузки файлов клиент запрашивает временную Presigned URL:

```typescript
constructor(private readonly storageService: StorageService) {}

// Получаем URL для прямой загрузки клиентом в S3/R2:
const { uploadUrl, fileKey, publicUrl } = await this.storageService.getPresignedUploadUrl(
  'documents/invoice-123.pdf',
  'application/pdf'
);
```

### Модуль авторизации (`AuthModule`) — JWT + Refresh Tokens + Защита от XSS

Модуль авторизации (`apps/api/src/auth`) предоставляет безопасную аутентификацию для всех платформ:

1. **Access Token (JWT, 15 минут)**: передается в заголовке `Authorization: Bearer <token>` или в куке `access_token`.
2. **Refresh Token (7 дней)**: 
   - Для веб-браузеров сохраняется в защищенной куке `httpOnly`, `Secure`, `SameSite=Lax` (полная защита от XSS-атак).
   - Для мобильного приложения (React Native/Expo) возвращается в теле JSON-ответа для сохранения в `SecureStore`.
3. **Хранение в PostgreSQL**: таблица `refresh_tokens` хранит SHA-256 хеши токенов, `userAgent` и `ipAddress` с ротацией токенов при каждом обновлении (Token Rotation).

#### Доступные эндпоинты:
- `POST /auth/register` — регистрация (`email`, `password`, `name`, `role`).
- `POST /auth/login` — вход по email и паролю.
- `POST /auth/refresh` — обновление токенов (читает куку `refresh_token` или поле `refreshToken` в JSON).
- `POST /auth/logout` — выход и инвалидация refresh токена.
- `GET /auth/me` — получение профиля текущего пользователя (защищен `JwtAuthGuard`).

#### Как защитить любой контроллер или эндпоинт:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';

@Controller('profile')
@UseGuards(JwtAuthGuard) // <-- Защищает все методы контроллера
export class ProfileController {
  @Get()
  getProfile(@CurrentUser('sub') userId: string) {
    return { userId };
  }
}
```

---

## 7. Лендинг (`apps/bizx-landing`) — Next.js 15 App Router (SSR)

### Как создавать новые страницы

Next.js 15 использует файловую маршрутизацию: папка внутри `app/` с файлом `page.tsx` становится URL-адресом.

Пример: страница "О нас" (`http://localhost:3100/about`):
Создайте `apps/bizx-landing/app/about/page.tsx`:

```tsx
import React from 'react';
import { Button } from '@bizx/ui';

export default function AboutPage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-4">О нашей платформе</h1>
      <p className="text-muted-foreground mb-6">
        Мы помогаем бизнесу масштабироваться без оверхеда.
      </p>
      <Button variant="default">Связаться с нами</Button>
    </div>
  );
}
```

### Серверные и Клиентские компоненты

- По умолчанию все файлы в Next.js App Router — **Server Components** (выполняются на сервере, не грузят JavaScript в браузер, могут напрямую делать `fetch` или читать данные).
- Если вам нужны интерактивность (`useState`, `useEffect`, `onClick`), добавьте директиву `'use client';` на самой первой строке файла:

```tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@bizx/ui';

export function Counter() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>Кликов: {count}</Button>;
}
```

---

## 8. Админка (`apps/bizx-admin`) — Vite + React (SPA) + Zustand

### Как работает клиентское состояние с Zustand

Zustand — это простая и быстрая библиотека для глобального состояния без лишнего бойлерплейта Redux.

Пример создания стора пользователя:
В `apps/bizx-admin/src/store/useUserStore.ts`:

```typescript
import { create } from 'zustand';

interface UserState {
  token: string | null;
  userName: string;
  setToken: (token: string, name: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  token: null,
  userName: 'Гость',
  setToken: (token, userName) => set({ token, userName }),
  logout: () => set({ token: null, userName: 'Гость' })
}));
```

Использование в компоненте:

```tsx
import React from 'react';
import { useUserStore } from './store/useUserStore';
import { Button } from '@bizx/ui';

export function ProfileHeader() {
  const { userName, logout } = useUserStore();

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <span>Пользователь: {userName}</span>
      <Button variant="outline" size="sm" onClick={logout}>
        Выйти
      </Button>
    </div>
  );
}
```

---

## 9. Мобильное приложение (`apps/bizx-mobile`) — React Native + Expo + NativeWind

### Как устроена стилизация с NativeWind

NativeWind транслирует классы Tailwind CSS в стили React Native:

```tsx
import React from 'react';
import { SafeAreaView, Text, View, TouchableOpacity } from 'react-native';

export function StatusCard() {
  return (
    <View className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <Text className="text-xs uppercase font-semibold text-slate-400">Статус</Text>
      <Text className="text-xl font-bold text-slate-900 mt-1">Все системы в норме</Text>

      <TouchableOpacity className="mt-4 bg-blue-600 py-2.5 rounded-lg items-center">
        <Text className="text-white font-medium text-sm">Обновить</Text>
      </TouchableOpacity>
    </View>
  );
}
```

> **Важно для работы Expo в pnpm**:
> При добавлении сторонних нативных библиотек в мобильное приложение не забудьте перезапускать Metro с ключом `-c` для очистки кэша:
> `pnpm --filter @bizx/mobile start -c`

---

## 10. Как правильно добавлять новые зависимости

Благодаря pnpm, вы устанавливаете зависимости именно в тот сервис, которому они нужны:

1. **Добавить npm-библиотеку в конкретное приложение:**

   ```bash
   pnpm --filter @bizx/api add date-fns
   pnpm --filter @bizx/admin add lucide-react
   ```

2. **Подключить общий внутренний пакет монорепозитория (например `@bizx/ui` в новое приложение):**
   В `package.json` нужного приложения в блоке `dependencies` укажите:
   ```json
   "@bizx/ui": "workspace:*"
   ```
   и выполните `pnpm install`.

---

## 11. Работа с Docker и локальной инфраструктурой

### Нужен ли Docker для фронтенда и мобилки?

- **Для мобильного приложения (`bizx-mobile`) — НЕТ**: React Native/Expo компилируется в бинарные файлы для iOS/Android или открывается через Expo Go на телефоне. В контейнерах Docker мобильные приложения не живут.
- **Для админки (`bizx-admin`) — НЕТ (для разработки)**: Это SPA (Single Page Application). При сборке генерируются чистые HTML/JS/CSS файлы, которые раздаются через CDN (Vercel, Cloudflare Pages, S3). Docker для SPA нужен лишь в том случае, если вы деплоите всё на собственный VPS через Nginx.
- **Для лендинга (`bizx-landing`) — ОПЦИОНАЛЬНО**: Next.js App Router (SSR) обычно деплоят на serverless-платформы (Vercel, Cloudflare) без Docker. Если же сервер свой (VPS/Kubernetes), для Next.js создается отдельный Dockerfile.

### Почему Docker критически важен для бэкенда?

1. **Инфраструктура баз данных (PostgreSQL + Redis)**:
   Вам не нужно устанавливать сервер PostgreSQL или Redis в операционную систему Windows. Одной командой запускаются официальные легковесные контейнеры Postgres 16 и Redis 7 с настроенными портами (`5432`, `6379`) и постоянными томами данных (volumes).
2. **Изолированный production-образ API**:
   В [apps/api/Dockerfile](file:///C:/Users/vluki/Documents/Projects/bizx-platform/apps/api/Dockerfile) настроена многоэтапная сборка (Multi-stage build) на базе `node:22-alpine` и `turbo prune`. Он автоматически отсекает неиспользуемые части монорепозитория, упаковывает код и запускает сервер от безопасного непривилегированного пользователя `nestjs`.

### Удобные команды для работы с Docker

| Команда             | Описание                                                                               |
| :------------------ | :------------------------------------------------------------------------------------- |
| `pnpm docker:db`    | Запустить только **PostgreSQL** и **Redis** в фоне (идеально для локальной разработки) |
| `pnpm docker:up`    | Запустить весь стек (PostgreSQL + Redis + NestJS API) в контейнерах                    |
| `pnpm docker:build` | Пересобрать Dockerfile бэкенда и перезапустить контейнеры                              |
| `pnpm docker:logs`  | Смотреть логи всех запущенных контейнеров в реальном времени                           |
| `pnpm docker:down`  | Остановить контейнеры (данные в базах сохраняются в volumes)                           |

### Рекомендуемый флоу локальной разработки

1. В начале работы запустите базы данных:
   ```bash
   pnpm docker:db
   ```
2. Запустите бэкенд или весь проект локально:
   ```bash
   pnpm dev:api   # только бэкенд с мгновенным hot-reload
   # или
   pnpm dev       # весь проект целиком
   ```
3. Для миграций схемы Drizzle к запущенной в Docker базе:
   ```bash
   pnpm db:push
   ```
