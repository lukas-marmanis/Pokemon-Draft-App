# ── Build Stage ─────────────────────────────────────────────
# oven/bun is Debian-based, which Prisma's library engine requires (glibc + OpenSSL 3.0)
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching
# TODO: add bun.lockb once generated and use --frozen-lockfile for reproducible builds
COPY package.json ./
RUN bun install

# Copy Prisma schema so we can generate the client
COPY prisma ./prisma
RUN bunx prisma generate

# Copy TypeScript source (no compilation needed - Bun runs TS directly)
COPY tsconfig.json ./
COPY src ./src

# ── Production Stage ─────────────────────────────────────────
FROM oven/bun:1 AS production

WORKDIR /app

# Install only production dependencies
# TODO: add bun.lockb once generated and use --frozen-lockfile for reproducible builds
COPY package.json ./
RUN bun install --production

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Copy TypeScript source (Bun executes it directly in production)
COPY tsconfig.json ./
COPY src ./src

# Create directory for SQLite database (mounted as Docker volume)
RUN mkdir -p /data

EXPOSE 3000

# TODO: Before starting, run database migrations if needed
# CMD ["sh", "-c", "bunx prisma db push && bun src/index.ts"]
CMD ["bun", "src/index.ts"]
