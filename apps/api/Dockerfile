# ==========================================
# Stage 1: Pruner (извлечение изолированного среза монорепозитория для @bizx/api)
# ==========================================
FROM node:22-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @bizx/api --docker

# ==========================================
# Stage 2: Builder (установка зависимостей и компиляция через tsup)
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@12.10.1

# Сначала копируем только lockfile и package.json для кэширования слоёв Docker
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Копируем исходный код и собираем @bizx/api
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @bizx/api build

# ==========================================
# Stage 3: Runner (минимальный production контейнер)
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@12.10.1

# Создаем непривилегированного пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=pruner /app/out/json/ .
RUN pnpm install --prod --frozen-lockfile

# Копируем собранный бандл из builder
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist

USER nestjs
EXPOSE 3101
ENV PORT=3101

CMD ["node", "apps/api/dist/main.js"]
