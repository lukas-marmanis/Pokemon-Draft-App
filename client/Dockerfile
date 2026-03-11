# ── Build Stage ─────────────────────────────────────────────
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
# TODO: add bun.lockb once generated and use --frozen-lockfile for reproducible builds
COPY package.json ./
RUN bun install

# Copy Svelte config and source
COPY svelte.config.js tailwind.config.js postcss.config.js tsconfig.json ./
COPY src ./src

# Set the API URL at build time via build arg
# In production this should be the public ngrok/localtunnel URL
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

# Sync SvelteKit type definitions then build
RUN bunx svelte-kit sync && bun run build

# ── Production Stage ─────────────────────────────────────────
# Serve static files with a lightweight HTTP server
FROM node:20-alpine AS production

WORKDIR /app

# Install a minimal static file server
# 'serve' is a simple, zero-config static server by Vercel
RUN npm install -g serve

# Copy built static files from builder
COPY --from=builder /app/build ./build

EXPOSE 5173

# Serve the static SPA; '-s' flag enables SPA mode (redirect 404s to index.html)
CMD ["serve", "-s", "build", "-l", "5173"]
