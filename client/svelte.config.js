/**
 * client/svelte.config.js
 * ───────────────────────────────────────────────────────────
 * SvelteKit build configuration.
 *
 * Adapter: adapter-static
 *  - Outputs a static site (HTML/CSS/JS) that can be served by any
 *    static file server or embedded in the Express backend
 *  - No server-side rendering (SSR) needed; client is a pure SPA
 *  - Set fallback: 'index.html' for client-side routing to work
 *
 * Alternative adapters (if SSR is ever needed):
 *  - @sveltejs/adapter-node → Node.js server with SSR
 *  - @sveltejs/adapter-vercel → Deploy to Vercel
 */

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Svelte preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // Use static adapter for pure SPA output
    adapter: adapter({
      // Serve index.html for all unmatched routes (client-side routing)
      fallback: 'index.html',
      // Output to 'build' directory
      pages: 'build',
      assets: 'build',
    }),

    // Path aliases (also defined in tsconfig.json)
    // $lib → src/lib (SvelteKit handles this automatically)
    alias: {
      '@shared': '../shared',
    },
  },
};

export default config;
