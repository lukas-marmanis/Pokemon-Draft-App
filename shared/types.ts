/**
 * shared/types.ts
 * ───────────────────────────────────────────────────────────
 * Shared TypeScript types and Zod validation schemas.
 *
 * This file is the single source of truth for the data contracts
 * between client and server. Both sides import from here.
 *
 * Key design choices:
 *  - Zod schemas define BOTH runtime validation AND TypeScript types
 *  - z.infer<typeof Schema> generates the TS type automatically (DRY)
 *  - Schemas are used on server to validate incoming WebSocket payloads
 *  - Schemas can be used on client for optimistic validation before sending
 *
 * Import paths:
 *  Server: import { ... } from '../../../shared/types';
 *  Client: import { ... } from '$lib/types'; (re-export from client/src/lib/types.ts)
 *
 * WebSocket Event Summary:
 *  Client → Server:
 *    'join_session'   payload: JoinSessionPayload
 *    'submit_pick'    payload: SubmitPickPayload
 *
 *  Server → Client:
 *    'draft_state_sync'   payload: DraftStateSync      (full state, on join/reconnect)
 *    'pick_made'          payload: PickMadePayload      (broadcast after each pick)
 *    'coach_connected'    payload: CoachConnectedPayload
 *    'coach_disconnected' payload: CoachDisconnectedPayload
 *    'draft_completed'    payload: DraftCompletedPayload
 *    'error'              payload: ErrorPayload
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────
// CLIENT → SERVER EVENTS
// ────────────────────────────────────────────────────────────

/**
 * Payload for 'join_session' event.
 * Emitted when a coach first connects to a draft session.
 * Server uses sessionId to look up the session and coachName
 * to find or create the coach record.
 */
export const JoinSessionSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId must be a valid UUID' }),
  coachName: z
    .string()
    .min(1, { message: 'Coach name cannot be empty' })
    .max(50, { message: 'Coach name must be 50 characters or fewer' })
    .trim(),
});
export type JoinSessionPayload = z.infer<typeof JoinSessionSchema>;

/**
 * Payload for 'submit_pick' event.
 * Emitted when a coach selects a Pokemon during their turn.
 * Server validates turn order, budget, and availability atomically.
 */
export const SubmitPickSchema = z.object({
  coachId: z.string().uuid({ message: 'coachId must be a valid UUID' }),
  pokemonId: z.string().uuid({ message: 'pokemonId must be a valid UUID' }),
});
export type SubmitPickPayload = z.infer<typeof SubmitPickSchema>;

// ────────────────────────────────────────────────────────────
// SERVER → CLIENT EVENTS
// ────────────────────────────────────────────────────────────

/**
 * Payload for 'draft_state_sync' event.
 * Sent to a coach when they (re)join a session.
 * Contains the complete current state of the draft so the
 * client can render an accurate UI without any prior state.
 */
export interface DraftStateSync {
  session: {
    id: string;
    name: string;
    status: 'setup' | 'active' | 'completed';
    pointBudget: number;
    totalCoaches: number;
    pokemonPerCoach: number;
    currentPickNumber: number;
  };
  coaches: Array<{
    id: string;
    name: string;
    draftPosition: number;
    pointsRemaining: number;
    isConnected: boolean;
  }>;
  /** All Pokemon in the pool for this session */
  pokemon: Array<{
    id: string;
    name: string;
    tier: string;
    points: number;
    types: string[];    // Parsed from JSON string in DB
    spriteUrl: string | null;
    isDrafted: boolean;
  }>;
  /** Pick history ordered by pickNumber ascending */
  picks: Array<{
    pickNumber: number;
    coachId: string;
    coachName: string;
    pokemonId: string;
    pokemonName: string;
    pointsSpent: number;
    timestamp: string;  // ISO 8601 string
  }>;
  /** Which coach picks next; null if draft is not active or complete */
  currentTurn: {
    coachId: string;
    coachName: string;
    draftPosition: number;
    pickNumber: number;
  } | null;
}

/**
 * Payload for 'pick_made' event.
 * Broadcast to ALL coaches in a session room immediately after
 * a pick is validated and committed to the database.
 * Clients update their local state incrementally from this event
 * rather than re-fetching the full state.
 */
export interface PickMadePayload {
  pick: {
    pickNumber: number;
    coachId: string;
    coachName: string;
    pokemonId: string;
    pokemonName: string;
    pointsSpent: number;
    timestamp: string;
  };
  /** Coach whose turn is next; null if this was the last pick */
  nextCoach: {
    id: string;
    name: string;
    draftPosition: number;
    pickNumber: number;
  } | null;
  /** Updated point totals after the pick */
  coachPointsRemaining: number;
}

/**
 * Payload for 'coach_connected' event.
 * Broadcast when a coach joins (or rejoins) the session room.
 * Other coaches' UIs update the connection indicator.
 */
export interface CoachConnectedPayload {
  coachId: string;
  coachName: string;
  draftPosition: number;
}

/**
 * Payload for 'coach_disconnected' event.
 * Broadcast when a coach's socket disconnects.
 * Draft continues; a timer (future feature) may auto-skip their turn.
 */
export interface CoachDisconnectedPayload {
  coachId: string;
  coachName: string;
}

/**
 * Payload for 'draft_completed' event.
 * Broadcast when the last pick is made (all rosters are full).
 * Client shows a completion screen and enables export options.
 */
export interface DraftCompletedPayload {
  sessionId: string;
  sessionName: string;
  completedAt: string; // ISO 8601 string
}

/**
 * Payload for 'error' event.
 * Sent only to the socket that caused the error (not broadcast).
 * Clients display the message in a toast/alert.
 *
 * Error codes (see DraftService.ts for full list):
 *  VALIDATION_ERROR    - Zod schema parse failed
 *  NOT_YOUR_TURN       - Coach submitted a pick out of order
 *  ALREADY_DRAFTED     - Selected Pokemon was already picked
 *  INSUFFICIENT_POINTS - Not enough points remaining
 *  SESSION_NOT_ACTIVE  - Session hasn't started or is completed
 *  COACH_NOT_FOUND     - coachId doesn't match any record
 *  POKEMON_NOT_FOUND   - pokemonId doesn't match any record
 *  SESSION_NOT_FOUND   - sessionId doesn't match any record
 *  TEAM_FULL           - Coach has reached their Pokemon limit
 *  SERVER_ERROR        - Unexpected internal error
 */
export interface ErrorPayload {
  code: string;
  message: string;
  /** Optional: field name that caused a validation error */
  field?: string;
}

// ────────────────────────────────────────────────────────────
// DOMAIN MODEL TYPES
// ────────────────────────────────────────────────────────────

/**
 * Represents a single Pokemon in the draft pool.
 * Used for the import utilities and pokemon store on the client.
 */
export interface PokemonData {
  name: string;
  tier: string;
  points: number;
  types: string[];
  spriteUrl?: string;
}

/**
 * Valid Pokemon tier values in VGC draft leagues.
 * Tiers determine point cost: S = most expensive, 5 = cheapest.
 */
export const VALID_TIERS = ['S', '1', '2', '3', '4', '5'] as const;
export type Tier = typeof VALID_TIERS[number];

/**
 * Valid Pokemon types for validation during import.
 */
export const VALID_TYPES = [
  'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
] as const;
export type PokemonType = typeof VALID_TYPES[number];

/**
 * Draft session lifecycle status.
 * setup     → Session created, coaches joining, Pokemon being imported
 * active    → Draft in progress, picks being made
 * completed → All picks made, rosters finalized
 */
export type SessionStatus = 'setup' | 'active' | 'completed';

// ────────────────────────────────────────────────────────────
// ADMIN / REST API TYPES (future scope)
// ────────────────────────────────────────────────────────────

/**
 * Schema for creating a new draft session (admin REST endpoint).
 * TODO: Add to a future admin API when building session management UI.
 */
export const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100),
  totalCoaches: z.number().int().min(2).max(24),
  pointBudget: z.number().int().min(100).max(1000).default(400),
  pokemonPerCoach: z.number().int().min(1).max(20).default(10),
});
export type CreateSessionPayload = z.infer<typeof CreateSessionSchema>;
