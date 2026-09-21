# ── Build Stage ─────────────────────────────────────────────
# Use Node 20 Alpine for a small image footprint
FROM node:20-alpine AS builder

WORKDIR /app/server

# Prisma's CLI and generated client load native engines that require OpenSSL.
RUN apk add --no-cache openssl

# Copy dependency manifests first for better Docker layer caching
COPY server/package*.json ./
RUN npm ci

# Copy Prisma schema so we can generate the client
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy TypeScript source and compile
COPY server/tsconfig.json ./
COPY server/src ./src
COPY shared /app/shared
RUN npm run build

# ── Production Stage ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/server

# The runtime CLI (`prisma db push`) and generated client need OpenSSL too.
RUN apk add --no-cache openssl

# Install only production dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY server/prisma ./prisma

# Copy compiled output from builder
COPY --from=builder /app/server/dist ./dist

# Create directory for SQLite database (mounted as Docker volume)
RUN mkdir -p /data

EXPOSE 3000

# Initialize the mounted SQLite database before serving requests.
CMD ["sh", "-c", "npx prisma db push && node dist/server/src/index.js"]
