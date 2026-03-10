/**
 * server/src/services/DraftService.ts
 * ───────────────────────────────────────────────────────────
 * Core business logic for the draft system.
 *
 * This service is the heart of the application. All draft rules
 * live here: turn order calculation, pick validation, state
 * retrieval, and coach connection management.
 *
 * Design principles:
 *  - Pure business logic; no HTTP or WebSocket concerns
 *  - All mutations wrapped in Prisma transactions for atomicity
 *  - Throws typed DraftError for business rule violations
 *  - All methods are async (Prisma queries are always async)
 *  - Injected PrismaClient (testable by passing a mock)
 */

import { PrismaClient, Coach, Pokemon, DraftSession } from '@prisma/client';
import type { DraftStateSync, PickMadePayload } from '../../../shared/types';

// ── Custom Error Class ────────────────────────────────────────
/**
 * Typed error for draft rule violations.
 * The 'code' field is sent to the client in the 'error' WebSocket event
 * so the UI can display specific messages (e.g. "NOT_YOUR_TURN").
 *
 * Error codes:
 *  - NOT_YOUR_TURN       : Coach tried to pick out of order
 *  - ALREADY_DRAFTED     : Pokemon was already picked by another coach
 *  - INSUFFICIENT_POINTS : Coach doesn't have enough points for this pick
 *  - SESSION_NOT_ACTIVE  : Draft hasn't started or is already completed
 *  - COACH_NOT_FOUND     : No coach record matching provided ID
 *  - POKEMON_NOT_FOUND   : No Pokemon record matching provided ID
 *  - SESSION_NOT_FOUND   : No session record matching provided ID
 *  - TEAM_FULL           : Coach has already picked their maximum Pokemon
 */
export class DraftError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'DraftError';
  }
}

// ── Result Types ──────────────────────────────────────────────
/**
 * Returned by submitPick() after a successful pick.
 * Contains everything the WebSocket handler needs to broadcast.
 */
export interface SubmitPickResult {
  sessionId: string;
  isDraftComplete: boolean;
  pick: {
    pickNumber: number;
    coachId: string;
    coachName: string;
    pokemonId: string;
    pokemonName: string;
    pointsSpent: number;
  };
  nextCoach: {
    id: string;
    name: string;
    draftPosition: number;
    pickNumber: number;
  } | null;
}

/**
 * Returned by joinSession() after a coach successfully joins.
 */
export interface JoinSessionResult {
  coach: Coach;
  isNewCoach: boolean;
}

// ── DraftService Class ────────────────────────────────────────
export class DraftService {
  constructor(private prisma: PrismaClient) {}

  // ── Snake Draft Algorithm ─────────────────────────────────

  /**
   * Calculates which draft position (1-indexed) should pick
   * for a given global pick number in a snake draft.
   *
   * Snake pattern (N coaches):
   *   Round 1 (picks 1..N):     positions 1, 2, 3, ..., N   (forward)
   *   Round 2 (picks N+1..2N):  positions N, N-1, ..., 1    (reverse)
   *   Round 3 (picks 2N+1..3N): positions 1, 2, 3, ..., N   (forward)
   *   ...repeating...
   *
   * Algorithm:
   *   round            = Math.floor((pickNumber - 1) / totalCoaches)
   *   positionInRound  = (pickNumber - 1) % totalCoaches
   *   isForward        = round % 2 === 0
   *   draftPosition    = isForward ? positionInRound + 1
   *                                : totalCoaches - positionInRound
   *
   * Examples (8 coaches):
   *   pickNumber=1  → round=0 (forward) → position=0 → draftPosition=1
   *   pickNumber=8  → round=0 (forward) → position=7 → draftPosition=8
   *   pickNumber=9  → round=1 (reverse) → position=0 → draftPosition=8
   *   pickNumber=16 → round=1 (reverse) → position=7 → draftPosition=1
   *   pickNumber=17 → round=2 (forward) → position=0 → draftPosition=1
   *
   * @param pickNumber   - The global pick number (1-indexed)
   * @param totalCoaches - Total number of coaches in the draft
   * @returns            - Draft position (1-indexed) of the coach who should pick
   *
   * TODO: Implement this method
   */
  calculateNextDraftPosition(pickNumber: number, totalCoaches: number): number {
    // TODO: Implement snake draft algorithm
    throw new Error('Not implemented');
  }

  // ── Session Management ────────────────────────────────────

  /**
   * Handles a coach joining (or rejoining) a draft session.
   *
   * Behavior:
   *  - If a coach with this name already exists in the session,
   *    update their socketId and set isConnected = true (reconnect)
   *  - If no coach with this name exists, create a new one and
   *    assign the next available draftPosition
   *  - If the session is full (coach count == totalCoaches), throw
   *
   * @param sessionId  - UUID of the session to join
   * @param coachName  - Display name for the coach
   * @param socketId   - Socket.io socket ID for this connection
   * @returns          - The coach record and whether they are new
   *
   * TODO: Implement this method
   */
  async joinSession(
    sessionId: string,
    coachName: string,
    socketId: string
  ): Promise<JoinSessionResult> {
    // TODO: Implement join session logic
    // 1. Find session by ID, throw SESSION_NOT_FOUND if missing
    // 2. Check if coach with this name already exists (reconnect case)
    //    - If yes: update socketId, set isConnected=true, return {coach, isNewCoach: false}
    // 3. Check if session has room for more coaches
    //    - Count existing coaches; if >= session.totalCoaches, throw "Session is full"
    // 4. Find next available draftPosition (next integer not yet taken)
    // 5. Create new coach record with pointsRemaining = session.pointBudget
    // 6. Return {coach, isNewCoach: true}
    throw new Error('Not implemented');
  }

  /**
   * Updates a coach's connection status to disconnected.
   * Called when a socket disconnects.
   *
   * @param coachId - UUID of the coach who disconnected
   *
   * TODO: Implement this method
   */
  async handleDisconnect(coachId: string): Promise<void> {
    // TODO: Set coach.isConnected = false and clear coach.socketId
    // Use prisma.coach.update({ where: { id: coachId }, data: { isConnected: false, socketId: null } })
    // Silently ignore if coachId not found (race condition safe)
    throw new Error('Not implemented');
  }

  // ── Pick Submission ───────────────────────────────────────

  /**
   * Submits a draft pick atomically using a Prisma transaction.
   *
   * Validation sequence (all happen inside the transaction):
   *  1. Fetch coach + session (throw COACH_NOT_FOUND if missing)
   *  2. Verify session.status === 'active' (throw SESSION_NOT_ACTIVE)
   *  3. Calculate whose turn it is via calculateNextDraftPosition()
   *  4. Verify coach.draftPosition matches expected position (throw NOT_YOUR_TURN)
   *  5. Fetch pokemon (throw POKEMON_NOT_FOUND if missing)
   *  6. Verify pokemon.isDrafted === false (throw ALREADY_DRAFTED)
   *  7. Verify coach.pointsRemaining >= pokemon.points (throw INSUFFICIENT_POINTS)
   *  8. Verify coach hasn't reached their team limit (throw TEAM_FULL)
   *
   * Mutations (inside same transaction):
   *  1. Create Pick record
   *  2. Decrement coach.pointsRemaining by pokemon.points
   *  3. Set pokemon.isDrafted = true
   *  4. Increment session.currentPickNumber
   *  5. If all picks made, set session.status = 'completed'
   *
   * @param coachId   - UUID of the coach submitting the pick
   * @param pokemonId - UUID of the Pokemon being picked
   * @returns         - Result object for broadcasting
   *
   * TODO: Implement this method
   */
  async submitPick(coachId: string, pokemonId: string): Promise<SubmitPickResult> {
    // TODO: Implement inside prisma.$transaction(async (tx) => { ... })
    // Follow the validation and mutation sequence described above.
    // Return a SubmitPickResult with all data needed for broadcasting.
    throw new Error('Not implemented');
  }

  // ── State Queries ─────────────────────────────────────────

  /**
   * Builds a full DraftStateSync snapshot for a session.
   * Sent to coaches on join or reconnect so their UI is up-to-date.
   *
   * Includes:
   *  - Session metadata (id, name, status, currentPickNumber)
   *  - All coaches with their current points and connection status
   *  - All picks so far (ordered by pickNumber)
   *  - currentTurn: which coach picks next (null if draft not active)
   *
   * @param sessionId - UUID of the session
   * @returns         - Full state snapshot matching DraftStateSync type
   *
   * TODO: Implement this method
   */
  async getDraftState(sessionId: string): Promise<DraftStateSync> {
    // TODO: Implement state snapshot builder
    // 1. Fetch session (throw SESSION_NOT_FOUND if missing)
    // 2. Fetch all coaches for session (ordered by draftPosition)
    // 3. Fetch all picks for session with coach + pokemon names (ordered by pickNumber)
    // 4. Calculate currentTurn using calculateNextDraftPosition()
    //    - Only if session.status === 'active'
    //    - Look up coach at that draftPosition
    // 5. Assemble and return DraftStateSync object
    throw new Error('Not implemented');
  }

  // ── Private Helpers ───────────────────────────────────────

  /**
   * Fetches a session or throws SESSION_NOT_FOUND.
   * TODO: Implement this helper
   */
  private async getSession(sessionId: string): Promise<DraftSession> {
    // TODO: prisma.draftSession.findUnique({ where: { id: sessionId } })
    // If null, throw new DraftError('SESSION_NOT_FOUND', `Session ${sessionId} not found`)
    throw new Error('Not implemented');
  }

  /**
   * Fetches a coach with their session or throws COACH_NOT_FOUND.
   * TODO: Implement this helper
   */
  private async getCoachWithSession(
    coachId: string
  ): Promise<Coach & { session: DraftSession }> {
    // TODO: prisma.coach.findUnique({ where: { id: coachId }, include: { session: true } })
    // If null, throw new DraftError('COACH_NOT_FOUND', `Coach ${coachId} not found`)
    throw new Error('Not implemented');
  }

  /**
   * Fetches a Pokemon or throws POKEMON_NOT_FOUND.
   * TODO: Implement this helper
   */
  private async getPokemon(pokemonId: string): Promise<Pokemon> {
    // TODO: prisma.pokemon.findUnique({ where: { id: pokemonId } })
    // If null, throw new DraftError('POKEMON_NOT_FOUND', `Pokemon ${pokemonId} not found`)
    throw new Error('Not implemented');
  }

  /**
   * Determines whether a draft session is complete.
   * Complete = currentPickNumber === totalCoaches * pokemonPerCoach
   * TODO: Implement this helper
   */
  private isDraftComplete(session: DraftSession): boolean {
    // TODO: Compare session.currentPickNumber to session.totalCoaches * session.pokemonPerCoach
    throw new Error('Not implemented');
  }
}
