# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 7800

# Expect RELAY_AGENT_TOKEN and optionally STRFRY_BIN via env at runtime
# Mount strfry binary and/or data volume as needed
CMD ["sh", "-c", "node dist/bin/relay-agent.mjs --port 7800 --token $RELAY_AGENT_TOKEN"]
