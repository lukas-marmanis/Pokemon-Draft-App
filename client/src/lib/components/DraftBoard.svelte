<!--
  client/src/lib/components/DraftBoard.svelte
  ──────────────────────────────────────────────────────────
  Pokemon selection grid. The primary interaction surface.

  Responsibilities:
  - Render all Pokemon in the pool as clickable cards
  - Show draft status: available (normal), drafted (dimmed/disabled)
  - Highlight pokemon the current coach can afford (within budget)
  - Render search and filter controls (name, tier, type, show-drafted toggle)
  - Fire onPokemonClick event when an available Pokemon is clicked

  Props:
  - onPokemonClick: (pokemonId: string) => void
    Callback fired when a Pokemon card is selected.
    Parent page handles the submit_pick emit.

  Layout:
  ┌─────────────────────────────────────────┐
  │  🔍 Search  │ Tier ▼ │ Type ▼ │ ☑ Show  │
  ├─────────────────────────────────────────┤
  │  [Poke] [Poke] [Poke] [Poke] [Poke]    │
  │  [Poke] [Poke] [Poke] [Poke] [Poke]    │
  │  ... (scrollable)                       │
  └─────────────────────────────────────────┘

  Pokemon card anatomy:
  ┌──────────────┐
  │  [sprite]    │  ← spriteUrl image or pokemon name initial
  │  Charizard   │  ← name
  │  Tier S      │  ← tier badge
  │  100 pts     │  ← cost
  │  🔥 Flying   │  ← type badges
  └──────────────┘
  Drafted pokemon have 'opacity-50 cursor-not-allowed' applied.
  If it's not your turn, all cards are disabled.

  TODO: Implement the component logic and template
-->

<script lang="ts">
  import { filteredPokemon, searchFilter, tierFilter, typeFilter, showDraftedPokemon, sortOrder } from '$lib/stores/pokemonStore';
  import { isMyTurn, currentCoach } from '$lib/stores/draftStore';
  import { VALID_TIERS, VALID_TYPES } from '@shared/types';

  // ── Props ─────────────────────────────────────────────────
  /** Called when user clicks an available Pokemon card */
  export let onPokemonClick: (pokemonId: string) => void = () => {};

  // ── Local State ───────────────────────────────────────────
  /** Currently hovered Pokemon ID for tooltip/highlight */
  let hoveredPokemonId: string | null = null;

  // ── Computed ──────────────────────────────────────────────

  /**
   * Returns true if this coach can afford the given Pokemon.
   * Used to visually indicate affordable picks.
   *
   * TODO: Implement
   */
  function canAfford(pokemonPoints: number): boolean {
    // TODO: Return ($currentCoach?.pointsRemaining ?? 0) >= pokemonPoints
    return true;
  }

  /**
   * Handles clicking a Pokemon card.
   * Guards against: not your turn, already drafted, insufficient budget.
   *
   * TODO: Implement
   */
  function handleCardClick(pokemonId: string, isDrafted: boolean, points: number): void {
    // TODO: If not $isMyTurn, show a toast: "Wait for your turn"
    // TODO: If isDrafted, do nothing (card is disabled anyway)
    // TODO: If !canAfford(points), show a toast: "Insufficient points"
    // TODO: Otherwise, call onPokemonClick(pokemonId)
    if (!$isMyTurn || isDrafted) return;
    onPokemonClick(pokemonId);
  }
</script>

<!-- ── Filter Controls ─────────────────────────────────────── -->
<div class="card p-4 mb-4">
  <div class="flex flex-wrap gap-3 items-center">

    <!-- Name Search -->
    <div class="flex-1 min-w-48">
      <!-- TODO: Bind to $searchFilter store with bind:value -->
      <input
        type="text"
        class="input"
        placeholder="Search Pokemon..."
        value={$searchFilter}
        on:input={(e) => searchFilter.set(e.currentTarget.value)}
      />
    </div>

    <!-- Tier Filter -->
    <select
      class="select w-32"
      value={$tierFilter}
      on:change={(e) => tierFilter.set(e.currentTarget.value)}
    >
      <option value="all">All Tiers</option>
      <!-- TODO: Implement tier options from VALID_TIERS -->
      <!-- {#each VALID_TIERS as tier} -->
      <!--   <option value={tier}>Tier {tier}</option> -->
      <!-- {/each} -->
    </select>

    <!-- Type Filter -->
    <select
      class="select w-36"
      value={$typeFilter}
      on:change={(e) => typeFilter.set(e.currentTarget.value)}
    >
      <option value="all">All Types</option>
      <!-- TODO: Populate from availableTypes store -->
    </select>

    <!-- Show Drafted Toggle -->
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        class="checkbox"
        checked={$showDraftedPokemon}
        on:change={(e) => showDraftedPokemon.set(e.currentTarget.checked)}
      />
      <span class="text-sm">Show drafted</span>
    </label>

    <!-- Result count -->
    <span class="text-sm text-surface-500 ml-auto">
      {$filteredPokemon.length} Pokemon
      <!-- TODO: Show "X available" count too -->
    </span>
  </div>
</div>

<!-- ── Pokemon Grid ────────────────────────────────────────── -->
<div class="overflow-y-auto flex-1">
  {#if $filteredPokemon.length === 0}
    <div class="flex items-center justify-center h-48 text-surface-500">
      <p>No Pokemon match your filters</p>
    </div>
  {:else}
    <!--
      TODO: Consider switching to grouped-by-tier layout:
      {#each pokemonByTier as [tier, tierPokemon]}
        <h3 class="...">Tier {tier}</h3>
        <div class="grid ...">...</div>
      {/each}
    -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
      {#each $filteredPokemon as pokemon (pokemon.id)}
        <!--
          Pokemon card
          TODO: Add proper hover state, drafted overlay, animation on pick
        -->
        <button
          class="card p-3 text-left transition-all"
          class:opacity-40={pokemon.isDrafted}
          class:cursor-not-allowed={pokemon.isDrafted || !$isMyTurn}
          class:hover:variant-soft-primary={!pokemon.isDrafted && $isMyTurn}
          class:ring-2={!pokemon.isDrafted && $isMyTurn && canAfford(pokemon.points)}
          class:ring-primary-500={!pokemon.isDrafted && $isMyTurn && canAfford(pokemon.points)}
          disabled={pokemon.isDrafted || !$isMyTurn}
          on:click={() => handleCardClick(pokemon.id, pokemon.isDrafted, pokemon.points)}
          on:mouseenter={() => hoveredPokemonId = pokemon.id}
          on:mouseleave={() => hoveredPokemonId = null}
        >
          <!-- Sprite -->
          {#if pokemon.spriteUrl}
            <img
              src={pokemon.spriteUrl}
              alt={pokemon.name}
              class="w-16 h-16 mx-auto object-contain"
              loading="lazy"
            />
          {:else}
            <!-- Fallback: first letter of name -->
            <div class="w-16 h-16 mx-auto rounded-full bg-surface-300-600-token flex items-center justify-center text-2xl font-bold">
              {pokemon.name[0]}
            </div>
          {/if}

          <!-- Name -->
          <p class="font-semibold text-sm mt-2 text-center truncate" title={pokemon.name}>
            {pokemon.name}
          </p>

          <!-- Tier + Points -->
          <div class="flex justify-between items-center mt-1">
            <span class="badge variant-soft text-xs">T{pokemon.tier}</span>
            <span class="text-xs font-mono">{pokemon.points}pt</span>
          </div>

          <!-- Types -->
          <!-- TODO: Add type-colored badges using Pokemon type colors -->
          <div class="flex flex-wrap gap-1 mt-2 justify-center">
            {#each pokemon.types as type}
              <span class="badge variant-filled-surface text-xs">{type}</span>
            {/each}
          </div>

          <!-- Drafted overlay text -->
          {#if pokemon.isDrafted}
            <div class="text-center text-xs text-error-500 mt-1 font-medium">Drafted</div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
