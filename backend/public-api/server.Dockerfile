# Express public API (build context: repository root, see docker-compose.yml)
#
#   docker build -f backend/public-api/server.Dockerfile -t tcf-public-api .
#
# Node 24 is the current Active LTS. Do not move to Node >= 25 before
# firebase-admin's transitive dependency buffer-equal-constant-time is fixed
# (it uses the removed SlowBuffer API, see backend/public-api/README.md).

# ---- Build stage: compile TypeScript and generate the tsoa routes/spec ----
FROM node:24-slim AS builder

# Keep the repository layout: the API imports ../../common/types
WORKDIR /usr/src/backend/public-api

COPY backend/public-api/package*.json ./
RUN npm ci

COPY common/types/ /usr/src/common/types/
COPY backend/public-api/tsoa.json backend/public-api/tsconfig.json ./
COPY backend/public-api/src ./src

RUN npm run build

# ---- Runtime stage: production dependencies + compiled output only ----
FROM node:24-slim

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

COPY backend/public-api/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /usr/src/backend/public-api/dist ./dist

# Run as the unprivileged user shipped with the node image
USER node

EXPOSE 8080
CMD ["node", "--max-old-space-size=4096", "dist/backend/public-api/src/index.js"]
