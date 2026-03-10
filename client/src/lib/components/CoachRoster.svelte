<!--
  client/src/lib/components/CoachRoster.svelte
  ──────────────────────────────────────────────────────────
  Displays the current coach's drafted team and remaining budget.

  Responsibilities:
  - Show coach name and point budget (remaining / total)
  - List drafted Pokemon in pick order
  - Show a progress bar for points used
  - Optionally show an export button (post-draft)

  Data sources:
  - currentCoach store: name, pointsRemaining
  - myPicks store: list of picks for this coach
  - draftState store: session.pointBudget (for total budget display)
  - isDraftComplete store: to show export button

  Visual design:
  ┌─────────────────────────┐
  │ Alice's Team            │
  │ 280/400 pts ████░░ 70% │
  ├─────────────────────────┤
  │ 1. Landorus-Therian     │
  │    [Ground] [Flying]    │
  │    100 pts              │
  │ 2. Flutter Mane         │
  │    [Ghost] [Fairy]      │
  │    100 pts              │
  │ ...                     │
  ├─────────────────────────┤
  │ [Export Roster]  ←future│
  └─────────────────────────┘

  TODO: Implement the component
-->

<script lang="ts">
  import { currentCoach, myPicks, isDraftComplete, draftState } from '$lib/stores/draftStore';

  // ── Computed ──────────────────────────────────────────────

  /**
   * Total budget for the session (from session config).
   * TODO: Read from $draftState?.session.pointBudget
   */
  $: totalBudget = $draftState?.session.pointBudget ?? 400;

  /**
   * Points used so far (totalBudget - pointsRemaining).
   * TODO: Calculate from currentCoach
   */
  $: pointsUsed = totalBudget - ($currentCoach?.pointsRemaining ?? totalBudget);

  /**
   * Progress percentage for the budget bar.
   * TODO: Calculate pointsUsed / totalBudget * 100
   */
  $: budgetPercent = totalBudget > 0 ? (pointsUsed / totalBudget) * 100 : 0;

  /**
   * Triggers the export flow for this coach's roster.
   * TODO: Implement export - call server export endpoint or generate client-side
   */
  function handleExport(): void {
    // TODO: POST to /api/sessions/:id/export?coachId=:id
    // Or generate Showdown format client-side from $myPicks data
    alert('Export not yet implemented');
  }
</script>

<div class="card h-full flex flex-col">
  <!-- Header: Coach name + budget -->
  <header class="card-header p-4 border-b border-surface-300-600-token">
    <h2 class="h4 font-bold">
      {$currentCoach?.name ?? 'My Team'}
    </h2>

    <!-- Points budget display -->
    <div class="mt-2">
      <div class="flex justify-between text-sm mb-1">
        <span>{pointsUsed} pts used</span>
        <span class="font-mono">{$currentCoach?.pointsRemaining ?? totalBudget} remaining</span>
      </div>

      <!-- Budget progress bar -->
      <!-- TODO: Change color based on budget status (green → yellow → red) -->
      <div class="w-full bg-surface-300-600-token rounded-full h-2">
        <div
          class="bg-primary-500 h-2 rounded-full transition-all duration-300"
          style="width: {Math.min(budgetPercent, 100)}%"
        ></div>
      </div>

      <!-- TODO: Add low-budget warning when < 50 pts remaining -->
    </div>
  </header>

  <!-- Pick list -->
  <section class="p-4 flex-1 overflow-y-auto">
    {#if $myPicks.length === 0}
      <p class="text-surface-500 text-sm text-center py-4">
        No picks yet.<br />
        {#if $draftState?.session.status === 'setup'}
          Waiting for draft to start.
        {:else}
          Make your selection when it's your turn.
        {/if}
      </p>
    {:else}
      <ol class="space-y-2">
        {#each $myPicks as pick, index (pick.pickNumber)}
          <li class="flex items-center gap-3 p-2 rounded-lg bg-surface-100-800-token">
            <!-- Pick number badge -->
            <span class="badge variant-filled-primary text-xs w-6 h-6 flex items-center justify-center flex-shrink-0">
              {index + 1}
            </span>

            <!-- Pokemon info -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{pick.pokemonName}</p>
              <!-- TODO: Add type badges from pokemon data -->
              <!-- The pick history only stores pokemonName, not types -->
              <!-- Option A: look up from $allPokemon store by pokemonId -->
              <!-- Option B: store types in the pick history server-side -->
            </div>

            <!-- Points spent -->
            <span class="text-xs font-mono text-surface-500 flex-shrink-0">
              {pick.pointsSpent}pt
            </span>
          </li>
        {/each}
      </ol>

      <!-- Pick count + slots remaining -->
      <p class="text-xs text-surface-500 mt-3 text-center">
        {$myPicks.length} / {$draftState?.session.pokemonPerCoach ?? 10} Pokemon drafted
      </p>
    {/if}
  </section>

  <!-- Footer: Export button (shown after draft completes) -->
  {#if $isDraftComplete}
    <footer class="card-footer p-4 border-t border-surface-300-600-token">
      <button class="btn variant-filled-success w-full" on:click={handleExport}>
        Export Showdown Roster
      </button>
    </footer>
  {/if}
</div>
