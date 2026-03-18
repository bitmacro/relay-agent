# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime (includes strfry binary for Docker-sidecar mode)
FROM node:20-alpine

WORKDIR /app

# Copy strfry binary from official image (for spawn inside container)
COPY --from=dockurr/strfry:latest /app/strfry /app/strfry

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY strfry.conf /app/strfry.conf

ENV NODE_ENV=production
ENV STRFRY_BIN=/app/strfry
EXPOSE 7800

CMD ["sh", "-c", "node dist/bin/relay-agent.mjs --port ${PORT:-7800} --token $RELAY_AGENT_TOKEN"]
