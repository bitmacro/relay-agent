# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime — strfry base provides binary + libs (lmdb, zstd, ssl)
FROM dockurr/strfry:1.0.4

RUN apk add --no-cache nodejs

WORKDIR /app

# No node_modules here — everything the app imports at runtime must be bundled into dist/ (see tsup noExternal).
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY strfry.conf /app/strfry.conf

ENV NODE_ENV=production
ENV STRFRY_BIN=/app/strfry
ENV PORT=7800
EXPOSE 7800

# Override strfry base image healthcheck (localhost:7777) — Node listens on PORT
HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:7800/health > /dev/null || exit 1

ENTRYPOINT []
CMD ["node", "dist/bin/relay-agent.mjs"]
