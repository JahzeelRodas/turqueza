# ── Dependencias (con Prisma: el CLI es necesario en runtime para migrar) ──
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --filter api --no-frozen-lockfile

# ── Build ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app
COPY --from=deps /app ./
COPY apps/api ./apps/api
# Genera el cliente tipado y compila la app
RUN pnpm --filter api build

# ── Runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
