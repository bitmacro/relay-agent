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

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY strfry.conf /app/strfry.conf

ENV NODE_ENV=production
ENV STRFRY_BIN=/app/strfry
ENV PORT=7800
EXPOSE 7800

ENTRYPOINT []
CMD ["node", "dist/bin/relay-agent.mjs"]
