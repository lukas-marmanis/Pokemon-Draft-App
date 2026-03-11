# Pokemon Draft League - Context for AI Assistants

## What This Project Does

Self-hosted real-time web app for Pokemon VGC draft leagues. Commissioners run the server locally (tunneled to public URL), coaches connect via browser to draft unique teams with point budgets in snake-style order.

**Tech Stack**: TypeScript, Bun, Express, Socket.io, Svelte/SvelteKit, SQLite/Prisma, Tailwind/Skeleton UI

## Project Structure

```
pokemon-draft-league/
├── server/              # Backend: WebSocket handlers, validation, DB
│   ├── src/
│   │   ├── index.ts           # Express + Socket.io setup
│   │   ├── websocket/         # Event handlers
│   │   ├── services/          # DraftService, ExportService
│   │   └── utils/             # Snake draft algorithm
│   └── prisma/schema.prisma   # Database schema
├── client/              # Frontend: Svelte SPA
│   ├── src/routes/            # SvelteKit pages
│   └── src/lib/
│       ├── components/        # UI components
│       ├── stores/            # State management
│       └── socket.ts          # WebSocket client
└── shared/types.ts      # Zod schemas + TypeScript types
```

## Key Domain Concepts

**Snake Draft**: Pick order alternates direction each round. For 8 coaches: picks 1-8 forward (1→8), picks 9-16 reverse (8→1), picks 17-24 forward (1→8).

**Point Budget**: Coaches have 400 points to draft 10 Pokemon. Pokemon cost varies by tier (S1=-100pts, T1=180pts, T5=40pts).

**Validation**: All picks validated server-side via Prisma transactions. Turn order, uniqueness, budget, and availability checked atomically.

## Development

**Run locally**:
- Backend: `cd server && bun install && bunx prisma generate && bun run dev` (port 3000)
- Frontend: `cd client && bun install && bun run dev` (port 5173)
- Both: `docker-compose up --build`
- Type check: `cd server && bun run typecheck`

**Database**: SQLite file at `server/prisma/draft.db`. Reset with `cd server && bun run db:reset`.

## Architecture Patterns

**WebSocket Events**: Client emits `join_session`, `submit_pick`. Server broadcasts `draft_state_sync`, `pick_made`, `error`.

**State Management**: Svelte stores (draftStore, pokemonStore) consume WebSocket events. Server is canonical source of truth.

**Transactions**: All state mutations wrapped in `prisma.$transaction()` to prevent race conditions.

**Type Safety**: Zod schemas in `shared/types.ts` provide runtime validation + TypeScript inference.

## Additional Documentation

For detailed info on specific topics, see:
- `PROJECT_OVERVIEW.md` - High-level architecture and tech decisions
- `mvp-implementation-guide.md` - Detailed implementation patterns
- `/mnt/project/*.pdf` - PUCL/Smogon draft league rules and formats

For codebase exploration, check:
- `server/src/services/DraftService.ts` - Core business logic
- `server/prisma/schema.prisma` - Database entities
- `client/src/lib/stores/` - Frontend state management
- `shared/types.ts` - Event contracts
