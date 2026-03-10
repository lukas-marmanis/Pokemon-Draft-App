<!--
  client/src/lib/components/PickHistory.svelte
  ──────────────────────────────────────────────────────────
  Scrollable list of all picks made in the current session.

  Responsibilities:
  - Display all picks in chronological order (pick #1 first or last)
  - Show: pick number, coach name, Pokemon name, points spent
  - Auto-scroll to the latest pick when a new pick is made
  - Optionally highlight the current user's picks

  Data source:
  - pickHistory store: all picks ordered by pickNumber
  - currentCoachId store: to highlight own picks

  Visual design:
  ┌──────────────────────────────┐
  │ Pick History              ▲  │
  │ ─────────────────────────    │
  │ #1  Alice    Landorus  100pt │
  │ #2  Bob      Flutter   100pt │
  │ #3  Charlie  Garchomp   80pt │
  │  (NEW) #4  Alice  Urshifu    │  ← highlighted, auto-scrolled to
  └──────────────────────────────┘

  TODO: Implement the component
-->

<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { pickHistory, currentCoachId } from '$lib/stores/draftStore';

  // ── Refs ──────────────────────────────────────────────────
  /** Reference to the scroll container for auto-scrolling */
  let scrollContainer: HTMLElement;

  // ── Auto-scroll ───────────────────────────────────────────
  /**
   * After each update (new pick added), scroll to the bottom
   * of the list to show the latest pick.
   *
   * TODO: Implement auto-scroll
   */
  afterUpdate(() => {
    // TODO: scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
  });

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Returns true if this pick belongs to the current coach.
   * Used to visually distinguish own picks.
   *
   * TODO: Implement
   */
  function isMyPick(coachId: string): boolean {
    // TODO: return coachId === $currentCoachId;
    return false;
  }

  /**
   * Formats a timestamp for display.
   * E.g. "14:35" (local time) for compact display.
   *
   * TODO: Implement
   */
  function formatTimestamp(isoString: string): string {
    // TODO: new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return '';
  }
</script>

<div class="card flex flex-col h-full">
  <!-- Header -->
  <header class="card-header p-4 border-b border-surface-300-600-token flex justify-between items-center">
    <h3 class="h5 font-semibold">Pick History</h3>
    <span class="badge variant-soft text-xs">
      {$pickHistory.length} picks
    </span>
  </header>

  <!-- Scrollable pick list -->
  <section
    class="flex-1 overflow-y-auto p-3"
    bind:this={scrollContainer}
  >
    {#if $pickHistory.length === 0}
      <p class="text-surface-500 text-sm text-center py-8">
        No picks yet. The draft will begin soon.
      </p>
    {:else}
      <div class="space-y-1">
        {#each $pickHistory as pick (pick.pickNumber)}
          <div
            class="flex items-center gap-2 p-2 rounded text-sm"
            class:bg-primary-500={isMyPick(pick.coachId)}
            class:bg-opacity-10={isMyPick(pick.coachId)}
            class:bg-surface-100-800-token={!isMyPick(pick.coachId)}
          >
            <!-- Pick number -->
            <span class="text-xs font-mono text-surface-500 w-6 flex-shrink-0 text-right">
              #{pick.pickNumber}
            </span>

            <!-- Coach name -->
            <span
              class="font-medium w-20 flex-shrink-0 truncate"
              class:text-primary-500={isMyPick(pick.coachId)}
            >
              {pick.coachName}
            </span>

            <!-- Pokemon name -->
            <span class="flex-1 truncate">{pick.pokemonName}</span>

            <!-- Points -->
            <span class="text-xs font-mono text-surface-500 flex-shrink-0">
              {pick.pointsSpent}pt
            </span>

            <!-- Timestamp (optional, compact) -->
            <!-- TODO: Uncomment once formatTimestamp is implemented -->
            <!-- <span class="text-xs text-surface-400 flex-shrink-0">
              {formatTimestamp(pick.timestamp)}
            </span> -->
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
