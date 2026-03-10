<!--
  client/src/lib/components/TurnIndicator.svelte
  ──────────────────────────────────────────────────────────
  Prominent header strip showing whose turn it is.

  Responsibilities:
  - Show current pick number and total picks
  - Highlight when it's the current user's turn (pulsing animation)
  - Show the name of the coach who should pick next
  - Show session status changes (setup, active, completed)
  - Optionally show a countdown timer (future feature)

  Visual states:
  1. Draft not started (status = 'setup'):
     "Waiting for draft to start..."

  2. My turn (isMyTurn = true):
     ⚡ "Your Turn!" | Pick #5 | 395 pts remaining | [pulse badge]

  3. Another coach's turn:
     "Bob's Turn" | Pick #6 | Waiting...

  4. Draft complete (status = 'completed'):
     ✓ "Draft Complete! All rosters finalized."

  Data sources:
  - draftState store: session status, pick number
  - isMyTurn store: whether it's this coach's turn
  - currentTurnCoach store: who picks next
  - currentCoach store: budget display
  - picksRemaining store: for "X picks left" display

  TODO: Implement the component
-->

<script lang="ts">
  import {
    draftState,
    isMyTurn,
    currentTurnCoach,
    currentCoach,
    picksRemaining,
    isDraftComplete,
    isDraftActive,
  } from '$lib/stores/draftStore';

  // ── Computed ──────────────────────────────────────────────

  /**
   * The message shown in the main header area.
   * Changes based on draft status and whose turn it is.
   *
   * TODO: Implement this reactive declaration
   */
  $: turnMessage = (() => {
    // TODO: Build status message based on draft state:
    // if ($draftState?.session.status === 'setup') return 'Waiting for draft to start...';
    // if ($isDraftComplete) return 'Draft Complete!';
    // if ($isMyTurn) return 'Your Turn! Make a pick.';
    // return `${$currentTurnCoach?.coachName ?? '...'}'s Turn`;
    return 'Loading...';
  })();

  /**
   * Progress as a percentage: picksCompleted / totalPicks.
   * Shown in a progress bar for visual context.
   *
   * TODO: Implement
   */
  $: progressPercent = (() => {
    const session = $draftState?.session;
    if (!session) return 0;
    const total = session.totalCoaches * session.pokemonPerCoach;
    if (total === 0) return 0;
    return (session.currentPickNumber / total) * 100;
  })();
</script>

<!--
  TurnIndicator card - spans full width above the draft board.
  Background changes: surface (default), primary (my turn), success (complete)
-->
<div
  class="card p-4 transition-all duration-300"
  class:variant-filled-primary={$isMyTurn}
  class:variant-filled-success={$isDraftComplete}
>
  <div class="flex items-center justify-between gap-4 flex-wrap">

    <!-- Left: Status message -->
    <div class="flex items-center gap-3">
      <!-- Status icon -->
      {#if $isDraftComplete}
        <span class="text-2xl">✓</span>
      {:else if $isMyTurn}
        <!-- Pulsing indicator for "your turn" -->
        <span class="w-4 h-4 rounded-full bg-warning-400 animate-ping"></span>
      {:else if $isDraftActive}
        <span class="w-4 h-4 rounded-full bg-surface-400"></span>
      {:else}
        <span class="text-2xl">⏳</span>
      {/if}

      <!-- Main message -->
      <div>
        <h2 class="text-lg font-bold">
          {turnMessage}
        </h2>

        <!-- Subtitle: pick number + coach info -->
        {#if $isDraftActive && $currentTurnCoach}
          <p class="text-sm opacity-75">
            Pick #{$currentTurnCoach.pickNumber}
            &middot;
            {$picksRemaining} picks remaining
          </p>
        {/if}
      </div>
    </div>

    <!-- Center: Draft progress bar -->
    {#if $isDraftActive}
      <div class="flex-1 max-w-xs hidden sm:block">
        <div class="flex justify-between text-xs mb-1 opacity-75">
          <span>Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div class="w-full bg-surface-300-600-token rounded-full h-1.5">
          <div
            class="bg-warning-400 h-1.5 rounded-full transition-all duration-500"
            style="width: {progressPercent}%"
          ></div>
        </div>
      </div>
    {/if}

    <!-- Right: Current coach's budget -->
    {#if $currentCoach && $isDraftActive}
      <div class="text-right">
        <p class="text-sm opacity-75">Your budget</p>
        <p class="text-xl font-mono font-bold">
          {$currentCoach.pointsRemaining}
          <span class="text-sm font-normal opacity-75">pts</span>
        </p>
      </div>
    {/if}
  </div>

  <!-- TODO: Add pick timer countdown here (future feature)
    A countdown bar that ticks down from 60s.
    On timeout, server auto-skips the coach's turn.
    <PickTimer durationSeconds={60} />
  -->
</div>
