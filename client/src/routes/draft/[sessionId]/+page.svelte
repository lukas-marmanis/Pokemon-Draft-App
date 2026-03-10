<!--
  client/src/routes/draft/[sessionId]/+page.svelte
  ──────────────────────────────────────────────────────────
  Main draft page. Route: /draft/[sessionId]

  This is the primary view coaches interact with during a draft.
  It manages the WebSocket connection lifecycle and composes
  all the child UI components.

  Layout (desktop):
  ┌─────────────────────────────────────────────────────────┐
  │  TurnIndicator  (whose turn + pick # + remaining budget) │
  ├──────────────────────────────┬──────────────────────────┤
  │                              │   CoachRoster             │
  │   DraftBoard                 │   (my team + budget)      │
  │   (Pokemon grid,             ├──────────────────────────┤
  │    filterable + searchable)  │   PickHistory             │
  │                              │   (all picks so far)      │
  └──────────────────────────────┴──────────────────────────┘

  State management:
  - draftStore: session state, coach list, pick history, current turn
  - pokemonStore: full Pokemon pool, search/filter state
  - socketClient: WebSocket connection, event emitters/listeners
  - Local: coachName input (pre-join), hasJoined flag

  Connection lifecycle:
  1. onMount: connect to server WebSocket
  2. Register event listeners (draft_state_sync, pick_made, etc.)
  3. If coachName in URL param, auto-join session
  4. onDestroy: disconnect and clean up listeners
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { socketClient } from '$lib/socket';
  import { draftState, currentCoachId, isMyTurn } from '$lib/stores/draftStore';
  import { allPokemon } from '$lib/stores/pokemonStore';
  import DraftBoard from '$lib/components/DraftBoard.svelte';
  import CoachRoster from '$lib/components/CoachRoster.svelte';
  import PickHistory from '$lib/components/PickHistory.svelte';
  import TurnIndicator from '$lib/components/TurnIndicator.svelte';

  // ── Route Params ────────────────────────────────────────
  // SvelteKit extracts [sessionId] from the URL automatically
  const sessionId = $page.params.sessionId;

  // ── Local State ─────────────────────────────────────────
  let coachName = '';
  let hasJoined = false;
  let isConnecting = false;
  let connectionError: string | null = null;

  // ── Lifecycle ───────────────────────────────────────────

  onMount(() => {
    /**
     * TODO: Implement full onMount logic:
     * 1. Determine server URL from environment variable (VITE_API_URL)
     *    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
     * 2. Connect to server WebSocket
     *    socketClient.connect(serverUrl);
     * 3. Register event listeners:
     *    - draft_state_sync: call draftState.set(data) and allPokemon.set(data.pokemon)
     *    - pick_made: update draftState incrementally (append pick, update nextCoach)
     *    - coach_connected: update coach.isConnected in store
     *    - coach_disconnected: update coach.isConnected in store
     *    - draft_completed: show completion modal
     *    - error: show toast notification with error message
     *    - connect: clear connectionError
     *    - disconnect: set connectionError message
     * 4. Check URL params for auto-join
     *    e.g. /draft/[id]?coach=Alice → auto-join with coachName='Alice'
     */

    // TODO: Remove placeholder and implement above
    console.log(`Draft page mounted for session: ${sessionId}`);
  });

  onDestroy(() => {
    /**
     * TODO: Implement cleanup:
     * 1. socketClient.disconnect()
     * 2. Remove all event listeners to prevent memory leaks
     *    (socket.io-client handles this on disconnect, but explicit cleanup is cleaner)
     */
    socketClient.disconnect();
  });

  // ── Event Handlers ──────────────────────────────────────

  /**
   * Handles the "Join Session" button click.
   * Emits 'join_session' event and sets hasJoined = true on success.
   *
   * TODO: Implement proper async join flow:
   * 1. Validate coachName is not empty
   * 2. Set isConnecting = true
   * 3. socketClient.joinSession(sessionId, coachName)
   * 4. Wait for draft_state_sync response (indicates successful join)
   *    - Set hasJoined = true
   *    - Extract and set currentCoachId from state
   * 5. Handle errors: set connectionError message
   * 6. Set isConnecting = false
   */
  function handleJoin(): void {
    if (!coachName.trim()) return;
    // TODO: Implement join logic
    socketClient.joinSession(sessionId, coachName.trim());
    hasJoined = true; // Optimistic; replace with confirmation from server
  }

  /**
   * Called when a Pokemon card is clicked in DraftBoard.
   * Delegates to socketClient if it's this coach's turn.
   *
   * TODO: Add confirmation dialog for expensive picks (>80 pts)
   */
  function handlePokemonPick(pokemonId: string): void {
    if (!$isMyTurn) return;
    const coachId = $currentCoachId;
    if (!coachId) return;
    // TODO: Optionally show a confirmation modal before submitting
    socketClient.submitPick(coachId, pokemonId);
  }
</script>

<svelte:head>
  <title>Draft Session - Pokemon Draft League</title>
</svelte:head>

<!-- ── Pre-Join Screen ──────────────────────────────────────── -->
{#if !hasJoined}
  <div class="container mx-auto max-w-md py-16 px-4">
    <div class="card p-8">
      <h1 class="h2 mb-6">Join Draft Session</h1>

      <!-- Connection error display -->
      {#if connectionError}
        <div class="alert variant-filled-error mb-4">
          <p>{connectionError}</p>
        </div>
      {/if}

      <p class="mb-4 text-surface-600-300-token text-sm">
        Session ID: <code class="text-xs">{sessionId}</code>
      </p>

      <label class="label mb-4">
        <span>Your Coach Name</span>
        <input
          type="text"
          class="input mt-1"
          placeholder="Enter your name"
          bind:value={coachName}
          on:keypress={(e) => e.key === 'Enter' && handleJoin()}
          maxlength="50"
          disabled={isConnecting}
        />
      </label>

      <button
        class="btn variant-filled-primary w-full"
        on:click={handleJoin}
        disabled={!coachName.trim() || isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Join Draft'}
      </button>

      <!-- TODO: Add "Watch as spectator" option (no pick permissions) -->
    </div>
  </div>

<!-- ── Main Draft UI ─────────────────────────────────────────── -->
{:else}
  <div class="h-full flex flex-col">
    <!-- Turn indicator spans full width at top -->
    <div class="p-4">
      <TurnIndicator />
    </div>

    <!-- Main content area: draft board left, sidebar right -->
    <div class="flex-1 flex gap-4 px-4 pb-4 overflow-hidden">

      <!-- Draft Board: Pokemon grid (takes 2/3 of width on desktop) -->
      <div class="flex-1 overflow-hidden">
        <DraftBoard onPokemonClick={handlePokemonPick} />
      </div>

      <!-- Sidebar: roster + pick history (takes 1/3 of width) -->
      <div class="w-80 flex flex-col gap-4 overflow-hidden">
        <CoachRoster />
        <div class="flex-1 overflow-hidden">
          <PickHistory />
        </div>
      </div>
    </div>

    <!-- TODO: Add draft completion overlay/modal when status === 'completed' -->
    <!-- TODO: Add "Export Roster" button visible after draft completes -->
  </div>
{/if}
