# syntax=docker/dockerfile:1

# =============================================================================
# IDP Portal - Multi-stage Production Dockerfile (Nginx-based)
# =============================================================================
# Build optimized for:
# - Static asset serving via Nginx
# - Minimal image size (~25MB)
# - Security hardening
# - Gzip compression
# - SPA routing support
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json turbo.json ./
COPY apps/portal/package.json ./apps/portal/
COPY packages/ ./packages/

RUN npm ci --prefer-offline && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

ARG NODE_ENV=production
ARG VERSION=unknown
ARG API_URL=https://api.idp.example.com

ENV NODE_ENV=${NODE_ENV} \
    VITE_API_URL=${API_URL} \
    VITE_VERSION=${VERSION}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY . .

# Build the portal application
RUN npx turbo build --filter=@idp/portal...

# Stage 3: Production (Nginx)
FROM nginx:1.25-alpine AS production

ARG VERSION=unknown

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Custom nginx configuration
COPY --from=builder /app/apps/portal/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/apps/portal/dist /usr/share/nginx/html

# Create nginx config for SPA routing and security headers
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.idp.example.com;" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 '{"status":"healthy","version":"VERSION_PLACEHOLDER"}';
        add_header Content-Type application/json;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Replace version placeholder
RUN sed -i "s/VERSION_PLACEHOLDER/${VERSION}/g" /etc/nginx/conf.d/default.conf

# Security: run as non-root
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
