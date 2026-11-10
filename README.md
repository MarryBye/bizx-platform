# BizX Platform — Enterprise B2B SaaS Monorepo

BizX Platform is an enterprise-grade, multi-tenant B2B commerce and store management platform architected as a high-performance monorepo using **pnpm workspaces** and **Turborepo**. The platform provides end-to-end commerce operations: multi-store tenant isolation, staff role management, real-time product catalogs, order lifecycle tracking, async job processing, and direct-to-cloud asset storage.

---

## Architecture Overview

BizX utilizes an isolated package and application topology. All client applications consume shared UI tokens and typed API contracts, while the backend coordinates business transactions, queues, and persistent storage.

```mermaid
flowchart TD
    subgraph Clients["Applications Layer (apps/*)"]
        Landing["Next.js 15 Landing<br/><code>@bizx/landing</code> (Port 3100)"]
        Admin["React 19 Tenant Admin<br/><code>@bizx/admin</code> (Port 3102)"]
        PlatAdmin["React 19 Platform Admin<br/><code>@bizx/platform-admin</code> (Port 3103)"]
        Mobile["Expo 52 Mobile Client<br/><code>@bizx/mobile</code> (React Native 0.76)"]
    end

    subgraph Packages["Shared Workspace Packages (packages/*)"]
        UI["@bizx/ui<br/>Shared Design System"]
        ApiClient["@bizx/api-client<br/>Typed REST Client"]
        CommonTypes["@bizx/common-types<br/>Zod Schemas & DTOs"]
        DBPkg["@bizx/database<br/>Drizzle ORM Schema & Client"]
        Utils["@bizx/utils<br/>Shared Helpers & Logging"]
        Configs["Shared Configurations<br/>Tailwind / TS / ESLint 9"]
    end

    subgraph Backend["Core API Service"]
        API["NestJS 11 Engine<br/><code>@bizx/api</code> (Port 3101)"]
        Queue["BullMQ Queue Workers<br/>Async Job Execution"]
    end

    subgraph Infrastructure["Persistence & Storage Infrastructure"]
        Postgres[("PostgreSQL 16<br/>Relational Data Store")]
        Redis[("Redis 7<br/>Cache & BullMQ Broker")]
        R2[("Cloudflare R2<br/>S3-Compatible Object Store")]
    end

    Landing --> ApiClient
    Landing --> UI
    Admin --> ApiClient
    Admin --> UI
    PlatAdmin --> ApiClient
    PlatAdmin --> UI
    Mobile --> ApiClient

    ApiClient --> CommonTypes
    UI --> Configs
    Admin --> Configs
    Landing --> Configs
    PlatAdmin --> Configs

    ApiClient -.->|HTTP / REST| API
    API --> CommonTypes
    API --> DBPkg
    API --> Utils
    API --> Queue

    DBPkg --> Postgres
    Queue --> Redis
    API --> Redis
    API --> R2
```

---

## Workspace Inventory

### Applications (`apps/*`)

| Application | Description | Port | Technology Stack |
|:---|:---|:---:|:---|
| **`@bizx/api`** | Central REST API and asynchronous queue processing service | `3101` | NestJS 11, Drizzle ORM, BullMQ, Redis, Zod, Cloudflare R2 |
| **`@bizx/landing`** | Public marketing and customer onboarding website | `3100` | Next.js 15 (App Router, SSR), React 19, Tailwind CSS, shadcn/ui |
| **`@bizx/admin`** | Store owner and manager operational management SPA | `3102` | React 19, Vite 6, Zustand, Tailwind CSS, shadcn/ui |
| **`@bizx/platform-admin`** | Super-administrator dashboard for tenant lifecycle management | `3103` | React 19, Vite 6, Zustand, Tailwind CSS, shadcn/ui |
| **`@bizx/mobile`** | Cross-platform mobile app for staff and customer operations | — | React Native 0.76, Expo SDK 52, NativeWind v4, Zustand |

### Shared Packages (`packages/*`)

| Package | Purpose | Dependencies / Export |
|:---|:---|:---|
| **`@bizx/database`** | Centralized Drizzle schema definitions, PostgreSQL connection pooling, and migration tooling | `drizzle-orm`, `postgres`, `drizzle-kit` |
| **`@bizx/common-types`** | Shared Zod schemas, inferred TypeScript types, and API contract interfaces | `zod` |
| **`@bizx/api-client`** | Type-safe HTTP client wrapping API routes for consumption across web and mobile | `@bizx/common-types` |
| **`@bizx/ui`** | Reusable accessible UI components based on Tailwind CSS and Radix primitives | `class-variance-authority`, `clsx`, `tailwind-merge` |
| **`@bizx/utils`** | Common utility functions, formatting helpers, and runtime logger | TypeScript |
| **`@bizx/tailwind-config`** | Shared Tailwind CSS preset featuring unified design tokens and color scales | Tailwind CSS |
| **`@bizx/typescript-config`**| Shared `tsconfig` definitions (`base`, `node`, `react`) | TypeScript 5.7+ |
| **`@bizx/eslint-config`** | Modular ESLint 9 Flat Config presets (`base`, `react`, `next`, `node`) | ESLint 9 |

---

## System Capabilities

### 1. Multi-Tenant Store Hierarchy
- **Isolated Tenant Scopes:** Each store entity retains separate ownership, staff members, categories, products, and order streams.
- **Role-Based Access Control (RBAC):** Granular permissions across store roles (`owner`, `manager`, `staff`) enforced through NestJS custom decorators and guards.

### 2. High-Performance Relational Data Layer
- **Drizzle ORM:** Schema definitions with TypeScript inference, foreign key relations, cascade policies, and index tuning.
- **Migration Engine:** Declarative schema migrations with deterministic SQL generation via Drizzle Kit.

### 3. Asynchronous Job Processing & Caching
- **Redis 7 & BullMQ:** Dedicated background workers handling asynchronous operations without blocking main HTTP request threads.
- **In-Memory Cache:** Ephemeral caching layer for frequently accessed store configurations and tenant lookup caching.

### 4. Cloudflare R2 Asset Pipeline
- **Direct-to-Cloud Presigned URLs:** Assets (product photos, store banners) are uploaded directly from client applications to Cloudflare R2 via presigned S3 URLs, minimizing backend server load and bandwidth costs.

---

## Getting Started

### Prerequisites

- **Node.js**: `v22.0.0` or higher
- **pnpm**: `v12.10.1` (`corepack enable` or `npm install -g pnpm@12.10.1`)
- **Docker & Docker Compose**: For local PostgreSQL and Redis services

### 1. Clone & Environment Setup

```bash
git clone https://github.com/MarryBye/bizx-platform.git
cd bizx-platform

# Copy environment template
cp .env.example .env
```

Review `.env` and configure credentials if custom ports or external services are needed.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Infrastructure Services

Launch PostgreSQL and Redis containers using Docker Compose:

```bash
# Start background database and cache containers
docker compose up -d postgres redis

# Check container health status
docker compose ps
```

### 4. Database Setup & Migrations

Execute schema synchronization or migrations through Turborepo pipeline commands:

```bash
# Push schema directly to the database (development mode)
pnpm db:push

# Generate and apply versioned migrations
pnpm db:generate
pnpm db:migrate

# Optional: Seed initial development data
pnpm db:seed

# Optional: Launch visual database manager (Drizzle Studio)
pnpm db:studio
```

### 5. Launch Development Environment

Run all web applications and backend API concurrently:

```bash
pnpm dev
```

Alternatively, start services individually using workspace filters:

```bash
pnpm dev:api              # NestJS API (http://localhost:3101)
pnpm dev:landing          # Next.js Landing (http://localhost:3100)
pnpm dev:admin            # Vite Tenant Admin (http://localhost:3102)
pnpm dev:platform-admin   # Vite Platform Admin (http://localhost:3103)
pnpm dev:mobile           # Expo Mobile Development Server
```

---

## Workspace Scripts & Turborepo Pipelines

All monorepo pipelines are orchestrated through `turbo.json` with topological dependency resolution and incremental build caching.

| Command | Action |
|:---|:---|
| `pnpm build` | Compiles all packages and applications across the workspace |
| `pnpm dev` | Starts development servers in parallel with persistent streaming output |
| `pnpm lint` | Runs ESLint 9 Flat Config validation across all projects |
| `pnpm lint:fix` | Automatically fixes autofixable ESLint issues |
| `pnpm check-types` | Executes strict TypeScript compiler checks (`tsc --noEmit`) without emitting code |
| `pnpm format` | Formats all code using Prettier 3 |
| `pnpm format:check` | Verifies code formatting compliance against Prettier rules |
| `pnpm clean` | Purges build caches and compiled output directories |

---

## Database Management Reference

All database operations are encapsulated in the `@bizx/database` package and exposed at the root level:

```bash
# Generate SQL migration files from Drizzle schema definitions
pnpm db:generate

# Execute pending database migrations
pnpm db:migrate

# Fast prototyping schema push (synchronizes DB without migration files)
pnpm db:push

# Seed development stores, demo users, and test catalog data
pnpm db:seed

# Open interactive Drizzle Studio web GUI at https://local.drizzle.studio
pnpm db:studio
```

---

## Docker Containerization

The backend service includes a multi-stage Dockerfile leveraging Turborepo pruning (`turbo prune @bizx/api --docker`), isolating workspace dependencies for minimal image footprints and optimal layer caching.

### Run Full Platform with Docker Compose

```bash
# Build and run API, PostgreSQL, and Redis
docker compose up --build -d

# Inspect live logs
docker compose logs -f api

# Stop all containers
docker compose down
```

---

## CI/CD Pipeline

Continuous Integration is automated via GitHub Actions (`.github/workflows/ci.yml`) on every pull request and push to `main` and `dev`:

1. **Dependency Installation:** Deterministic lockfile validation with `pnpm install --frozen-lockfile`.
2. **Type Checking:** Strict workspace-wide typecheck (`pnpm check-types`).
3. **Linting:** Code quality enforcement via ESLint 9 (`pnpm lint`).
4. **Compilation:** Full monorepo build verification (`pnpm build`).

---

## Environment Variables

| Variable | Description | Default / Example |
|:---|:---|:---|
| `POSTGRES_USER` | PostgreSQL superuser username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password | `postgres` |
| `POSTGRES_DB` | Target database name | `bizx_db` |
| `DATABASE_URL` | Full connection URI for Drizzle ORM | `postgresql://postgres:postgres@localhost:5432/bizx_db` |
| `REDIS_URL` | Redis connection URI for cache and BullMQ queues | `redis://localhost:6379` |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare R2 Account Identifier | `your_account_id` |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key | `your_r2_access_key` |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Access Key | `your_r2_secret_key` |
| `CLOUDFLARE_R2_BUCKET_NAME` | Cloudflare R2 Bucket Name | `bizx-assets` |
| `CLOUDFLARE_R2_PUBLIC_DOMAIN` | Public CDN domain for uploaded media | `https://assets.bizx.io` |
| `PORT` | HTTP port for the NestJS API | `3101` |
| `NEXT_PUBLIC_API_URL` | API endpoint for Next.js Landing | `http://localhost:3101` |
| `VITE_API_URL` | API endpoint for Vite Admin SPAs | `http://localhost:3101` |
| `EXPO_PUBLIC_API_URL` | API endpoint for Expo Mobile client | `http://localhost:3101` |

---

## Documentation Archive

Supplementary internal engineering specifications and testing feedback are archived under the [`docs/`](./docs) directory:
- [Developer Guide (Ukrainian)](./docs/DEVELOPER_GUIDE_RU.md)
- [QA Audit & Feedback Plan #1](./docs/QA_FEEDBACK_1.md)

---

## License

This project is proprietary software developed by Viktor Lukianov. All rights reserved.
