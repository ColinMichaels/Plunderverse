# Plunderverse

## Overview
A 3D space outlaw game set in a bankrupt solar system in 2149. Players are smugglers engaging in trade, missions, and combat across a procedurally generated solar system.

## User Preferences
- Communication style: Simple, everyday language

## Project Structure

```
client/src/
├── components/       # React components organized by feature
│   ├── auth/         # Authentication screens
│   ├── cockpit/      # Cockpit HUD and overlays
│   ├── combat/       # Combat systems and shooting
│   ├── debug/        # Debug panels and tools
│   ├── economy/      # Trading, mining, missions UI
│   ├── minigames/    # Arcade mini-games (Pong, Asteroids, etc.)
│   ├── mobile/       # Mobile-specific components
│   ├── navigation/   # Camera, autopilot, navigation UI
│   ├── parrot/       # AI companion parrot components
│   ├── screens/      # Splash, music player, hints
│   ├── settings/     # Audio and game settings
│   ├── shared/       # Reusable components
│   ├── ship/         # Ship upgrades, crew management
│   ├── space/        # Solar system, planets, stars
│   ├── surface/      # Planet surface rendering
│   └── ui/           # Core UI components
├── domain/           # Domain-driven design modules
│   ├── economy/      # Credits, inventory, trading stores
│   └── crypto/       # Cryptocurrency mock service
├── engine/           # Rendering engine abstraction layer
│   ├── interfaces/   # Engine-agnostic interfaces
│   ├── adapters/     # Engine implementations (Babylon, Three)
│   ├── components/   # React components for engine
│   ├── hooks/        # Engine React hooks
│   └── utils/        # Math utilities (Vec3, Quat, Color)
├── providers/        # React context providers
│   ├── DebugProvider     # Debug mode and logging control
│   └── PlatformProvider  # Platform detection (mobile/desktop)
├── hooks/            # Custom React hooks
├── lib/
│   ├── stores/       # Zustand state management (legacy + domain)
│   ├── plunderverse/ # Game engine (missions, economy)
│   └── utils/        # Utilities and helpers
├── services/         # API clients, cloud sync
└── stores/           # Additional input/layout stores
server/
├── routes.ts         # API endpoints
├── services/         # Backend services
└── db/               # Database configuration
```

## Tech Stack
- **Frontend**: React, Three.js (React Three Fiber), Babylon.js, Zustand, TailwindCSS
- **Backend**: Express, PostgreSQL (Neon), Drizzle ORM
- **Build**: Vite, TypeScript
- **Audio**: Howler.js
- **Network**: WebSocket for real-time sync

## Architecture Patterns

### State Management
- **Domain Stores** (preferred): `client/src/domain/` - New domain-driven stores
- **Legacy Stores**: `client/src/lib/stores/` - Backward-compatible adapters
- Use `useCreditsStore`, `useInventoryStore` for new code
- Legacy `useCredits`, `useInventory` delegate to domain stores

### Rendering Engine Abstraction
Located in `client/src/engine/`:
- `IRenderingEngine` - Engine-agnostic interface
- `BabylonAdapter` - Babylon.js implementation with advanced features
- `Vec3`, `Quat`, `Color` - Engine-agnostic math utilities
- `useEngine`, `useEngineUpdate` - React hooks for engine access
- Test via `?babylon=true` URL parameter

**Babylon.js Features**:
- Post-processing: Glow, Bloom, Vignette, Chromatic Aberration
- Particle systems for effects (thrusters, explosions, corona)
- Skybox/environment support
- Scene management with proper cleanup

### Debug Utilities
- `client/src/lib/utils/debug.ts` - Centralized logging
- `client/src/providers/DebugProvider.tsx` - Debug mode context
- Console spam reduced with once-only warnings

## Key Features
1. **Space Flight**: 3D navigation with autopilot, mouse steering, keyboard controls
2. **Trade System**: Dynamic economy, mining, inter-station trading
3. **Mission System**: Story-driven missions with branching outcomes
4. **Combat**: Turn-based battles, heat/notoriety system
5. **Mini-Games**: Arcade games at stations (Pong, Asteroids, Space Shooter)
6. **Mobile Support**: Touch-optimized UI with virtual joystick

## Audio System
All sounds managed through `useAudio` hook with category-based volume control:
- Music, SFX, Parrot (AI companion), Ambient sounds
- Functions: `playThruster()`, `stopThruster()`, `playWind()`, `playRain()`, etc.

## Database
Use `npm run db:push` for schema migrations. Never write raw SQL migrations.

## Improvement Roadmap
1. **Integrate Babylon Engine**: Migrate components from Three.js to abstraction layer
2. **Split App.tsx**: Extract scene management, cloud sync into providers
3. **Domain Store Migration**: Move remaining legacy stores to domain pattern
4. **Performance**: Add scene lifecycle manager for resource cleanup

## Recent Changes

### 2026-01-24: Code Optimization
- Created providers folder with DebugProvider and PlatformProvider
- Added centralized debug utilities with log gating
- Fixed MemoryProfiler to warn only once about missing API
- Reduced console spam from deprecated store warnings
- Added debug.ts utility for controlled logging

### 2026-01-24: Babylon.js Enhanced Features
- Added post-processing pipeline (glow, bloom, vignette, chromatic aberration)
- Implemented particle system support for visual effects
- Added skybox/environment texture support
- Enhanced test scene with sun corona particles, asteroid belt, moon orbits
- Camera animation and improved visual quality

### 2026-01-24: Babylon.js Engine Abstraction
- Created rendering engine abstraction layer in `client/src/engine/`
- Implemented `IRenderingEngine` interface for engine-agnostic operations
- Built `BabylonAdapter` with scene, mesh, light, camera management
- Added engine-agnostic math utilities (Vec3, Quat, Color, MathUtils)
- Created React hooks (`useEngine`, `useEngineUpdate`) for engine access
- Added Babylon.js test page accessible via `?babylon=true` URL parameter

### 2026-01-24: Codebase Cleanup
- Removed scattered test files from src/ root
- Organized Parrot components into dedicated folder
- Removed old test documentation and backup files
- Simplified project structure
