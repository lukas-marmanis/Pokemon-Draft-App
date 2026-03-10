/**
 * server/src/websocket/index.ts
 * ───────────────────────────────────────────────────────────
 * WebSocket event handler registration.
 *
 * Responsibilities:
 *  - Listen for new socket connections via io.on('connection')
 *  - For each connected socket, register per-event handlers
 *  - Parse and validate incoming payloads with Zod schemas
 *  - Delegate business logic to DraftService
 *  - Broadcast results to the correct Socket.io room (sessionId)
 *  - Handle and surface errors back to the emitting socket
 *
 * Socket.io Rooms:
 *  Each draft session has its own room identified by sessionId.
 *  Coaches join the room on 'join_session' and receive all
 *  broadcasts (pick_made, coach_connected, etc.) for that session.
 *
 * Event Flow:
 *  Client → Server:   join_session, submit_pick
 *  Server → Client:   draft_state_sync, pick_made, coach_connected,
 *                     coach_disconnected, error
 */

import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import { JoinSessionSchema, SubmitPickSchema } from '../../../shared/types';
import { DraftService } from '../services/DraftService';

/**
 * Registers all WebSocket event handlers on the Socket.io server.
 * Called once at application startup from index.ts.
 *
 * @param io     - The Socket.io Server instance (for broadcasting to rooms)
 * @param prisma - Shared Prisma client (passed down to DraftService)
 */
export function registerWebSocketHandlers(io: Server, prisma: PrismaClient): void {
  // Instantiate service once; it is stateless (all state lives in DB)
  const draftService = new DraftService(prisma);

  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // ── join_session ────────────────────────────────────────
    /**
     * Event: 'join_session'
     * Payload: { sessionId: string (uuid), coachName: string }
     *
     * Handler responsibilities:
     *  1. Validate payload with JoinSessionSchema (Zod)
     *  2. Call draftService.joinSession() to upsert coach in DB
     *     and record socketId for future targeted messages
     *  3. Add socket to the session's Socket.io room
     *  4. Emit 'draft_state_sync' to this socket (full state snapshot)
     *  5. Broadcast 'coach_connected' to other coaches in the room
     *  6. On error: emit 'error' back to this socket only
     *
     * TODO: Implement this handler
     */
    socket.on('join_session', async (payload: unknown) => {
      try {
        // TODO: Step 1 - Validate payload
        // const validated = JoinSessionSchema.parse(payload);

        // TODO: Step 2 - Join session in database
        // const coach = await draftService.joinSession(
        //   validated.sessionId,
        //   validated.coachName,
        //   socket.id
        // );

        // TODO: Step 3 - Add socket to session room
        // socket.join(validated.sessionId);

        // TODO: Step 4 - Send current state snapshot to joining coach
        // const state = await draftService.getDraftState(validated.sessionId);
        // socket.emit('draft_state_sync', state);

        // TODO: Step 5 - Notify other coaches in the session
        // socket.to(validated.sessionId).emit('coach_connected', {
        //   coachId: coach.id,
        //   coachName: coach.name,
        //   draftPosition: coach.draftPosition,
        // });

        // TODO: Store coachId on socket for use in disconnect handler
        // (socket as any).coachId = coach.id;
        // (socket as any).sessionId = validated.sessionId;

      } catch (error) {
        // TODO: Handle ZodError (validation) vs DraftError (business rule) vs unknown
        // emitError(socket, error);
      }
    });

    // ── submit_pick ─────────────────────────────────────────
    /**
     * Event: 'submit_pick'
     * Payload: { coachId: string (uuid), pokemonId: string (uuid) }
     *
     * Handler responsibilities:
     *  1. Validate payload with SubmitPickSchema (Zod)
     *  2. Call draftService.submitPick() which runs atomically in a
     *     Prisma transaction (validates turn, budget, availability)
     *  3. Broadcast 'pick_made' to ALL coaches in the session room
     *     (including the picker) so all UIs update simultaneously
     *  4. If draft is now complete, broadcast 'draft_completed'
     *  5. On error: emit 'error' to this socket only
     *
     * TODO: Implement this handler
     */
    socket.on('submit_pick', async (payload: unknown) => {
      try {
        // TODO: Step 1 - Validate payload
        // const validated = SubmitPickSchema.parse(payload);

        // TODO: Step 2 - Execute pick (atomic DB transaction + validation)
        // const result = await draftService.submitPick(
        //   validated.coachId,
        //   validated.pokemonId
        // );

        // TODO: Step 3 - Broadcast pick to all coaches in the session
        // io.to(result.sessionId).emit('pick_made', {
        //   pick: result.pick,
        //   nextCoach: result.nextCoach,
        // });

        // TODO: Step 4 - Check if draft is complete, broadcast if so
        // if (result.isDraftComplete) {
        //   io.to(result.sessionId).emit('draft_completed', {
        //     sessionId: result.sessionId,
        //   });
        // }

      } catch (error) {
        // TODO: Handle ZodError vs DraftError vs unknown
        // emitError(socket, error);
      }
    });

    // ── disconnect ──────────────────────────────────────────
    /**
     * Event: 'disconnect'
     * Fired automatically by Socket.io when a client disconnects.
     *
     * Handler responsibilities:
     *  1. Look up coachId from socket metadata (set during join_session)
     *  2. Call draftService.handleDisconnect() to set coach.isConnected = false
     *  3. Broadcast 'coach_disconnected' to remaining coaches in the room
     *  4. Log disconnection for debugging
     *
     * Note: Socket.io automatically removes the socket from all rooms
     * on disconnect; no manual leave() call is required.
     *
     * TODO: Implement this handler
     */
    socket.on('disconnect', async (reason: string) => {
      console.log(`[WS] Client disconnected: ${socket.id} (reason: ${reason})`);

      // TODO: Retrieve coachId stored on socket during join_session
      // const coachId = (socket as any).coachId;
      // const sessionId = (socket as any).sessionId;

      // TODO: Update coach connection status in database
      // if (coachId) {
      //   await draftService.handleDisconnect(coachId);
      //   socket.to(sessionId).emit('coach_disconnected', { coachId });
      // }
    });
  });
}

// ── Helper: Emit Structured Error ────────────────────────────
/**
 * Formats and emits an error event to a single socket.
 *
 * Error types:
 *  - ZodError:   validation failure (malformed payload)
 *  - DraftError: business rule violation (wrong turn, no budget, etc.)
 *  - Error:      unexpected server error (log and send generic message)
 *
 * TODO: Implement this helper
 */
function emitError(socket: Socket, error: unknown): void {
  // TODO: Distinguish error types and build appropriate ErrorPayload
  // if (error instanceof ZodError) {
  //   socket.emit('error', {
  //     code: 'VALIDATION_ERROR',
  //     message: 'Invalid payload format',
  //     details: error.flatten(),
  //   });
  // } else if (error instanceof DraftError) {
  //   socket.emit('error', { code: error.code, message: error.message });
  // } else {
  //   console.error('[WS] Unexpected error:', error);
  //   socket.emit('error', { code: 'SERVER_ERROR', message: 'Internal server error' });
  // }
}
