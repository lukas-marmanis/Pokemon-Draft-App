# Pokemon Draft League - Project Overview

## What is This?

A self-hosted web application that facilitates Pokemon VGC Draft League tournaments. Commissioners run the server on their personal computer, share a URL with coaches, and manage live snake-style drafts where 8-24 players build unique Pokemon teams within point budgets and tier constraints.

**Key Differentiator**: Zero recurring costs. No cloud hosting required. Runs locally with global access via tunneling.

---

## Problem Being Solved

Draft leagues currently rely on manual coordination through Google Sheets and Discord. This creates friction:
- Manual turn tracking prone to errors
- No real-time validation of picks
- Budget calculations done by hand
- Difficult to resume interrupted drafts
- No automated export to Pokemon Showdown

This application automates the entire drafting process with instant validation, real-time updates, and persistent state.

---

## Target Users

**Primary**: Draft league commissioners who need to run tournaments
**Secondary**: Individual coaches participating in drafts
**Experience Level**: Commissioners should be comfortable running terminal commands or Docker. Coaches only need a web browser.

---

## System Architecture

### Deployment Model: Local-Hosted with Global Access

**Commissioner's Computer**:
- Runs backend server (Node.js process)
- Stores draft data in local SQLite file
- Uses tunneling service to get public URL

**Remote Coaches**:
- Connect via web browser to public URL
- No installation required
- Real-time updates via WebSocket

**Data Flow**:
```
Coach Browser ←→ Public URL (ngrok/localtunnel) ←→ Commissioner's PC ←→ SQLite
```

### Why This Approach?

**Advantages**:
- Zero hosting costs (no AWS/Heroku bills)
- Complete data ownership (database file stays on commissioner's machine)
- No vendor lock-in
- Privacy-preserving (draft data never uploaded to cloud)
- Simple backup (copy .db file)

**Trade-offs**:
- Commissioner's computer must stay on during draft (typically 2-3 hours)
- If commissioner's internet drops, draft pauses until reconnection
- Limited to single concurrent draft per server instance

---

## Technology Stack Decisions

### Backend: Node.js + Express + Socket.io

**Why Node.js**:
- Single language (JavaScript/TypeScript) across frontend and backend reduces context switching
- Excellent async I/O for handling 24 concurrent WebSocket connections
- Mature ecosystem with battle-tested libraries
- Works on Windows/Mac/Linux without modification
- Easy for contributors to set up (just `npm install`)

**Why Express**:
- Minimal, unopinionated framework
- Industry standard (large community for support)
- Only needed for health check endpoints; Socket.io handles most traffic

**Why Socket.io**:
- Automatic fallback to long-polling if WebSocket blocked by firewall
- Built-in reconnection logic with exponential backoff
- Room-based broadcasting (efficient for multi-coach updates)
- Better than raw WebSocket for resilience in varied network conditions

**Alternatives Considered**:
- Python + FastAPI: Good choice but WebSocket support less mature; virtual environments add setup complexity
- Rust: Overkill for this scale; steep learning curve hurts community contributions

---

### Frontend: Svelte + SvelteKit

**Why Svelte**:
- Smallest bundle size among major frameworks (~50KB vs React's ~150KB)
- Reactive state management built-in (no Redux/MobX needed)
- Compiles to vanilla JS (no runtime overhead)
- Gentle learning curve for contributors
- Less boilerplate than React/Vue

**Why SvelteKit**:
- File-based routing (intuitive project structure)
- Excellent developer experience with Vite (instant HMR)
- Built-in TypeScript support
- SSR capabilities (not used in MVP but available for future SEO needs)

**Alternatives Considered**:
- React: Larger bundle, more verbose, but bigger community
- Vue: Good middle ground but Svelte's reactivity is cleaner for real-time apps
- Vanilla JS: Too much manual DOM manipulation for complex state

---

### Database: SQLite + Prisma

**Why SQLite**:
- Zero configuration (no separate installation)
- Single file database (easy backup/sharing)
- Sufficient for 24 concurrent connections
- Portable across platforms
- Transactions are fast enough for draft picks (< 10ms typical)

**Why Prisma ORM**:
- Type-safe database access (compile-time errors for invalid queries)
- Automatic migration generation
- Prisma Studio provides GUI for debugging database
- Excellent TypeScript integration
- Prevents SQL injection by default

**Why Not PostgreSQL/MySQL**:
- Requires separate database server installation
- Overkill for local hosting use case
- Adds complexity for commissioners to set up

**Why Not JSON File Storage**:
- No ACID guarantees (risk of data corruption)
- Race conditions on concurrent writes
- No query optimization
- Not production-ready

---

### Real-Time Communication: WebSocket via Socket.io

**Requirements**:
- Coaches see picks instantly (< 100ms latency)
- Server broadcasts to all coaches simultaneously
- Automatic reconnection when network hiccups
- State synchronization after reconnects

**Why Socket.io Over Native WebSocket**:
- Automatic reconnection with exponential backoff
- Graceful degradation to HTTP long-polling
- Built-in heartbeat/ping-pong for connection health
- Room-based messaging (isolate draft sessions)

**Event-Driven Architecture**:
- Client emits: `join_session`, `submit_pick`
- Server broadcasts: `draft_state_sync`, `pick_made`, `coach_connected`
- Type-safe with Zod schemas shared between client/server

---

### Validation: Zod

**Why Zod**:
- Runtime validation for untrusted WebSocket payloads
- TypeScript type inference (DRY: schemas = types)
- Composable validators (reuse schemas)
- Excellent error messages for debugging
- Works on both client and server (shared validation logic)

**Alternative**: Joi (no TypeScript inference), Yup (less ergonomic API)

---

### UI Framework: Skeleton UI + Tailwind CSS

**Why Skeleton UI**:
- Designed specifically for Svelte
- Pre-built components (cards, modals, buttons) save development time
- Accessible by default (ARIA attributes)
- Themeable with CSS variables
- Not as heavy as Material UI or Chakra

**Why Tailwind CSS**:
- Utility-first approach (fast prototyping)
- No CSS file organization needed
- Small production bundle (only used utilities shipped)
- Consistent design system via configuration

**Alternatives Considered**:
- shadcn/ui: React-only
- DaisyUI: Good alternative to Skeleton
- Custom CSS: Time-consuming, harder to maintain

---

### Tunneling: ngrok with localtunnel Fallback

**Why Tunneling Services**:
- Exposes localhost to internet without port forwarding
- Provides HTTPS (required for WebSocket over public internet)
- Works behind CGNAT, university networks, corporate firewalls
- No router configuration needed

**Why ngrok**:
- Most reliable service (99.9% uptime)
- Clean, predictable URLs
- Web inspection interface for debugging
- Free tier sufficient for most drafts

**Why localtunnel as Fallback**:
- Completely open-source
- No account required
- Works with `npx` (zero installation)
- Backup if ngrok down or rate-limited

**Alternative**: Port forwarding (manual, environment-dependent, exposes IP address)

---

### Language: TypeScript

**Why TypeScript**:
- Catch bugs at compile-time (e.g., invalid event payload structure)
- Better IDE autocomplete/intellisense
- Self-documenting code (types = inline documentation)
- Safer refactoring (compiler catches breaking changes)
- Industry standard for modern web projects

**Why Not JavaScript**:
- Runtime errors more common
- Harder to onboard contributors (no type hints)
- Easier to introduce subtle bugs (wrong property names, type mismatches)

---

### Containerization: Docker (Optional)

**Why Docker**:
- One-command startup (`docker-compose up`)
- Consistent environment across Windows/Mac/Linux
- Bundles all dependencies (Node, SQLite, etc.)
- Simplifies distribution for non-technical commissioners

**Why Optional**:
- ~400MB download for Docker Desktop
- Not all commissioners comfortable with containers
- Native installation (npm) works fine for developers

**Approach**: Provide both options. Docker for ease-of-use, native for contributors.

---

## Data Model

### Core Entities

**DraftSession**:
- Represents one tournament draft
- Tracks current pick number, total coaches, point budget
- Lifecycle: setup → active → completed

**Coach**:
- Individual drafter (tied to session)
- Has draft position (1-24 for snake order)
- Tracks points remaining, connection status

**Pokemon**:
- Pool of draftable Pokemon (imported from CSV/JSON)
- Has name, tier, point value, types
- Flagged as drafted once picked

**Pick**:
- Join table linking Coach + Pokemon
- Stores pick number, points spent, timestamp
- Ordered sequence creates draft history

### Key Relationships

- Session has many Coaches, Pokemon, Picks
- Coach has many Picks (their drafted team)
- Pokemon has one Pick (if drafted)
- Picks reference Coach and Pokemon

---

## Critical Algorithms

### Snake Draft Order Calculation

**Goal**: Determine which coach should pick for a given pick number.

**Pattern**: Forward → Reverse → Forward → Reverse...

**Example** (8 coaches, 80 picks total):
```
Picks 1-8:   Coach 1, 2, 3, 4, 5, 6, 7, 8
Picks 9-16:  Coach 8, 7, 6, 5, 4, 3, 2, 1
Picks 17-24: Coach 1, 2, 3, 4, 5, 6, 7, 8
```

**Implementation Concept**:
- Calculate which round we're in (pick number ÷ total coaches)
- Calculate position within that round (pick number % total coaches)
- If even round: forward order, if odd round: reverse order

---

### Pick Validation

**Multi-Stage Validation**:

**Stage 1 - Schema Validation** (Zod):
- Payload structure correct?
- Required fields present?
- Types match expectations?

**Stage 2 - Business Rules**:
- Is it this coach's turn?
- Is the Pokemon still available?
- Does coach have sufficient points?
- (Future) Tier requirements met?

**Stage 3 - Atomicity**:
- Wrap all state changes in database transaction
- If any step fails, rollback entire operation
- Prevents partial state corruption

---

### State Synchronization

**Challenge**: Coaches disconnect/reconnect mid-draft. How to keep them in sync?

**Solution**:
- Server maintains canonical state in database
- On reconnect, send full state snapshot (`draft_state_sync` event)
- Client merges snapshot with any optimistic local updates
- Exponential backoff for reconnection attempts (1s, 2s, 4s, 8s, 16s, 30s max)

---

## Security Model

### Threat Model

**Primary Concern**: Malicious coach sends fake WebSocket messages
**Secondary Concern**: Unauthorized access to draft session

### Mitigations

**Server-Side Validation**:
- Never trust client input
- All business logic validated server-side
- Client UI is convenience only (easily bypassed)

**Session Tokens** (MVP):
- Each coach gets unique URL with token
- Server maps token → coach identity
- Simple but sufficient for trusted groups

**Future Authentication**:
- Discord OAuth integration
- Pre-register coaches in admin panel
- More suitable for public tournaments

**Rate Limiting**:
- Max 1 pick per coach per 3 seconds
- Max 100 requests per IP per minute
- Prevents spam/DoS attacks

---

## Performance Characteristics

### Expected Load

**Typical Draft**:
- 8-24 coaches
- 80-240 total picks
- 2-3 hour duration
- 1 pick every ~30 seconds (if no timer)

**WebSocket Connections**:
- 24 concurrent connections easily handled by Node.js
- ~1KB per pick broadcast × 24 coaches = 24KB network traffic per pick
- Negligible CPU/memory usage

### Bottlenecks (None Expected at This Scale)

**Database**:
- SQLite write speed: ~1000 transactions/second
- Draft picks: ~1 transaction every 30 seconds
- 0.003% of SQLite capacity used

**Network**:
- Tunnel latency adds ~50-100ms overhead
- Acceptable for turn-based drafting
- Not suitable for real-time gaming (but this isn't that)

---

## Development Workflow

### Local Development

**Three Terminal Windows**:
1. Backend server (port 3000): hot reload with nodemon
2. Frontend dev server (port 5173): Vite HMR
3. Tunnel service (optional): ngrok or localtunnel

**Testing**:
- Open multiple browser tabs to simulate coaches
- Use Prisma Studio to inspect database state
- Socket.io admin UI for debugging WebSocket connections

### Production Build

**Docker Compose**:
- Single command: `docker-compose up --build`
- Builds backend + frontend containers
- Creates shared volume for SQLite database
- Exposes ports for access

**Output**:
- Server running on localhost:3000
- Client accessible at localhost:5173
- Tunnel URL displayed in console (share with coaches)

---

## Future Architecture Considerations

### If Cloud Hosting Required

**Changes Needed**:
- Swap SQLite → PostgreSQL (multi-writer support)
- Add Redis for session state (horizontal scaling)
- Implement load balancer for multiple server instances
- Use managed WebSocket service (AWS API Gateway WebSocket)

**Cost Implications**:
- Small Postgres instance: ~$10/month
- Redis cache: ~$5/month
- Server hosting: ~$10/month
- Total: ~$25/month vs current $0/month

### If Desktop App Desired

**Electron Wrapper**:
- Bundle backend + frontend in single .exe/.app
- Embed ngrok binary for automatic tunneling
- One-click startup for commissioners
- Larger download (~200MB) but simpler UX

---

## Testing Strategy

### Unit Tests

**Backend**:
- Snake draft algorithm correctness
- Pick validation logic
- Zod schema parsing

**Frontend**:
- Svelte component rendering
- Store derivations (currentCoach, isMyTurn, etc.)
- Socket event handlers

### Integration Tests

**Full Draft Simulation**:
- Create session with 8 coaches
- Seed 80 Pokemon
- Simulate 80 picks following snake order
- Assert final state (each coach has 10 Pokemon, all valid)

### Manual Testing

**Multi-Tab Simulation**:
- Open 4+ browser tabs
- Each tab represents different coach
- Submit picks in correct order
- Verify all tabs update in real-time

---

## Success Metrics

**MVP Success Criteria**:
- Commissioner can set up and run complete draft in < 5 minutes
- 24 concurrent coaches experience no lag (< 100ms pick broadcast)
- Server survives temporary network interruptions without data loss
- Coaches can rejoin after disconnect and see current state
- Exported rosters import cleanly into Pokemon Showdown

**Long-Term Goals**:
- 100+ active draft communities using the software
- Contributions from 10+ external developers
- Expanded to support 4+ draft formats (LC, Doubles, Ubers, etc.)
- Mobile app for on-the-go drafting

---

## Non-Goals (Out of Scope)

**Not Building**:
- Actual Pokemon battle engine (use Showdown for that)
- Team builder with move/EV editor (Showdown or Pikalytics)
- League management system (standings, schedules, playoffs)
- Chat/voice communication (use Discord)
- Payment processing for paid leagues
- Mobile native apps (MVP is mobile-responsive web only)

---

## Community & Contribution

**Open Source Philosophy**:
- MIT License (permissive, allows commercial use)
- GitHub repository with public issues/discussions
- Welcoming to first-time contributors
- Prioritize code readability over cleverness

**Inspiration**:
- PUCL Draft League (community ruleset)
- Smogon Draft League (competitive format)
- Foundry VTT (self-hosted software distribution model)
- Lichess (open-source competitive gaming done right)

---

## Conclusion

This project leverages modern web technologies to automate a manual, error-prone process while maintaining zero cost and complete data ownership. The architecture balances ease-of-use for non-technical commissioners with production-grade reliability for competitive tournaments.

By choosing local hosting with tunneling, we've eliminated the #1 barrier to open-source gaming projects: ongoing server costs. This enables a sustainable, community-driven development model where anyone can fork, modify, and run their own instance without financial burden.
