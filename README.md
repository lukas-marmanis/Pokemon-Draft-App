# Pokemon Draft League yo

A self-hosted real-time web app for competitive Pokemon VGC draft leagues. Commissioners run the server locally and share a tunneled URL with coaches, who then participate in a snake-style draft using point budgets.

## Features

- **Real-time snake draft** with live pick broadcasting to all coaches
- **Point budget system** - 400 points to draft 10 Pokemon
- **Automatic turn tracking** - server enforces correct pick order
- **Reconnection support** - coaches can rejoin without losing state
- **Export to Pokemon Showdown** - generate paste format for teambuilder
- **Zero hosting cost** - runs on commissioner's machine with tunneling

## Quick Start

### Option A: Docker (Recommended for Commissioners)

**Requirements**: Docker Desktop installed

```bash
# Clone the repo
git clone <repo-url>
cd pokemon-draft-league

# Start both server and client
docker-compose up --build

# In another terminal, start a tunnel for coaches to connect
npx ngrok http 3000
# Copy the https://xxx.ngrok.io URL - share this with coaches
```

Open http://localhost:5173 in your browser to test locally.

### Option B: Native Development (For Contributors)

**Requirements**: Node.js 18+, npm

**Terminal 1 - Backend**:
```bash
cd server
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
# Server running on http://localhost:3000
```

**Terminal 2 - Frontend**:
```bash
cd client
npm install
npm run dev
# Client running on http://localhost:5173
```

**Terminal 3 - Tunnel (Optional)**:
```bash
# Share with coaches (pick one):
npx ngrok http 3000
# OR
npx localtunnel --port 3000
```

## Project Structure

```
pokemon-draft-league/
├── server/                    # Backend: Node.js + Express + Socket.io
│   ├── src/
│   │   ├── index.ts           # App entry point
│   │   ├── websocket/         # Socket.io event handlers
│   │   ├── services/
│   │   │   ├── DraftService.ts    # Core draft logic (implement this!)
│   │   │   └── ExportService.ts   # Export formats
│   │   └── utils/
│   │       └── importPokemon.ts   # CSV/JSON import utilities
│   └── prisma/
│       └── schema.prisma      # Database schema (SQLite)
│
├── client/                    # Frontend: SvelteKit + Skeleton UI
│   └── src/
│       ├── routes/
│       │   ├── +page.svelte               # Home page
│       │   └── draft/[sessionId]/
│       │       └── +page.svelte           # Main draft page
│       └── lib/
│           ├── socket.ts                  # WebSocket client (implement this!)
│           ├── stores/
│           │   ├── draftStore.ts          # Session/pick state
│           │   └── pokemonStore.ts        # Pokemon pool + filters
│           └── components/
│               ├── DraftBoard.svelte      # Pokemon selection grid
│               ├── TurnIndicator.svelte   # Current turn display
│               ├── CoachRoster.svelte     # Coach's drafted team
│               └── PickHistory.svelte     # All picks timeline
│
├── shared/
│   └── types.ts               # Zod schemas + TypeScript types (complete!)
│
└── docker-compose.yml
```

## Implementation Guide

This repository contains **skeleton code** - function signatures and interfaces are defined, but the implementation logic has TODO comments. Follow this order:

### Phase 1: Core Server Logic

1. **`shared/types.ts`** - Already complete. Study the event contracts.

2. **`server/src/services/DraftService.ts`**:
   - `calculateNextDraftPosition()` - snake draft algorithm
   - `joinSession()` - coach join/reconnect logic
   - `submitPick()` - atomic pick validation + DB mutations
   - `getDraftState()` - full state snapshot for sync

3. **`server/src/websocket/index.ts`**:
   - `join_session` handler - validate, join, sync, broadcast
   - `submit_pick` handler - validate, submit, broadcast
   - `disconnect` handler - update connection status

4. **`server/src/index.ts`**:
   - Add CORS middleware
   - Add graceful shutdown

### Phase 2: Data Import

5. **`server/src/utils/importPokemon.ts`**:
   - `importPokemonFromCSV()` - read and insert from CSV
   - `importPokemonFromJSON()` - read and insert from JSON
   - `validatePokemonData()` - field validation

### Phase 3: Frontend State

6. **`client/src/lib/socket.ts`**:
   - `connect()` / `disconnect()`
   - `joinSession()` / `submitPick()` emitters
   - `onDraftStateSync()` / `onPickMade()` listeners

7. **`client/src/lib/stores/draftStore.ts`**:
   - Derived stores: `isMyTurn`, `currentTurnCoach`, `myPicks`, etc.

8. **`client/src/lib/stores/pokemonStore.ts`**:
   - `filteredPokemon` derived store (filter pipeline)

### Phase 4: UI Wiring

9. **`client/src/routes/draft/[sessionId]/+page.svelte`**:
   - Connect socket events to store updates in `onMount`

10. **UI Components** (DraftBoard, CoachRoster, PickHistory, TurnIndicator):
    - Already have visual structure; add reactive logic in `<script>` blocks

### Phase 5: Export

11. **`server/src/services/ExportService.ts`**:
    - `exportCoachToShowdown()` - Showdown paste format
    - `exportSessionToCSV()` - full draft CSV

## WebSocket Event Reference

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_session` | Client → Server | Join/rejoin a session |
| `submit_pick` | Client → Server | Draft a Pokemon |
| `draft_state_sync` | Server → Client | Full state snapshot |
| `pick_made` | Server → All | Pick was made |
| `coach_connected` | Server → All | Coach joined |
| `coach_disconnected` | Server → All | Coach left |
| `draft_completed` | Server → All | All picks done |
| `error` | Server → Client | Error occurred |

## Pokemon Tier System

| Tier | Points | Description |
|------|--------|-------------|
| S    | 100    | Top-tier threats |
| 1    | 80     | High-tier picks |
| 2    | 60     | Mid-high tier |
| 3    | 40     | Mid tier |
| 4    | 20     | Low-mid tier |
| 5    | 10     | Budget picks |

Each coach has 400 points to draft 10 Pokemon. The snake order ensures fairness over multiple rounds.

## Database Management

```bash
# View/edit data in browser GUI
cd server && npx prisma studio

# Reset database (delete all draft data)
rm server/prisma/draft.db && cd server && npx prisma db push

# Re-generate Prisma client after schema changes
cd server && npx prisma generate
```

## Troubleshooting

**Coaches can't connect**: Check that CORS `CLIENT_URL` matches where coaches are accessing the client from. For tunnel use, set `CLIENT_URL` to the tunnel URL.

**State out of sync**: The server broadcasts `draft_state_sync` on reconnect. If a coach sees stale data, they should refresh the page.

**Database errors**: Delete `server/prisma/draft.db` and run `npx prisma db push` to reset.

**Snake order wrong**: The `calculateNextDraftPosition()` method in DraftService controls this. Write unit tests to verify the algorithm.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/pick-timer`)
3. Implement your feature (follow the TODO comments as a guide)
4. Add tests for business logic in `server/src/services/__tests__/`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
