import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    // shared/types.ts lives outside client/, so resolve its runtime Zod import
    // from this package's dependencies.
    alias: {
      zod: fileURLToPath(new URL('./node_modules/zod', import.meta.url)),
    },
  },
});
