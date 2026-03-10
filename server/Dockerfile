# ── Build Stage ─────────────────────────────────────────────
# Use Node 20 Alpine for a small image footprint
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy Prisma schema so we can generate the client
COPY prisma ./prisma
RUN npx prisma generate

# Copy TypeScript source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production Stage ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create directory for SQLite database (mounted as Docker volume)
RUN mkdir -p /data

EXPOSE 3000

# TODO: Before starting, run database migrations if needed
# CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
CMD ["node", "dist/index.js"]
