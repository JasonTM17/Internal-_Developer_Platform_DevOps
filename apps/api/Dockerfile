# syntax=docker/dockerfile:1

# =============================================================================
# IDP API - Multi-stage Production Dockerfile (pnpm)
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

ARG NODE_ENV=production
ARG VERSION=unknown
ENV NODE_ENV=${NODE_ENV}

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Build the API with TypeScript compiler
RUN pnpm --filter @idp/api run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

ARG VERSION=unknown
ENV NODE_ENV=production \
    PORT=3000 \
    VERSION=${VERSION}

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 idp-api

RUN apk add --no-cache dumb-init curl tini && \
    rm -rf /var/cache/apk/*

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=builder --chown=idp-api:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=idp-api:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=idp-api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=idp-api:nodejs /app/packages ./packages

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

USER idp-api

EXPOSE ${PORT}

ENTRYPOINT ["tini", "--"]
CMD ["node", "--enable-source-maps", "--max-old-space-size=512", "dist/index.js"]

LABEL org.opencontainers.image.title="IDP API" \
      org.opencontainers.image.description="Internal Developer Platform API Service" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.vendor="Platform Engineering"
