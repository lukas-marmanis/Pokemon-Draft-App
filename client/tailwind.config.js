/**
 * client/tailwind.config.js
 * ───────────────────────────────────────────────────────────
 * Tailwind CSS configuration with Skeleton UI plugin.
 *
 * Skeleton UI integration:
 *  - skeleton() plugin adds Skeleton's design system tokens
 *  - themes: [] selects which pre-built themes to include
 *    (or pass 'all' to include all themes for development)
 *  - Custom theme can be defined in theme: {} for brand colors
 *
 * Content paths:
 *  Must include Skeleton UI's own components so Tailwind
 *  doesn't purge classes used only in Skeleton's source.
 */

import { skeleton } from '@skeletonlabs/tw-plugin';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  // Enable dark mode via class strategy (Skeleton uses this)
  darkMode: 'class',

  content: [
    // Scan all Svelte, TS, and HTML files in src/
    './src/**/*.{html,js,svelte,ts}',
    // IMPORTANT: Also scan Skeleton UI's component source for class names
    join(__dirname, 'node_modules/@skeletonlabs/skeleton/**/*.{html,js,svelte,ts}'),
  ],

  theme: {
    extend: {
      // TODO: Add custom theme extensions here if needed
      // Example custom Pokemon-type colors:
      // colors: {
      //   fire: '#F08030',
      //   water: '#6890F0',
      //   grass: '#78C850',
      // }
    },
  },

  plugins: [
    // Skeleton UI plugin - provides component styles and themes
    skeleton({
      themes: {
        // Start with a preset theme, switch to custom later
        // Available presets: skeleton, wintry, modern, rocket, seafoam, vintage, sahara, hamlindigo, gold-nouveau, crimson
        preset: ['skeleton'],
      },
    }),
  ],
};
