<!--
  client/src/routes/+page.svelte
  ──────────────────────────────────────────────────────────
  Home / landing page (route: /).

  Purpose:
  - Entry point for commissioners and coaches
  - Provides a way to navigate to a draft session
  - Shows recent sessions or allows entering a session ID

  For coaches:
    They receive a URL like /draft/[sessionId]?coach=Alice
    and navigate directly to the draft page.
    This home page is mainly for commissioners.

  For commissioners:
    They see a form to create a new session (future)
    or enter an existing session ID to manage it.

  TODO: Implement the home page UI
-->

<script lang="ts">
  import { goto } from '$app/navigation';

  // Session ID input for direct navigation
  let sessionIdInput = '';

  /**
   * Navigate to a draft session page.
   * TODO: Add validation that sessionId looks like a UUID before navigating.
   */
  function joinSession(): void {
    if (!sessionIdInput.trim()) return;
    // TODO: Validate UUID format before navigating
    goto(`/draft/${sessionIdInput.trim()}`);
  }

  /**
   * TODO: Implement createSession()
   * Should call a future REST endpoint: POST /api/sessions
   * Then navigate to the new session's admin page.
   */
  async function createSession(): Promise<void> {
    // TODO: POST /api/sessions with session config
    // const response = await fetch('/api/sessions', { method: 'POST', ... });
    // const session = await response.json();
    // goto(`/draft/${session.id}`);
    alert('Session creation not yet implemented');
  }
</script>

<svelte:head>
  <title>Pokemon Draft League</title>
</svelte:head>

<div class="container mx-auto max-w-2xl py-16 px-4">
  <div class="text-center mb-12">
    <h1 class="text-5xl font-bold mb-4">Pokemon Draft League</h1>
    <p class="text-xl text-surface-600-300-token">
      Real-time snake draft for competitive VGC leagues
    </p>
  </div>

  <!-- Join existing session -->
  <div class="card p-8 mb-6">
    <h2 class="h3 mb-4">Join a Draft Session</h2>
    <p class="mb-4 text-surface-600-300-token">
      Enter the session ID provided by your commissioner.
    </p>

    <!-- TODO: Add proper form validation feedback -->
    <div class="flex gap-4">
      <input
        type="text"
        class="input flex-1"
        placeholder="Session ID (e.g. abc123-...)"
        bind:value={sessionIdInput}
        on:keypress={(e) => e.key === 'Enter' && joinSession()}
      />
      <button
        class="btn variant-filled-primary"
        on:click={joinSession}
        disabled={!sessionIdInput.trim()}
      >
        Join
      </button>
    </div>
  </div>

  <!-- Create new session (commissioner only) -->
  <div class="card p-8">
    <h2 class="h3 mb-4">Create a New Draft</h2>
    <p class="mb-4 text-surface-600-300-token">
      Commissioners: set up a new draft session for your league.
    </p>

    <!-- TODO: Implement full session creation form with:
      - Session name input
      - Number of coaches (8-24)
      - Point budget (default 400)
      - Pokemon per coach (default 10)
      - Pokemon tier list upload (CSV/JSON)
    -->
    <button class="btn variant-filled-secondary w-full" on:click={createSession}>
      Create Draft Session
    </button>
  </div>
</div>
