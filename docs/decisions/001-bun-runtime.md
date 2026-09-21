# ADR 001: Use Bun for the application runtime and package management

## Status

Accepted

## Context

The project intentionally migrated its backend from Node.js to Bun in commit
`96a0eda` ("Migrate from Node.js to Bun runtime"). That migration replaced the
backend's `nodemon`/`tsx` development path with Bun, removed the emitted
JavaScript production build, and adopted Bun package-management commands.

Later infrastructure work revisited that decision because Docker, Prisma,
dependency-management, shared-contract, and frontend build issues prevented a
reliable local draft environment. A separate Node implementation was built and
successfully smoke-tested as a comparison and fallback. Investigation found
that the relevant failures were primarily infrastructure and configuration
issues: missing lockfiles, incorrect Docker build contexts and artifact paths,
SQLite path inconsistencies, missing shared-contract resolution, and Prisma
startup setup. They were not demonstrated Bun runtime failures.

The Bun candidate subsequently addressed those issues while preserving the
existing application architecture.

## Decision

Bun is the primary backend runtime and the package manager where the project
is currently configured to use it.

Backend TypeScript source executes directly under Bun; production does not
require an emitted-JavaScript server build. SvelteKit and Vite remain
responsible for the frontend build.

This is not an all-Bun deployment claim. The frontend production container
continues to use Node to serve the static SvelteKit output; Bun builds that
output and runs the backend.

## Reasons

- Bun provides a simpler TypeScript development and backend runtime path with
  less server-specific tooling.
- The project had already intentionally adopted Bun before the infrastructure
  work.
- The dependencies important to this project have now been empirically tested
  in the Bun candidate: Prisma, SQLite, Express, Socket.io, SvelteKit/Vite,
  Zod, and the shared TypeScript contracts.
- Returning to Node would add migration and tooling work without addressing a
  demonstrated project problem.

This is a project-specific decision, not a claim that Bun is universally
superior to Node.js.

## Validation

The Bun candidate was validated with the following checks:

- reproducible dependency installation from committed `bun.lock` files using
  frozen installs;
- Docker image builds for the server and client;
- Prisma Client generation in the Bun image;
- SQLite schema initialization before backend startup, with the database file
  persisted through container destruction and recreation via the Compose
  volume;
- backend startup and a successful `/health` response;
- SvelteKit/Vite production build and static frontend serving on port 5173;
- server TypeScript and client Svelte type checks;
- Socket.io/Engine.IO polling handshake, including the advertised WebSocket
  upgrade.

The Socket.io check validates the Engine.IO handshake and advertised WebSocket
upgrade only. It does not validate application-level Socket.io events, rooms,
reconnection behavior, or concurrent draft operation.

## Alternatives considered

### Node

A separate Node implementation was created and successfully smoke-tested, so
Node remains a viable fallback. That experimental branch used Node 20, which
should not be treated as the long-term production Node target. If this decision
is revisited, the Node alternative should use a then-supported Node LTS.

### Hybrid Bun/Node

Using Bun for package management with Node as the backend runtime was
considered. At present it provides too little benefit to justify maintaining
two backend runtime semantics. The existing frontend static-serving Node stage
remains acceptable because it has a distinct, limited role.

## Consequences

Positive consequences:

- The backend toolchain is smaller.
- Backend TypeScript executes directly under the selected runtime.
- Lockfiles and frozen installs make dependency resolution reproducible.

Costs and constraints:

- The project continues to rely on Bun compatibility with Node ecosystem
  packages.
- Bun-specific behavior must be considered when adding dependencies or
  changing runtime integrations.
- Important integrations should continue to receive integration and smoke
  tests, especially Prisma, Socket.io, SQLite, and Docker startup.
- The architecture should not pursue “Bun purity”; an individual component may
  use another runtime when it is justified by that component's needs.

## Revisit this decision if

- A required dependency has a meaningful Bun incompatibility.
- Prisma or Socket.io develops a Bun-specific reliability problem.
- Deployment requirements materially favor Node.
- Maintenance or ecosystem costs outweigh Bun's simpler backend path.
- Another runtime provides a clear project-specific advantage.
