# ── Build Stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/client

# Copy dependency manifests first for layer caching
COPY client/package*.json ./
RUN npm ci

# Copy Svelte config and source
COPY client/svelte.config.js client/tailwind.config.js client/postcss.config.js client/tsconfig.json client/vite.config.ts ./
COPY client/src ./src
COPY shared /app/shared

# TODO: Set the API URL at build time via build arg
# In production this should be the public ngrok/localtunnel URL
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

# Sync SvelteKit type definitions then build
RUN npx svelte-kit sync && npm run build

# ── Production Stage ─────────────────────────────────────────
# Serve static files with a lightweight HTTP server
FROM node:20-alpine AS production

WORKDIR /app/client

# Install a minimal static file server
# 'serve' is a simple, zero-config static server by Vercel
RUN npm install -g serve

# Copy built static files from builder
COPY --from=builder /app/client/build ./build

EXPOSE 5173

# Serve the static SPA; '-s' flag enables SPA mode (redirect 404s to index.html)
CMD ["serve", "-s", "build", "-l", "5173"]
