/**
 * client/src/lib/stores/draftStore.ts
 * ───────────────────────────────────────────────────────────
 * Svelte stores for draft session state.
 *
 * Architecture:
 *  - draftState:      writable, set from 'draft_state_sync' events (full state)
 *  - currentCoachId:  writable, set after joining a session (identity)
 *  - Derived stores:  computed from draftState + currentCoachId (no duplication)
 *
 * Data flow:
 *  Server emits 'draft_state_sync' → socket.ts handler → draftState.set()
 *  Server emits 'pick_made'        → socket.ts handler → draftState.update()
 *  User joins session              → currentCoachId.set(coach.id)
 *
 * Svelte reactivity:
 *  Components import stores with $draftState, $isMyTurn, etc.
 *  Derived stores recompute automatically when dependencies change.
 *  No manual subscriptions needed in components (Svelte handles it).
 *
 * Note: The server is the canonical source of truth.
 * Stores are just a client-side cache of the last received server state.
 */

import { writable, derived, type Readable } from 'svelte/store';
import type { DraftStateSync } from '@shared/types';

// ── Writable Stores (set externally by socket event handlers) ─

/**
 * The complete draft session state received from the server.
 * Updated on every 'draft_state_sync' event (full replace).
 * Incrementally updated on 'pick_made' events (partial update).
 *
 * null = not yet connected to a session.
 */
export const draftState = writable<DraftStateSync | null>(null);

/**
 * The UUID of the coach using this browser tab.
 * Set after a successful 'join_session' → 'draft_state_sync' cycle.
 * Used by derived stores to determine "my" data vs. other coaches.
 *
 * null = not yet joined a session.
 */
export const currentCoachId = writable<string | null>(null);

/**
 * WebSocket connection status for UI feedback.
 * 'connecting' → 'connected' → 'disconnected' (→ 'connecting' on retry)
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
export const connectionStatus = writable<ConnectionStatus>('disconnected');

// ── Derived Stores (auto-computed from above) ─────────────────

/**
 * The current user's coach record.
 * Used to display name, budget, draft position, etc.
 *
 * null if not yet joined or state not loaded.
 *
 * TODO: This is already implemented as an example.
 * Reference for how other derived stores should work.
 */
export const currentCoach: Readable<DraftStateSync['coaches'][number] | null> = derived(
  [draftState, currentCoachId],
  ([$draftState, $currentCoachId]) => {
    // TODO: Implement lookup
    // Return the coach object matching currentCoachId from the coaches array
    // Return null if either store is null or no match found
    if (!$draftState || !$currentCoachId) return null;
    return $draftState.coaches.find(c => c.id === $currentCoachId) ?? null;
  }
);

/**
 * True if it is currently this coach's turn to pick.
 * Used to enable/disable the Pokemon selection UI.
 *
 * TODO: Implement
 */
export const isMyTurn: Readable<boolean> = derived(
  [draftState, currentCoachId],
  ([$draftState, $currentCoachId]) => {
    // TODO: Return true if $draftState.currentTurn?.coachId === $currentCoachId
    // Also check session.status === 'active'
    return false;
  }
);

/**
 * The coach who should pick next (or null if draft not active).
 * Used by TurnIndicator to display whose turn it is.
 *
 * TODO: Implement
 */
export const currentTurnCoach: Readable<DraftStateSync['currentTurn']> = derived(
  draftState,
  ($draftState) => {
    // TODO: Return $draftState?.currentTurn ?? null
    return null;
  }
);

/**
 * All picks made so far, ordered by pick number.
 * Used by PickHistory component to render the pick timeline.
 *
 * TODO: Implement
 */
export const pickHistory: Readable<DraftStateSync['picks']> = derived(
  draftState,
  ($draftState) => {
    // TODO: Return $draftState?.picks ?? []
    return [];
  }
);

/**
 * Picks made specifically by the current coach (their drafted team).
 * Used by CoachRoster component.
 *
 * TODO: Implement
 */
export const myPicks: Readable<DraftStateSync['picks']> = derived(
  [draftState, currentCoachId],
  ([$draftState, $currentCoachId]) => {
    // TODO: Filter $draftState.picks where pick.coachId === $currentCoachId
    return [];
  }
);

/**
 * All coaches sorted by their draft position (1 = first pick).
 * Used by the coach list sidebar to show order and connection status.
 *
 * TODO: Implement
 */
export const coachesInOrder: Readable<DraftStateSync['coaches']> = derived(
  draftState,
  ($draftState) => {
    // TODO: Return [...$draftState.coaches].sort((a, b) => a.draftPosition - b.draftPosition)
    return [];
  }
);

/**
 * Whether the draft is currently active (picks can be made).
 *
 * TODO: Implement
 */
export const isDraftActive: Readable<boolean> = derived(
  draftState,
  ($draftState) => {
    // TODO: Return $draftState?.session.status === 'active'
    return false;
  }
);

/**
 * Whether the draft has completed (all picks made).
 *
 * TODO: Implement
 */
export const isDraftComplete: Readable<boolean> = derived(
  draftState,
  ($draftState) => {
    // TODO: Return $draftState?.session.status === 'completed'
    return false;
  }
);

/**
 * Number of picks remaining until the draft is complete.
 * Useful for progress displays.
 *
 * TODO: Implement
 */
export const picksRemaining: Readable<number> = derived(
  draftState,
  ($draftState) => {
    // TODO: Calculate: (session.totalCoaches * session.pokemonPerCoach) - session.currentPickNumber
    return 0;
  }
);
