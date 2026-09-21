# ── Build Stage ─────────────────────────────────────────────
# The pinned Bun image includes the glibc and OpenSSL 3 libraries Prisma needs.
FROM oven/bun:1.4.2 AS builder

WORKDIR /app/server

# Copy dependency manifests first for better Docker layer caching
COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile

# Copy Prisma schema so we can generate the client
COPY server/prisma ./prisma
RUN bunx prisma generate

# Copy TypeScript source (no compilation needed - Bun runs TS directly)
COPY server/tsconfig.json ./
COPY server/src ./src
COPY shared /app/shared

# ── Production Stage ─────────────────────────────────────────
FROM oven/bun:1.4.2 AS production

WORKDIR /app/server

# Install only production dependencies
COPY server/package.json server/bun.lock ./
RUN bun install --production --frozen-lockfile

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY server/prisma ./prisma

# Copy TypeScript source (Bun executes it directly in production)
COPY server/tsconfig.json ./
COPY server/src ./src
COPY shared /app/shared

# Create directory for SQLite database (mounted as Docker volume)
RUN mkdir -p /data

EXPOSE 3000

# Initialize the mounted SQLite database before serving requests.
CMD ["sh", "-c", "bunx prisma db push && bun src/index.ts"]
