/**
 * server/src/index.ts
 * ───────────────────────────────────────────────────────────
 * Application entry point.
 *
 * Responsibilities:
 *  1. Load environment variables from .env
 *  2. Create an Express HTTP server
 *  3. Attach Socket.io to the HTTP server
 *  4. Configure middleware (CORS, JSON body parsing)
 *  5. Mount REST health-check endpoint
 *  6. Register all WebSocket event handlers
 *  7. Start listening on PORT
 *  8. Handle graceful shutdown (SIGTERM / SIGINT)
 *
 * Architecture note:
 *  Express handles only ancillary HTTP (health check, future admin API).
 *  All real-time communication is through Socket.io WebSocket connections.
 *  Prisma client is created once here and injected into handlers.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { registerWebSocketHandlers } from './websocket';

// ── Environment ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Express App ───────────────────────────────────────────────
const app = express();

// TODO: Configure middleware
//   - cors({ origin: CLIENT_URL }) → allow WebSocket/HTTP from frontend
//   - express.json() → parse JSON request bodies for future REST endpoints
//   - Optionally add express-rate-limit for IP-level rate limiting

// ── HTTP Server ───────────────────────────────────────────────
// Socket.io requires wrapping Express in a raw http.Server
const httpServer = createServer(app);

// ── Socket.io Server ──────────────────────────────────────────
// TODO: Configure Socket.io options:
//   - cors.origin: CLIENT_URL (or array of allowed origins)
//   - cors.methods: ['GET', 'POST']
//   - pingTimeout / pingInterval: tweak for connection health
//   - maxHttpBufferSize: limit WebSocket payload size
const io = new SocketServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  // TODO: Consider adding connection state recovery:
  // connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
});

// ── Prisma Client ─────────────────────────────────────────────
// Single Prisma instance shared across all request handlers.
// Prisma manages its own connection pool internally.
const prisma = new PrismaClient({
  // TODO: Configure Prisma log levels for debugging:
  // log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

// ── REST Routes ───────────────────────────────────────────────

/**
 * GET /health
 * Simple liveness probe for Docker health checks and monitoring.
 * TODO: Extend to verify database connectivity:
 *   - await prisma.$queryRaw`SELECT 1`
 *   - Return DB status in response body
 */
app.get('/health', (_req: Request, res: Response) => {
  // TODO: Implement health check
  //   1. Query database with SELECT 1 to verify connectivity
  //   2. Return { status: 'ok', db: 'connected', uptime: process.uptime() }
  //   3. Return 503 if database unreachable
  res.json({ status: 'ok' });
});

// TODO: Add admin REST endpoints (future scope):
//   POST /api/sessions        → create a new draft session
//   GET  /api/sessions/:id    → fetch session details
//   POST /api/sessions/:id/start → transition session to 'active'
//   GET  /api/sessions/:id/export → download CSV/Showdown export

// ── WebSocket Handlers ────────────────────────────────────────
// Delegates all socket event handling to the websocket module.
// Pass `io` for broadcasting and `prisma` for database access.
registerWebSocketHandlers(io, prisma);

// ── Start Server ──────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket accepting connections from ${CLIENT_URL}`);
  console.log(`🔍 Prisma Studio: run "npx prisma studio" to inspect database`);
});

// ── Graceful Shutdown ─────────────────────────────────────────
/**
 * TODO: Implement graceful shutdown handler
 * On SIGTERM (Docker stop) or SIGINT (Ctrl+C):
 *   1. Stop accepting new WebSocket connections
 *   2. Broadcast 'server_shutdown' event to all connected clients
 *   3. Wait for in-flight database transactions to complete
 *   4. Disconnect Prisma client (flushes connection pool)
 *   5. Close HTTP server
 *   6. Exit with code 0
 */
async function shutdown(): Promise<void> {
  // TODO: Implement shutdown sequence
  console.log('Shutting down server...');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
