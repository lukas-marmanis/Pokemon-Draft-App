/**
 * client/postcss.config.js
 * ───────────────────────────────────────────────────────────
 * PostCSS configuration for processing Tailwind CSS.
 * Required by Vite to transform @tailwind directives in CSS files.
 */

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
