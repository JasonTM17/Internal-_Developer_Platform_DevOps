# syntax=docker/dockerfile:1

# =============================================================================
# IDP API - Multi-stage Production Dockerfile
# =============================================================================
# Build optimized for:
# - Minimal image size (~150MB)
# - Non-root execution
# - Layer caching efficiency
# - Security hardening
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy workspace root package files
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install production dependencies only
RUN npm ci --prefer-offline --production=false && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

ARG NODE_ENV=production
ARG VERSION=unknown
ENV NODE_ENV=${NODE_ENV}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY . .

# Build the API and its dependencies
RUN npx turbo build --filter=@idp/api...

# Prune dev dependencies after build
RUN npm prune --production && \
    rm -rf .turbo apps/portal

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

ARG VERSION=unknown
ENV NODE_ENV=production \
    PORT=3000 \
    VERSION=${VERSION}

# Security: create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 idp-api

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl \
    tini && \
    rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder --chown=idp-api:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=idp-api:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=idp-api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=idp-api:nodejs /app/packages ./packages

# Copy database migrations
COPY --from=builder --chown=idp-api:nodejs /app/apps/api/src/db/migrations ./migrations

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Security hardening
RUN chmod -R 555 /app/dist && \
    chmod -R 555 /app/node_modules

# Switch to non-root user
USER idp-api

# Expose port
EXPOSE ${PORT}

# Use tini as init system for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "--enable-source-maps", "--max-old-space-size=512", "dist/index.js"]

# Labels
LABEL org.opencontainers.image.title="IDP API" \
      org.opencontainers.image.description="Internal Developer Platform API Service" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.vendor="Platform Engineering" \
      org.opencontainers.image.source="https://github.com/org/idp-platform"
