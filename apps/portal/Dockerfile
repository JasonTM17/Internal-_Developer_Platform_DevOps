# syntax=docker/dockerfile:1

# =============================================================================
# IDP Portal - Multi-stage Production Dockerfile (pnpm + Nginx)
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/portal/package.json ./apps/portal/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

ARG NODE_ENV=production
ARG VERSION=unknown
ARG API_URL=https://api.idp.example.com

ENV NODE_ENV=${NODE_ENV} \
    VITE_API_URL=${API_URL} \
    VITE_VERSION=${VERSION}

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/portal/node_modules ./apps/portal/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

RUN pnpm --filter @idp/portal run build

# Stage 3: Production (Nginx)
FROM nginx:1.25-alpine AS production

ARG VERSION=unknown

RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

COPY --from=builder /app/apps/portal/dist /usr/share/nginx/html

RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /health {
        access_log off;
        return 200 '{"status":"healthy","version":"VERSION_PLACEHOLDER"}';
        add_header Content-Type application/json;
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

RUN sed -i "s/VERSION_PLACEHOLDER/${VERSION}/g" /etc/nginx/conf.d/default.conf

RUN addgroup -g 1001 -S portal && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G portal portal && \
    chown -R portal:portal /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    chmod -R 755 /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown portal:portal /var/run/nginx.pid

USER portal

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

LABEL org.opencontainers.image.title="IDP Portal" \
      org.opencontainers.image.description="Internal Developer Platform Web Portal" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.vendor="Platform Engineering"
