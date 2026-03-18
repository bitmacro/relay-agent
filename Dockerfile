# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime — use strfry image as base so strfry binary has its .so deps (lmdb, ssl, etc.)
FROM dockurr/strfry:latest

RUN apk add --no-cache nodejs

WORKDIR /app

# strfry binary + libs already at /app from base image
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY strfry.conf /app/strfry.conf

ENV NODE_ENV=production
ENV STRFRY_BIN=/app/strfry
EXPOSE 7800

CMD ["sh", "-c", "node dist/bin/relay-agent.mjs --port ${PORT:-7800} --token $RELAY_AGENT_TOKEN"]
