# Pokemon Draft League - MVP Implementation Guide

**Tech Stack**: TypeScript • Node.js/Express • Socket.io • Svelte/SvelteKit • SQLite/Prisma • Skeleton UI

---

## Project Setup

### Repository Initialization

**Directory Structure**:
```
pokemon-draft-league/
├── server/                 # Backend application
│   ├── src/
│   │   ├── index.ts       # Entry point, Express + Socket.io setup
│   │   ├── websocket/     # Socket.io event handlers
│   │   ├── models/        # Prisma client, database logic
│   │   ├── services/      # Business logic (draft validation, order calculation)
│   │   └── utils/         # Helpers (snake draft algorithm)
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── package.json
│   └── tsconfig.json
├── client/                # Frontend application
│   ├── src/
│   │   ├── routes/        # SvelteKit pages
│   │   ├── lib/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── stores/      # Svelte stores for state
│   │   │   └── socket.ts    # Socket.io client wrapper
│   │   └── app.html
│   ├── package.json
│   └── svelte.config.js
├── shared/                # Shared TypeScript types
│   └── types.ts           # Event payloads, database models
├── docker-compose.yml
├── .env.example
└── README.md
```

### Initial Dependencies

**Server** (`server/package.json`):
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "@prisma/client": "^5.8.0",
    "zod": "^3.22.4",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "prisma": "^5.8.0",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2"
  }
}
```

**Client** (`client/package.json`):
```json
{
  "dependencies": {
    "@sveltejs/kit": "^2.0.0",
    "svelte": "^4.2.8",
    "socket.io-client": "^4.6.1",
    "@skeletonlabs/skeleton": "^2.5.1",
    "@skeletonlabs/tw-plugin": "^0.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16"
  }
}
```

---

## Database Schema

### Prisma Schema Definition

**File**: `server/prisma/schema.prisma`

**Core Entities**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./draft.db"
}

model DraftSession {
  id                String   @id @default(uuid())
  name              String
  createdAt         DateTime @default(now())
  status            String   // 'setup' | 'active' | 'completed'
  pointBudget       Int      @default(400)
  totalCoaches      Int
  currentPickNumber Int      @default(0)
  
  coaches  Coach[]
  pokemon  Pokemon[]
  picks    Pick[]
}

model Coach {
  id              String  @id @default(uuid())
  sessionId       String
  name            String
  draftPosition   Int     // 1-24
  pointsRemaining Int
  isConnected     Boolean @default(false)
  
  session DraftSession @relation(fields: [sessionId], references: [id])
  picks   Pick[]
  
  @@unique([sessionId, draftPosition])
}

model Pokemon {
  id           String  @id @default(uuid())
  sessionId    String
  name         String
  tier         String
  points       Int
  types        String  // JSON array: ["Fire", "Flying"]
  spriteUrl    String?
  isDrafted    Boolean @default(false)
  
  session DraftSession @relation(fields: [sessionId], references: [id])
  picks   Pick[]
  
  @@unique([sessionId, name])
}

model Pick {
  id          String   @id @default(uuid())
  sessionId   String
  coachId     String
  pokemonId   String
  pickNumber  Int
  pointsSpent Int
  timestamp   DateTime @default(now())
  
  session  DraftSession @relation(fields: [sessionId], references: [id])
  coach    Coach        @relation(fields: [coachId], references: [id])
  pokemon  Pokemon      @relation(fields: [pokemonId], references: [id])
  
  @@unique([sessionId, pickNumber])
}
```

**Initialization Commands**:
```bash
cd server
npx prisma generate  # Generate Prisma client
npx prisma db push   # Create SQLite database
```

---

## Shared Type Definitions

### WebSocket Event Contracts

**File**: `shared/types.ts`

**Event Payloads** (leveraging Zod for runtime validation):
```typescript
import { z } from 'zod';

// ============ Client → Server Events ============

export const JoinSessionSchema = z.object({
  sessionId: z.string().uuid(),
  coachName: z.string().min(1).max(50),
});
export type JoinSessionPayload = z.infer<typeof JoinSessionSchema>;

export const SubmitPickSchema = z.object({
  coachId: z.string().uuid(),
  pokemonId: z.string().uuid(),
});
export type SubmitPickPayload = z.infer<typeof SubmitPickSchema>;

// ============ Server → Client Events ============

export interface DraftStateSync {
  session: {
    id: string;
    name: string;
    status: 'setup' | 'active' | 'completed';
    currentPickNumber: number;
  };
  coaches: Array<{
    id: string;
    name: string;
    draftPosition: number;
    pointsRemaining: number;
    isConnected: boolean;
  }>;
  picks: Array<{
    pickNumber: number;
    coachName: string;
    pokemonName: string;
    pointsSpent: number;
    timestamp: string;
  }>;
  currentTurn: {
    coachId: string;
    coachName: string;
    pickNumber: number;
  } | null;
}

export interface PickMadePayload {
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
    pickNumber: number;
  } | null;
}

export interface ErrorPayload {
  code: string;
  message: string;
  field?: string;
}

// ============ Domain Models ============

export interface PokemonData {
  name: string;
  tier: string;
  points: number;
  types: string[];
  spriteUrl?: string;
}
```

---

## Backend Implementation

### Server Initialization

**File**: `server/src/index.ts`

**Core Responsibilities**:
- Initialize Express HTTP server
- Attach Socket.io to HTTP server  
- Configure CORS for client origin
- Mount WebSocket event handlers
- Graceful shutdown on SIGTERM

**Conceptual Structure**:
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { registerWebSocketHandlers } from './websocket';

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }
});

const prisma = new PrismaClient();

// Mount WebSocket handlers
registerWebSocketHandlers(io, prisma);

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  httpServer.close();
});
```

---

### WebSocket Event Handlers

**File**: `server/src/websocket/index.ts`

**Handler Registration Pattern**:
```typescript
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { JoinSessionSchema, SubmitPickSchema } from '../../../shared/types';
import { DraftService } from '../services/DraftService';

export function registerWebSocketHandlers(io: Server, prisma: PrismaClient) {
  const draftService = new DraftService(prisma);
  
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Join session and associate socket with coach
    socket.on('join_session', async (payload) => {
      try {
        const validated = JoinSessionSchema.parse(payload);
        const coach = await draftService.joinSession(
          validated.sessionId,
          validated.coachName,
          socket.id
        );
        
        // Add socket to session room for broadcasting
        socket.join(validated.sessionId);
        
        // Send full state to joining coach
        const state = await draftService.getDraftState(validated.sessionId);
        socket.emit('draft_state_sync', state);
        
        // Notify others
        socket.to(validated.sessionId).emit('coach_connected', {
          coachId: coach.id,
          coachName: coach.name,
        });
        
      } catch (error) {
        socket.emit('error', {
          code: 'JOIN_FAILED',
          message: error.message,
        });
      }
    });
    
    // Submit draft pick
    socket.on('submit_pick', async (payload) => {
      try {
        const validated = SubmitPickSchema.parse(payload);
        const result = await draftService.submitPick(
          validated.coachId,
          validated.pokemonId
        );
        
        // Broadcast pick to all coaches in session
        io.to(result.sessionId).emit('pick_made', {
          pick: result.pick,
          nextCoach: result.nextCoach,
        });
        
      } catch (error) {
        socket.emit('error', {
          code: error.code || 'PICK_FAILED',
          message: error.message,
        });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      await draftService.handleDisconnect(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
```

---

### Draft Business Logic

**File**: `server/src/services/DraftService.ts`

**Core Responsibilities**:
- Validate pick legality (budget, uniqueness, turn order)
- Calculate snake draft order
- Persist picks atomically
- Generate state snapshots

**Critical Methods**:

**Snake Draft Order Algorithm**:
```typescript
/**
 * Calculates which coach should pick next in a snake draft.
 * 
 * Snake pattern: 1→N, N→1, 1→N, ...
 * Example (8 coaches): 1,2,3,4,5,6,7,8, 8,7,6,5,4,3,2,1, 1,2,3...
 */
private calculateNextCoach(
  currentPickNumber: number,
  totalCoaches: number
): number {
  const round = Math.floor((currentPickNumber - 1) / totalCoaches);
  const positionInRound = (currentPickNumber - 1) % totalCoaches;
  
  const isForwardRound = round % 2 === 0;
  return isForwardRound 
    ? positionInRound + 1           // Forward: 1→N
    : totalCoaches - positionInRound; // Reverse: N→1
}
```

**Pick Validation**:
```typescript
/**
 * Validates a pick against draft rules.
 * Throws descriptive errors for client display.
 */
private async validatePick(
  coachId: string,
  pokemonId: string,
  sessionId: string
): Promise<void> {
  const session = await this.getSession(sessionId);
  const coach = await this.getCoach(coachId);
  const pokemon = await this.getPokemon(pokemonId);
  
  // Verify turn order
  const expectedCoach = this.calculateNextCoach(
    session.currentPickNumber + 1,
    session.totalCoaches
  );
  if (coach.draftPosition !== expectedCoach) {
    throw new DraftError('NOT_YOUR_TURN', 'Wait for your turn');
  }
  
  // Verify pokemon availability
  if (pokemon.isDrafted) {
    throw new DraftError(
      'ALREADY_DRAFTED',
      `${pokemon.name} was already picked`
    );
  }
  
  // Verify point budget
  if (coach.pointsRemaining < pokemon.points) {
    throw new DraftError(
      'INSUFFICIENT_POINTS',
      `Need ${pokemon.points} points, have ${coach.pointsRemaining}`
    );
  }
}
```

**Atomic Pick Submission**:
```typescript
/**
 * Commits a pick to the database atomically.
 * Uses Prisma transaction to ensure consistency.
 */
async submitPick(coachId: string, pokemonId: string) {
  return await this.prisma.$transaction(async (tx) => {
    const coach = await tx.coach.findUnique({
      where: { id: coachId },
      include: { session: true },
    });
    
    await this.validatePick(coachId, pokemonId, coach.sessionId);
    
    const pokemon = await tx.pokemon.findUnique({
      where: { id: pokemonId },
    });
    
    // Create pick record
    const pick = await tx.pick.create({
      data: {
        sessionId: coach.sessionId,
        coachId,
        pokemonId,
        pickNumber: coach.session.currentPickNumber + 1,
        pointsSpent: pokemon.points,
      },
    });
    
    // Update coach points
    await tx.coach.update({
      where: { id: coachId },
      data: { pointsRemaining: coach.pointsRemaining - pokemon.points },
    });
    
    // Mark pokemon as drafted
    await tx.pokemon.update({
      where: { id: pokemonId },
      data: { isDrafted: true },
    });
    
    // Advance draft state
    const updatedSession = await tx.draftSession.update({
      where: { id: coach.sessionId },
      data: { currentPickNumber: { increment: 1 } },
    });
    
    // Calculate next coach
    const nextCoachPosition = this.calculateNextCoach(
      updatedSession.currentPickNumber + 1,
      updatedSession.totalCoaches
    );
    const nextCoach = await tx.coach.findFirst({
      where: {
        sessionId: coach.sessionId,
        draftPosition: nextCoachPosition,
      },
    });
    
    return {
      sessionId: coach.sessionId,
      pick: {
        pickNumber: pick.pickNumber,
        coachId: coach.id,
        coachName: coach.name,
        pokemonId: pokemon.id,
        pokemonName: pokemon.name,
        pointsSpent: pokemon.points,
      },
      nextCoach: nextCoach ? {
        id: nextCoach.id,
        name: nextCoach.name,
        pickNumber: updatedSession.currentPickNumber + 1,
      } : null,
    };
  });
}
```

---

### Pokemon Data Import

**File**: `server/src/utils/importPokemon.ts`

**CSV/JSON Import Strategy**:
```typescript
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

interface PokemonCSVRow {
  name: string;
  tier: string;
  points: string;
  type1: string;
  type2?: string;
  spriteUrl?: string;
}

/**
 * Imports Pokemon from CSV into a draft session.
 * Expected columns: name, tier, points, type1, type2, spriteUrl
 */
export async function importPokemonFromCSV(
  sessionId: string,
  filePath: string,
  prisma: PrismaClient
): Promise<void> {
  const fileContent = readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  }) as PokemonCSVRow[];
  
  const pokemonData = records.map(row => ({
    sessionId,
    name: row.name,
    tier: row.tier,
    points: parseInt(row.points, 10),
    types: JSON.stringify([row.type1, row.type2].filter(Boolean)),
    spriteUrl: row.spriteUrl || null,
  }));
  
  await prisma.pokemon.createMany({ data: pokemonData });
  console.log(`Imported ${pokemonData.length} Pokemon`);
}
```

**JSON Import Alternative**:
```typescript
/**
 * Imports from structured JSON format.
 * Example: { "pokemon": [ { "name": "Pikachu", ... }, ... ] }
 */
export async function importPokemonFromJSON(
  sessionId: string,
  filePath: string,
  prisma: PrismaClient
): Promise<void> {
  const fileContent = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);
  
  const pokemonData = data.pokemon.map(p => ({
    sessionId,
    name: p.name,
    tier: p.tier,
    points: p.points,
    types: JSON.stringify(p.types),
    spriteUrl: p.spriteUrl || null,
  }));
  
  await prisma.pokemon.createMany({ data: pokemonData });
}
```

---

## Frontend Implementation

### Socket.io Client Wrapper

**File**: `client/src/lib/socket.ts`

**Connection Management**:
```typescript
import { io, Socket } from 'socket.io-client';
import type { 
  DraftStateSync, 
  PickMadePayload, 
  ErrorPayload 
} from '../../../shared/types';

class SocketClient {
  private socket: Socket | null = null;
  
  connect(serverUrl: string): void {
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }
  
  // Type-safe event emitters
  joinSession(sessionId: string, coachName: string): void {
    this.socket?.emit('join_session', { sessionId, coachName });
  }
  
  submitPick(coachId: string, pokemonId: string): void {
    this.socket?.emit('submit_pick', { coachId, pokemonId });
  }
  
  // Type-safe event listeners
  onDraftStateSync(callback: (data: DraftStateSync) => void): void {
    this.socket?.on('draft_state_sync', callback);
  }
  
  onPickMade(callback: (data: PickMadePayload) => void): void {
    this.socket?.on('pick_made', callback);
  }
  
  onError(callback: (error: ErrorPayload) => void): void {
    this.socket?.on('error', callback);
  }
  
  disconnect(): void {
    this.socket?.disconnect();
  }
}

export const socketClient = new SocketClient();
```

---

### Svelte Stores for State Management

**File**: `client/src/lib/stores/draftStore.ts`

**Reactive State Container**:
```typescript
import { writable, derived } from 'svelte/store';
import type { DraftStateSync } from '../../../../shared/types';

// Raw draft state from server
export const draftState = writable<DraftStateSync | null>(null);

// Current user's coach ID (set after joining)
export const currentCoachId = writable<string | null>(null);

// Derived stores for computed values

export const currentCoach = derived(
  [draftState, currentCoachId],
  ([$draftState, $currentCoachId]) => {
    if (!$draftState || !$currentCoachId) return null;
    return $draftState.coaches.find(c => c.id === $currentCoachId);
  }
);

export const isMyTurn = derived(
  [draftState, currentCoachId],
  ([$draftState, $currentCoachId]) => {
    if (!$draftState?.currentTurn || !$currentCoachId) return false;
    return $draftState.currentTurn.coachId === $currentCoachId;
  }
);

export const availablePokemon = derived(
  draftState,
  ($draftState) => {
    if (!$draftState) return [];
    // Filter out already-picked Pokemon based on pick history
    const draftedNames = new Set($draftState.picks.map(p => p.pokemonName));
    // This would be populated from a separate pokemon list store
    // For now, conceptual placeholder
    return [];
  }
);
```

**File**: `client/src/lib/stores/pokemonStore.ts`

**Pokemon List State**:
```typescript
import { writable, derived } from 'svelte/store';
import type { PokemonData } from '../../../../shared/types';

export const allPokemon = writable<PokemonData[]>([]);
export const searchFilter = writable<string>('');
export const tierFilter = writable<string>('all');

export const filteredPokemon = derived(
  [allPokemon, searchFilter, tierFilter],
  ([$allPokemon, $searchFilter, $tierFilter]) => {
    return $allPokemon.filter(p => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes($searchFilter.toLowerCase());
      const matchesTier = $tierFilter === 'all' || p.tier === $tierFilter;
      return matchesSearch && matchesTier;
    });
  }
);
```

---

### Core UI Components

**File**: `client/src/lib/components/DraftBoard.svelte`

**Pokemon Grid Display**:
```svelte
<script lang="ts">
  import { filteredPokemon } from '$lib/stores/pokemonStore';
  import { currentCoach, isMyTurn } from '$lib/stores/draftStore';
  import { socketClient } from '$lib/socket';
  
  function handlePokemonClick(pokemonId: string) {
    if (!$isMyTurn) {
      alert('Not your turn!');
      return;
    }
    
    if (!$currentCoach) return;
    
    socketClient.submitPick($currentCoach.id, pokemonId);
  }
</script>

<div class="grid grid-cols-4 gap-4 p-4">
  {#each $filteredPokemon as pokemon}
    <button
      class="card p-4 hover:variant-soft-primary"
      class:opacity-50={pokemon.isDrafted}
      disabled={pokemon.isDrafted || !$isMyTurn}
      on:click={() => handlePokemonClick(pokemon.id)}
    >
      {#if pokemon.spriteUrl}
        <img src={pokemon.spriteUrl} alt={pokemon.name} class="w-24 h-24 mx-auto" />
      {/if}
      <h3 class="h4">{pokemon.name}</h3>
      <p class="text-sm">Tier: {pokemon.tier} | {pokemon.points} pts</p>
      <div class="flex gap-1 mt-2">
        {#each pokemon.types as type}
          <span class="badge variant-filled-surface">{type}</span>
        {/each}
      </div>
    </button>
  {/each}
</div>
```

**File**: `client/src/lib/components/CoachRoster.svelte`

**Personal Team Display**:
```svelte
<script lang="ts">
  import { draftState, currentCoach } from '$lib/stores/draftStore';
  
  $: myPicks = $draftState?.picks.filter(
    p => p.coachName === $currentCoach?.name
  ) || [];
</script>

<div class="card p-6">
  <header class="card-header">
    <h2 class="h2">{$currentCoach?.name}'s Team</h2>
    <p class="text-surface-600">
      Points Remaining: {$currentCoach?.pointsRemaining} / 400
    </p>
  </header>
  
  <section class="p-4">
    {#if myPicks.length === 0}
      <p class="text-surface-500">No picks yet</p>
    {:else}
      <ol class="list-decimal list-inside space-y-2">
        {#each myPicks as pick}
          <li>
            <strong>{pick.pokemonName}</strong> 
            <span class="text-sm text-surface-600">
              ({pick.pointsSpent} pts)
            </span>
          </li>
        {/each}
      </ol>
    {/if}
  </section>
</div>
```

**File**: `client/src/lib/components/PickHistory.svelte`

**Timeline of All Picks**:
```svelte
<script lang="ts">
  import { draftState } from '$lib/stores/draftStore';
</script>

<div class="card p-6 max-h-96 overflow-y-auto">
  <header class="card-header">
    <h2 class="h3">Pick History</h2>
  </header>
  
  <section class="p-4">
    <ol class="list space-y-3">
      {#each $draftState?.picks || [] as pick}
        <li class="flex justify-between items-center">
          <span class="badge variant-filled-primary">#{pick.pickNumber}</span>
          <span class="flex-1 ml-4">
            <strong>{pick.coachName}</strong> picked 
            <strong>{pick.pokemonName}</strong>
          </span>
          <span class="text-sm text-surface-600">
            {pick.pointsSpent} pts
          </span>
        </li>
      {/each}
    </ol>
  </section>
</div>
```

**File**: `client/src/lib/components/TurnIndicator.svelte`

**Current Turn Display**:
```svelte
<script lang="ts">
  import { draftState, isMyTurn } from '$lib/stores/draftStore';
</script>

<div class="card p-4 variant-filled-surface">
  {#if $draftState?.currentTurn}
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-surface-600">Pick #{$draftState.currentTurn.pickNumber}</p>
        <h3 class="h3">
          {$isMyTurn ? 'Your Turn!' : `${$draftState.currentTurn.coachName}'s Turn`}
        </h3>
      </div>
      
      {#if $isMyTurn}
        <div class="badge variant-filled-warning animate-pulse">
          Make your pick
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-surface-600">Draft not started</p>
  {/if}
</div>
```

---

### Main Draft Page

**File**: `client/src/routes/draft/[sessionId]/+page.svelte`

**Layout Composition**:
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { socketClient } from '$lib/socket';
  import { draftState, currentCoachId } from '$lib/stores/draftStore';
  import DraftBoard from '$lib/components/DraftBoard.svelte';
  import CoachRoster from '$lib/components/CoachRoster.svelte';
  import PickHistory from '$lib/components/PickHistory.svelte';
  import TurnIndicator from '$lib/components/TurnIndicator.svelte';
  
  const sessionId = $page.params.sessionId;
  let coachName = '';
  let hasJoined = false;
  
  onMount(() => {
    socketClient.connect('http://localhost:3000');
    
    socketClient.onDraftStateSync((data) => {
      draftState.set(data);
    });
    
    socketClient.onPickMade((data) => {
      // Update state optimistically
      draftState.update(state => {
        if (!state) return state;
        return {
          ...state,
          picks: [...state.picks, data.pick],
          currentTurn: data.nextCoach,
        };
      });
    });
    
    socketClient.onError((error) => {
      alert(error.message);
    });
  });
  
  onDestroy(() => {
    socketClient.disconnect();
  });
  
  function joinSession() {
    socketClient.joinSession(sessionId, coachName);
    hasJoined = true;
    // In production, server would return coach ID
  }
</script>

{#if !hasJoined}
  <div class="container mx-auto p-8">
    <div class="card p-8 max-w-md mx-auto">
      <h1 class="h1">Join Draft</h1>
      <input
        type="text"
        class="input mt-4"
        placeholder="Enter your name"
        bind:value={coachName}
      />
      <button 
        class="btn variant-filled-primary mt-4 w-full"
        on:click={joinSession}
      >
        Join Session
      </button>
    </div>
  </div>
{:else}
  <div class="container mx-auto p-4">
    <TurnIndicator />
    
    <div class="grid grid-cols-3 gap-4 mt-4">
      <div class="col-span-2">
        <DraftBoard />
      </div>
      
      <div class="space-y-4">
        <CoachRoster />
        <PickHistory />
      </div>
    </div>
  </div>
{/if}
```

---

## Export Functionality

### Showdown Format Export

**File**: `server/src/services/ExportService.ts`

**Pokemon Showdown Team Format**:
```typescript
/**
 * Exports a coach's roster in Showdown team format.
 * Format: "Pokemon @ Item | Ability | Moves | EVs | Nature"
 * 
 * For draft purposes, we only export the Pokemon names.
 * Coaches will set movesets/items manually.
 */
export async function exportToShowdown(
  coachId: string,
  prisma: PrismaClient
): Promise<string> {
  const picks = await prisma.pick.findMany({
    where: { coachId },
    include: { pokemon: true },
    orderBy: { pickNumber: 'asc' },
  });
  
  return picks
    .map(pick => `${pick.pokemon.name} @ Leftovers\nAbility: TBD\n`)
    .join('\n');
}
```

### CSV Export

**Roster Export for Spreadsheets**:
```typescript
/**
 * Exports full draft results as CSV.
 * Columns: Pick #, Coach, Pokemon, Points, Tier
 */
export async function exportToCSV(
  sessionId: string,
  prisma: PrismaClient
): Promise<string> {
  const picks = await prisma.pick.findMany({
    where: { sessionId },
    include: { coach: true, pokemon: true },
    orderBy: { pickNumber: 'asc' },
  });
  
  const header = 'Pick,Coach,Pokemon,Points,Tier\n';
  const rows = picks.map(pick => 
    `${pick.pickNumber},${pick.coach.name},${pick.pokemon.name},${pick.pointsSpent},${pick.pokemon.tier}`
  ).join('\n');
  
  return header + rows;
}
```

---

## Development Workflow

### Running the Application

**Terminal 1 - Backend**:
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run dev  # Uses tsx/nodemon for hot reload
```

**Terminal 2 - Frontend**:
```bash
cd client
npm install
npm run dev  # Vite dev server on localhost:5173
```

**Terminal 3 - Tunnel (Optional)**:
```bash
npx ngrok http 3000
# Copy public URL and share with coaches
```

### Environment Configuration

**File**: `server/.env`
```env
DATABASE_URL="file:./prisma/draft.db"
PORT=3000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

**File**: `client/.env`
```env
VITE_API_URL="http://localhost:3000"
```

---

## Testing Strategy

### Unit Tests

**Backend** (using Vitest):
```typescript
// server/src/services/__tests__/DraftService.test.ts

describe('DraftService', () => {
  describe('calculateNextCoach', () => {
    it('should follow snake pattern for 8 coaches', () => {
      const service = new DraftService(mockPrisma);
      
      // Round 1: Forward (1-8)
      expect(service['calculateNextCoach'](1, 8)).toBe(1);
      expect(service['calculateNextCoach'](8, 8)).toBe(8);
      
      // Round 2: Reverse (8-1)
      expect(service['calculateNextCoach'](9, 8)).toBe(8);
      expect(service['calculateNextCoach'](16, 8)).toBe(1);
      
      // Round 3: Forward again
      expect(service['calculateNextCoach'](17, 8)).toBe(1);
    });
  });
  
  describe('validatePick', () => {
    it('should reject pick if not coach turn', async () => {
      // Setup mock data where Coach 2 tries to pick on Coach 1's turn
      await expect(
        service.submitPick(coach2Id, pokemonId)
      ).rejects.toThrow('NOT_YOUR_TURN');
    });
    
    it('should reject if insufficient points', async () => {
      // Coach has 50 points, tries to draft 120-point Pokemon
      await expect(
        service.submitPick(coachId, expensivePokemonId)
      ).rejects.toThrow('INSUFFICIENT_POINTS');
    });
  });
});
```

### Integration Tests

**Full Draft Simulation**:
```typescript
describe('Full Draft Flow', () => {
  it('should complete 8-coach, 80-pick draft', async () => {
    const session = await createTestSession(8);
    const coaches = await createTestCoaches(session.id, 8);
    const pokemon = await seedTestPokemon(session.id, 80);
    
    // Simulate all 80 picks
    for (let pickNum = 1; pickNum <= 80; pickNum++) {
      const expectedCoachPosition = calculateExpectedCoach(pickNum, 8);
      const coach = coaches.find(c => c.draftPosition === expectedCoachPosition);
      const availablePokemon = pokemon.find(p => !p.isDrafted);
      
      await draftService.submitPick(coach.id, availablePokemon.id);
    }
    
    // Verify final state
    const finalPicks = await prisma.pick.count({ where: { sessionId: session.id } });
    expect(finalPicks).toBe(80);
    
    // Each coach should have 10 Pokemon
    for (const coach of coaches) {
      const coachPicks = await prisma.pick.count({ where: { coachId: coach.id } });
      expect(coachPicks).toBe(10);
    }
  });
});
```

---

## Deployment Checklist

### Docker Configuration

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  server:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/data/draft.db
      - NODE_ENV=production
    volumes:
      - draft-data:/data
    command: npm start
  
  client:
    build: ./client
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000
    depends_on:
      - server

volumes:
  draft-data:
```

### Production Build

**Server Dockerfile**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Client Dockerfile**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

### Launch Commands

**One-Command Startup**:
```bash
docker-compose up --build
```

**Output**:
```
server_1  | ✓ Server running on http://localhost:3000
client_1  | ✓ Client running on http://localhost:5173
server_1  | ✓ Connect coaches to: https://abc123.ngrok.io
```

---

## Next Steps After MVP

1. **Tier Enforcement**: Add validation for required tier picks (S, 1, 2, 3, 4, 5)
2. **Pick Timer**: Implement countdown with auto-skip functionality
3. **Admin Panel**: Undo picks, pause/resume draft, adjust settings
4. **Persistent Sessions**: Save/load draft state across server restarts
5. **Mobile Optimization**: Improve responsive design for phone screens
6. **Draft Replay**: Visualize pick-by-pick history with animations

---

## Troubleshooting

**WebSocket Connection Fails**:
- Verify CORS settings in server/src/index.ts
- Check firewall rules allow port 3000
- Confirm client VITE_API_URL matches server address

**Database Errors**:
- Delete `prisma/draft.db` and run `npx prisma db push` to reset
- Check file permissions on SQLite database
- Verify Prisma schema matches expected types

**Coaches See Stale Data**:
- Ensure Socket.io rooms are joined correctly (`socket.join(sessionId)`)
- Check broadcast targets (`io.to(sessionId).emit()` not `socket.emit()`)
- Verify optimistic UI updates in client stores

**Snake Draft Order Incorrect**:
- Validate `calculateNextCoach` algorithm with unit tests
- Confirm `draftPosition` values are 1-indexed (not 0-indexed)
- Check `currentPickNumber` increments correctly

---

*This guide provides the technical foundation for implementing the Pokemon Draft League MVP. Each section can be expanded with additional error handling, logging, and optimization as the project matures.*
