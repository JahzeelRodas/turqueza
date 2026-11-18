# ── Dependencias ───────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --filter web --no-frozen-lockfile

# ── Build ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app ./
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_STORE_THEME=joyeria
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STORE_THEME=$NEXT_PUBLIC_STORE_THEME
RUN pnpm --filter web build

# ── Runtime ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
