# BizX Platform — B2B SaaS Monorepo (pnpm + Turborepo)

Архитектурное ядро B2B SaaS платформы **BizX**, организованное в виде монорепозитория на базе **Turborepo** и **pnpm workspaces**.

---

## 📁 Структура монорепозитория

```
bizx-platform/
├── apps/
│   ├── api/                     # Backend API сервис (Nest.js 11 + Drizzle ORM + Zod + Cloudflare R2 + Redis + BullMQ)
│   ├── bizx-landing/            # Публичный промо/маркетинговый сайт (Next.js 15 App Router + SSR + Tailwind + shadcn/ui + Zod)
│   ├── bizx-admin/              # SPA панель управления / админка (React 19 + Vite + Tailwind + shadcn/ui + Zod + Zustand)
│   └── bizx-mobile/             # Мобильное приложение (React Native 0.76 + Expo 52 + NativeWind v4 + Zustand + Zod)
│
├── packages/
│   ├── database/                # @bizx/database: Схема Drizzle ORM, клиент PostgreSQL, миграции, Drizzle-Zod
│   ├── ui/                      # @bizx/ui: Общие компоненты shadcn/ui (Button, Card, Input, Badge, Label, cn helper)
│   ├── tailwind-config/         # @bizx/tailwind-config: Единый пресет Tailwind (токены, цвета, анимации, dark mode)
│   ├── common-types/            # @bizx/common-types: Единые Zod-схемы валидации и TypeScript интерфейсы (Auth, Tenant, DTO)
│   ├── eslint-config/           # @bizx/eslint-config: Модульный ESLint 9 Flat Config (base, react, next, node)
│   ├── typescript-config/       # @bizx/typescript-config: Базовые конфигурации tsconfig (base, node, react)
│   └── utils/                   # @bizx/utils: Общие утилиты (logger, форматирование, хелперы)
│
├── pnpm-workspace.yaml          # Конфигурация воркспейсов pnpm
├── turbo.json                   # Оркестрация задач Turborepo (pipelines, кэш, env vars)
├── .env.example                 # Шаблон переменных окружения
└── package.json                 # Корневой манифест со скриптами запуска
```

---

## 🛠 Технологический стек приложений

| Приложение         | Назначение                                  | Стек                                                                                                                                                      |
| :----------------- | :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`api`**          | Ядро API и фоновых задач                    | **Nest.js 11**, **Drizzle ORM** (PostgreSQL), **Zod** (`ZodValidationPipe`), **Cloudflare R2** (`@aws-sdk/client-s3`), **Redis** (`ioredis`) + **BullMQ** |
| **`bizx-landing`** | Публичный SSR лендинг                       | **Next.js 15**, **Tailwind CSS**, **shadcn/ui** (из `@bizx/ui`), **Zod** формы                                                                            |
| **`bizx-admin`**   | SPA панель суперадмина / арендаторов        | **React 19**, **Vite**, **Tailwind CSS**, **shadcn/ui** (из `@bizx/ui`), **Zustand**, **Zod**                                                             |
| **`bizx-mobile`**  | Мобильный клиент для сотрудников/управления | **React Native 0.76**, **Expo SDK 52**, **NativeWind v4**, **Zustand**, **Zod**                                                                           |

---

## 🚀 Запуск из корневой директории

### 1. Запуск всех веб-сервисов одновременно

```bash
pnpm dev
```

> Запустит параллельно `bizx-landing` (порт 3000), `api` (порт 3001) и `bizx-admin` (порт 3002).

---

### 2. Запуск каждого приложения по отдельности

```bash
pnpm dev:api       # Запуск Nest.js API (порт 3001)
pnpm dev:landing   # Запуск Next.js 15 Landing (порт 3000)
pnpm dev:admin     # Запуск Vite React Admin SPA (порт 3002)
pnpm dev:mobile    # Запуск Expo Mobile (QR-код для Expo Go / эмулятора)
```

Или через нативный фильтр pnpm:

```bash
pnpm --filter @bizx/api dev
pnpm --filter @bizx/landing dev
pnpm --filter @bizx/admin dev
pnpm --filter @bizx/mobile start
```

---

### 3. Сборка (Build)

```bash
# Сборка всех проектов монорепозитория с параллельным кэшированием Turbo:
pnpm build

# Сборка конкретного сервиса:
pnpm build:api
pnpm build:landing
pnpm build:admin
```

---

### 4. База данных (Drizzle ORM)

Все операции со схемой БД и миграциями выполняются прямо из корня:

```bash
pnpm db:generate   # Генерация файлов SQL-миграций из Drizzle схемы
pnpm db:migrate    # Применение миграций к PostgreSQL
pnpm db:push       # Быстрая синхронизация схемы с базой данных (prototyping)
pnpm db:studio     # Запуск визуального интерфейса Drizzle Studio
```

---

### 5. Проверка типов, Линтинг и Форматирование

```bash
pnpm check-types   # Проверка TypeScript во всех приложениях и пакетах
pnpm lint          # Запуск ESLint 9 Flat Config во всех проектах
pnpm lint:fix      # Автоматическое исправление замечаний ESLint
pnpm format        # Форматирование кода через Prettier 3
pnpm format:check  # Проверка форматирования (для CI)
```

---

## 🎨 Общая дизайн-система и стили (`shadcn/ui` + `Tailwind`)

- **Единый источник стилей**: `packages/tailwind-config/tailwind.config.js` экспортирует пресет дизайн-токенов (`--primary`, `--background`, `--card`, `--radius` и т.д.).
- **Единый источник компонентов**: `packages/ui` содержит shadcn/ui компоненты (`Button`, `Card`, `Input`, `Badge`, `Label`), построенные на `class-variance-authority` и утилите `cn` (`clsx` + `tailwind-merge`).
- И `bizx-landing` (Next.js), и `bizx-admin` (Vite) подключают пресет в свой `tailwind.config` и импортируют общие компоненты без дублирования верстки!
