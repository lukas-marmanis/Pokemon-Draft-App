/**
 * client/src/lib/socket.ts
 * ───────────────────────────────────────────────────────────
 * Socket.io client wrapper with typed event emitters/listeners.
 *
 * Design goals:
 *  - Type-safe: use TypeScript interfaces for all payloads
 *  - Encapsulated: components don't touch socket.io directly
 *  - Singleton: one SocketClient instance shared across the app
 *  - Observable: callbacks register once in the draft page's onMount
 *
 * Usage pattern in Svelte components:
 *   import { socketClient } from '$lib/socket';
 *   import { draftState } from '$lib/stores/draftStore';
 *
 *   onMount(() => {
 *     socketClient.connect('http://localhost:3000');
 *     socketClient.onDraftStateSync(data => draftState.set(data));
 *     socketClient.onPickMade(data => { ... });
 *     socketClient.joinSession(sessionId, coachName);
 *   });
 *
 *   onDestroy(() => socketClient.disconnect());
 *
 * Reconnection:
 *  Socket.io handles reconnection automatically. The server sends
 *  'draft_state_sync' after reconnect so clients re-sync state.
 *  Configure reconnectionDelayMax to cap the backoff delay.
 */

import { io, type Socket } from 'socket.io-client';
import type {
  DraftStateSync,
  PickMadePayload,
  CoachConnectedPayload,
  CoachDisconnectedPayload,
  DraftCompletedPayload,
  ErrorPayload,
  JoinSessionPayload,
  SubmitPickPayload,
} from '@shared/types';

// ── SocketClient Class ────────────────────────────────────────

class SocketClient {
  /**
   * The underlying Socket.io socket instance.
   * null until connect() is called.
   */
  private socket: Socket | null = null;

  /**
   * Whether the socket is currently connected.
   * Use this to guard emit calls.
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Connection Management ───────────────────────────────

  /**
   * Establishes a WebSocket connection to the server.
   * Should be called in onMount() of the draft page.
   *
   * Socket.io reconnection is automatic:
   *  - Initial delay: 1 second
   *  - Max delay: 30 seconds
   *  - Max attempts: Infinity (keeps trying)
   *
   * @param serverUrl - The URL of the backend server
   *
   * TODO: Implement this method
   */
  connect(serverUrl: string): void {
    // TODO: Create socket with reconnection options
    // this.socket = io(serverUrl, {
    //   reconnection: true,
    //   reconnectionDelay: 1000,
    //   reconnectionDelayMax: 30000,
    //   reconnectionAttempts: Infinity,
    //   // Timeout for initial connection attempt
    //   timeout: 10000,
    // });
    //
    // this.socket.on('connect', () => {
    //   console.log('[Socket] Connected:', this.socket?.id);
    // });
    //
    // this.socket.on('disconnect', (reason) => {
    //   console.log('[Socket] Disconnected:', reason);
    // });
    //
    // this.socket.on('connect_error', (err) => {
    //   console.error('[Socket] Connection error:', err.message);
    // });
  }

  /**
   * Disconnects from the server.
   * Should be called in onDestroy() of the draft page.
   *
   * TODO: Implement this method
   */
  disconnect(): void {
    // TODO: this.socket?.disconnect();
    // TODO: this.socket = null;
  }

  // ── Client → Server Emitters ────────────────────────────

  /**
   * Emits 'join_session' to register as a coach in a session.
   * Server responds with 'draft_state_sync' if successful,
   * or 'error' if the session is full or not found.
   *
   * @param sessionId - UUID of the draft session
   * @param coachName - Coach's display name (1-50 chars)
   *
   * TODO: Implement this method
   */
  joinSession(sessionId: string, coachName: string): void {
    // TODO: Guard against null socket
    // if (!this.socket) { console.warn('[Socket] Not connected'); return; }
    //
    // const payload: JoinSessionPayload = { sessionId, coachName };
    // this.socket.emit('join_session', payload);
  }

  /**
   * Emits 'submit_pick' to draft a Pokemon during your turn.
   * Server validates the pick atomically and responds with
   * 'pick_made' broadcast or 'error' to this socket only.
   *
   * @param coachId   - UUID of the submitting coach
   * @param pokemonId - UUID of the Pokemon being drafted
   *
   * TODO: Implement this method
   */
  submitPick(coachId: string, pokemonId: string): void {
    // TODO: Guard against null socket
    // if (!this.socket) { console.warn('[Socket] Not connected'); return; }
    //
    // const payload: SubmitPickPayload = { coachId, pokemonId };
    // this.socket.emit('submit_pick', payload);
  }

  // ── Server → Client Listeners ────────────────────────────

  /**
   * Registers a callback for 'draft_state_sync' events.
   * Fired when joining/rejoining a session with full state snapshot.
   * Callback should call draftState.set(data) in the store.
   *
   * TODO: Implement this method
   */
  onDraftStateSync(callback: (data: DraftStateSync) => void): void {
    // TODO: this.socket?.on('draft_state_sync', callback);
  }

  /**
   * Registers a callback for 'pick_made' events.
   * Fired after every successful pick; broadcast to all coaches.
   * Callback should update draftState incrementally.
   *
   * TODO: Implement this method
   */
  onPickMade(callback: (data: PickMadePayload) => void): void {
    // TODO: this.socket?.on('pick_made', callback);
  }

  /**
   * Registers a callback for 'coach_connected' events.
   * Fired when any coach joins the session room.
   *
   * TODO: Implement this method
   */
  onCoachConnected(callback: (data: CoachConnectedPayload) => void): void {
    // TODO: this.socket?.on('coach_connected', callback);
  }

  /**
   * Registers a callback for 'coach_disconnected' events.
   * Fired when any coach's socket closes unexpectedly.
   *
   * TODO: Implement this method
   */
  onCoachDisconnected(callback: (data: CoachDisconnectedPayload) => void): void {
    // TODO: this.socket?.on('coach_disconnected', callback);
  }

  /**
   * Registers a callback for 'draft_completed' events.
   * Fired when the last pick is made. UI should show completion screen.
   *
   * TODO: Implement this method
   */
  onDraftCompleted(callback: (data: DraftCompletedPayload) => void): void {
    // TODO: this.socket?.on('draft_completed', callback);
  }

  /**
   * Registers a callback for 'error' events.
   * Fired when a server-side validation or rule check fails.
   * Only sent to the socket that caused the error (not broadcast).
   *
   * TODO: Implement this method
   */
  onError(callback: (data: ErrorPayload) => void): void {
    // TODO: this.socket?.on('error', callback);
  }

  /**
   * Registers a callback for socket connection events.
   * Useful for updating connectionStatus store in the UI.
   *
   * TODO: Implement this method
   */
  onConnect(callback: () => void): void {
    // TODO: this.socket?.on('connect', callback);
  }

  /**
   * Registers a callback for socket disconnection events.
   * Useful for updating connectionStatus store in the UI.
   *
   * TODO: Implement this method
   */
  onDisconnect(callback: (reason: string) => void): void {
    // TODO: this.socket?.on('disconnect', callback);
  }

  // ── Cleanup ─────────────────────────────────────────────

  /**
   * Removes all event listeners registered via on*() methods.
   * Called in onDestroy() after disconnect() to prevent memory leaks.
   *
   * Socket.io-client removes listeners automatically on disconnect,
   * but explicit cleanup is safer when the component remounts.
   *
   * TODO: Implement this method
   */
  removeAllListeners(): void {
    // TODO: this.socket?.removeAllListeners();
  }
}

// ── Singleton Export ──────────────────────────────────────────
/**
 * Singleton SocketClient instance shared across all components.
 * Import this directly in Svelte components:
 *   import { socketClient } from '$lib/socket';
 */
export const socketClient = new SocketClient();
