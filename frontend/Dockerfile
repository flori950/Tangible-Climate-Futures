# Build context: the repository root (the frontend imports ../common/types).
#   docker build -f frontend/Dockerfile .

# --- Build stage -------------------------------------------------------------
# Node.js 24 is the active LTS line supported by Angular 22.
FROM node:24-alpine AS builder

WORKDIR /usr/src/frontend

# Install dependencies first to benefit from layer caching
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ .
COPY common/types/ ../common/types

RUN npm run build

# --- Runtime stage -----------------------------------------------------------
# nginx as lightweight, non-root production image
FROM nginxinc/nginx-unprivileged:alpine

ENV NODE_ENV=production
ENV PORT=8080

# The Angular application builder writes the static files to dist/<project>/browser
COPY --from=builder /usr/src/frontend/dist/frontend/browser /usr/share/nginx/html/
# SPA fallback to index.html for deep links
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

USER nginx

CMD ["nginx", "-g", "daemon off;"]
