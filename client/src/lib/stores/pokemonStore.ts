/**
 * client/src/lib/stores/pokemonStore.ts
 * ───────────────────────────────────────────────────────────
 * Svelte stores for the Pokemon pool state.
 *
 * Separation of concerns:
 *  - draftStore.ts handles session/pick/coach state
 *  - pokemonStore.ts handles the Pokemon list + UI filters
 *
 * The Pokemon pool is received from the server as part of
 * 'draft_state_sync' and stored in allPokemon.
 *
 * Filter stores allow coaches to search/filter the Pokemon grid
 * without affecting the underlying data. filteredPokemon is
 * derived from the raw pool + current filter values.
 *
 * Tier ordering:
 *  S → most expensive/powerful
 *  1 → second tier
 *  2 → third tier
 *  ...
 *  5 → cheapest/most common
 */

import { writable, derived, type Readable } from 'svelte/store';
import type { DraftStateSync } from '@shared/types';

// ── Type Alias ────────────────────────────────────────────────
type PokemonEntry = DraftStateSync['pokemon'][number];

// ── Writable Stores ───────────────────────────────────────────

/**
 * Complete Pokemon pool for the current session.
 * Populated from 'draft_state_sync' event.
 * Pokemon entries have isDrafted=true once picked.
 *
 * Updated via allPokemon.set(data.pokemon) in socket event handler.
 */
export const allPokemon = writable<PokemonEntry[]>([]);

/**
 * Text search filter: matches Pokemon name (case-insensitive substring).
 * Empty string = show all.
 * Updated by search input in DraftBoard component.
 */
export const searchFilter = writable<string>('');

/**
 * Tier filter: show only Pokemon of a specific tier.
 * 'all' = no tier filter.
 * Options: 'all' | 'S' | '1' | '2' | '3' | '4' | '5'
 */
export const tierFilter = writable<string>('all');

/**
 * Type filter: show only Pokemon of a specific type.
 * 'all' = no type filter.
 * Options: 'all' | 'Fire' | 'Water' | 'Grass' | etc.
 */
export const typeFilter = writable<string>('all');

/**
 * Whether to show already-drafted Pokemon or hide them.
 * true  = show all (drafted ones appear dimmed)
 * false = hide drafted Pokemon completely
 */
export const showDraftedPokemon = writable<boolean>(true);

/**
 * Sort order for the Pokemon grid.
 * 'tier'   = group by tier (S first, 5 last)
 * 'points' = sort by cost descending
 * 'name'   = alphabetical
 */
export type SortOrder = 'tier' | 'points' | 'name';
export const sortOrder = writable<SortOrder>('tier');

// ── Derived Stores ────────────────────────────────────────────

/**
 * Filtered and sorted Pokemon list for display in DraftBoard.
 * Recomputes whenever any filter store changes.
 *
 * Filter pipeline:
 *  1. Filter by showDraftedPokemon (hide drafted if false)
 *  2. Filter by searchFilter (name substring match)
 *  3. Filter by tierFilter (exact tier match)
 *  4. Filter by typeFilter (type1 or type2 match)
 *  5. Sort by sortOrder
 *
 * TODO: Implement this derived store
 */
export const filteredPokemon: Readable<PokemonEntry[]> = derived(
  [allPokemon, searchFilter, tierFilter, typeFilter, showDraftedPokemon, sortOrder],
  ([$allPokemon, $searchFilter, $tierFilter, $typeFilter, $showDraftedPokemon, $sortOrder]) => {
    // TODO: Implement filter pipeline
    // Step 1: Optionally hide drafted Pokemon
    // let result = $showDraftedPokemon ? $allPokemon : $allPokemon.filter(p => !p.isDrafted);

    // Step 2: Name search filter
    // if ($searchFilter.trim()) {
    //   const query = $searchFilter.toLowerCase();
    //   result = result.filter(p => p.name.toLowerCase().includes(query));
    // }

    // Step 3: Tier filter
    // if ($tierFilter !== 'all') {
    //   result = result.filter(p => p.tier === $tierFilter);
    // }

    // Step 4: Type filter
    // if ($typeFilter !== 'all') {
    //   result = result.filter(p => p.types.includes($typeFilter));
    // }

    // Step 5: Sort
    // const TIER_ORDER = { S: 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
    // result.sort((a, b) => {
    //   switch ($sortOrder) {
    //     case 'tier':   return (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
    //     case 'points': return b.points - a.points;
    //     case 'name':   return a.name.localeCompare(b.name);
    //     default:       return 0;
    //   }
    // });

    // return result;
    return $allPokemon; // Placeholder: no filtering until implemented
  }
);

/**
 * Pokemon grouped by tier for a grouped grid display.
 * Returns a Map<tier, PokemonEntry[]> ordered S → 5.
 *
 * TODO: Implement
 */
export const pokemonByTier: Readable<Map<string, PokemonEntry[]>> = derived(
  filteredPokemon,
  ($filteredPokemon) => {
    // TODO: Group filtered pokemon by tier using Map
    // const TIER_ORDER = ['S', '1', '2', '3', '4', '5'];
    // const grouped = new Map<string, PokemonEntry[]>();
    // TIER_ORDER.forEach(tier => grouped.set(tier, []));
    // $filteredPokemon.forEach(p => grouped.get(p.tier)?.push(p));
    // Remove empty tiers
    // return new Map([...grouped.entries()].filter(([_, v]) => v.length > 0));
    return new Map();
  }
);

/**
 * Count of available (not-yet-drafted) Pokemon.
 * Used in UI to show pool size remaining.
 *
 * TODO: Implement
 */
export const availableCount: Readable<number> = derived(
  allPokemon,
  ($allPokemon) => {
    // TODO: Return $allPokemon.filter(p => !p.isDrafted).length
    return 0;
  }
);

/**
 * All unique types present in the current Pokemon pool.
 * Used to populate the type filter dropdown.
 *
 * TODO: Implement
 */
export const availableTypes: Readable<string[]> = derived(
  allPokemon,
  ($allPokemon) => {
    // TODO: Collect all unique types from the pool
    // const types = new Set<string>();
    // $allPokemon.forEach(p => p.types.forEach(t => types.add(t)));
    // return ['all', ...Array.from(types).sort()];
    return ['all'];
  }
);

// ── Store Reset Helper ────────────────────────────────────────

/**
 * Resets all Pokemon store state to defaults.
 * Call when leaving a draft session.
 *
 * TODO: Implement
 */
export function resetPokemonStore(): void {
  // TODO: Reset all writable stores to initial values
  // allPokemon.set([]);
  // searchFilter.set('');
  // tierFilter.set('all');
  // typeFilter.set('all');
  // showDraftedPokemon.set(true);
  // sortOrder.set('tier');
}
