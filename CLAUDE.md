# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo for a real-time multiplayer 3D racing game using:
- **Frontend**: Next.js 15 + React Three Fiber + Rapier physics
- **Backend**: PartyKit server for real-time multiplayer
- **Architecture**: pnpm workspace with Turborepo

### Workspace Packages

- `apps/game-front`: Next.js game client with 3D graphics
- `apps/game-server`: PartyKit WebSocket server for multiplayer state sync
- `packages/game-schemas`: Shared Zod schemas and TypeScript types
- `packages/peerjs-react`: PeerJS React hooks for P2P connections

## Common Development Commands

### Root Commands
```bash
pnpm install          # Install all dependencies
pnpm dev             # Start all apps in development mode
pnpm build           # Build all packages
```

### Frontend (apps/game-front)
```bash
pnpm dev             # Start Next.js dev server with Basehub CMS
pnpm build           # Build for production
pnpm lint            # Run Next.js linting
```

### Server (apps/game-server)
```bash
pnpm dev             # Start PartyKit dev server with hot reload
pnpm build           # Build server bundle
pnpm deploy-server   # Deploy to PartyKit
```

## Architecture Overview

### Multiplayer System
- **PartyKit WebSocket Server** (`apps/game-server/src/index.ts`): Manages player presence, synchronizes positions/rotations at 30 FPS
- **Message Protocol**: Uses Zod-validated schemas from `game-schemas` for type-safe client-server communication
- **State Sync**: Server maintains authoritative state, broadcasts deltas to connected clients

### 3D Game Client
- **React Three Fiber**: Scene management in `apps/game-front/src/app/components/game.tsx`
- **Physics**: Rapier physics engine for vehicle simulation
- **Vehicle Controller**: Custom vehicle physics in `apps/game-front/src/app/components/vehicle/`
- **Controls**: Keyboard (WASD) and mobile device orientation support

### Key Patterns
- **Message Packing**: JSON serialization (with commented CBOR support for binary optimization)
- **Throttled Updates**: Server broadcasts at 30 FPS to optimize bandwidth
- **Presence System**: Tracks player state with position, rotation, velocity
- **Room-based Multiplayer**: Each game room has isolated state via PartyKit rooms

## Environment Variables

### Frontend (.env.local)
```
BASEHUB_TOKEN=<token>                    # Basehub CMS token
NEXT_PUBLIC_PARTY_SOCKET_HOST=<host>     # PartyKit server URL
```

## Testing & Debugging

- Add `?debug` to URL for debug UI overlay
- Vehicle physics constants in `apps/game-front/src/app/components/vehicle/constants.ts`
- Server FPS configurable via `SERVER_UPDATE_FPS` in server index

## Key Files to Understand

- **Server Logic**: `apps/game-server/src/index.ts` - WebSocket message handling, presence sync
- **Game Scene**: `apps/game-front/src/app/components/game.tsx` - Main 3D scene setup
- **Player Controller**: `apps/game-front/src/app/components/player.tsx` - Local player logic
- **Message Types**: `packages/game-schemas/src/` - All message/data schemas
- **Vehicle Physics**: `apps/game-front/src/app/components/vehicle/controller.tsx` - Car simulation