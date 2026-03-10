<!--
  client/src/routes/+layout.svelte
  ──────────────────────────────────────────────────────────
  Root layout component. Wraps every page in the app.

  Responsibilities:
  - Import global CSS (app.css with Tailwind + Skeleton)
  - Render the navigation header (AppBar)
  - Provide a consistent page shell (header + main content)
  - Mount any app-wide notification systems (toasts, alerts)

  SvelteKit note:
  - <slot /> renders the current page's content
  - This layout applies to all routes unless overridden with
    a nested +layout.svelte
-->

<script lang="ts">
  import '../app.css';

  // TODO: Import Skeleton UI components when implemented
  // import { AppBar, Toast } from '@skeletonlabs/skeleton';
  // import { initializeStores } from '@skeletonlabs/skeleton';

  // TODO: Initialize Skeleton UI stores (required for toast/modal/etc)
  // Must be called in the root layout
  // initializeStores();
</script>

<!-- TODO: Implement full layout shell
  Suggested structure:
  <div class="h-screen flex flex-col">
    <AppBar>
      <svelte:fragment slot="lead">
        <strong class="text-xl">Pokemon Draft League</strong>
      </svelte:fragment>
      <svelte:fragment slot="trail">
        // Session info, connection status badge
      </svelte:fragment>
    </AppBar>

    <main class="flex-1 overflow-hidden">
      <slot />
    </main>

    // Toast notifications for pick confirmations, errors, etc.
    <Toast />
  </div>
-->

<!-- Minimal layout until fully implemented -->
<div class="min-h-screen bg-surface-50-900-token">
  <header class="bg-primary-500 p-4 text-white">
    <h1 class="text-2xl font-bold">Pokemon Draft League</h1>
    <!-- TODO: Add navigation, session info, connection status -->
  </header>

  <main class="container mx-auto p-4">
    <!-- Page content renders here -->
    <slot />
  </main>
</div>
