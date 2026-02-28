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
- **Frontend**: React, Babylon.js (primary), Zustand, TailwindCSS
- **Backend**: Express, PostgreSQL (Neon), Drizzle ORM
- **Build**: Vite, TypeScript
- **Audio**: Howler.js
- **Network**: WebSocket for real-time sync
- **Rendering**: Babylon.js (space scene migrated, surface scene pending)

## Architecture Patterns

### State Management
- **Domain Stores** (preferred): `client/src/domain/` - New domain-driven stores
- **Legacy Stores**: `client/src/lib/stores/` - Backward-compatible adapters
- Use `useCreditsStore`, `useInventoryStore` for new code
- Legacy `useCredits`, `useInventory` delegate to domain stores

### Rendering Engine (Babylon.js)
Located in `client/src/engine/`:
- `IRenderingEngine` - Engine-agnostic interface
- `BabylonAdapter` - Primary Babylon.js implementation
- `Vec3`, `Quat`, `Color` - Engine-agnostic math utilities
- `useEngine`, `useEngineUpdate` - React hooks for engine access
- `BabylonCanvas` - Canvas component replacing R3F Canvas
- `BabylonSolarSystem` - Main space scene (Sun, planets, starfield)
- `BabylonCameraController` - Keyboard navigation controller

**Babylon.js Features**:
- Post-processing: Glow, Bloom, Vignette, Chromatic Aberration
- Particle systems for effects (thrusters, explosions, corona)
- Skybox/environment support
- Scene management with proper cleanup
- Camera transform control with setCameraTransform API

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

## Mobile Architecture

On mobile (`effectivePlatformType === "mobile"`), the Babylon canvas renders just like
desktop and the mobile UI overlays on top:

- **In space** (`!isLanded`): Babylon canvas (BabylonSolarSystem + BabylonCombatScene) renders
  behind a transparent `MobileHUD` overlay. `TouchPropulsionControls` wraps the canvas to
  handle hold-to-thrust and drag-to-look.
- **At station** (`isLanded`): `StationDashboard` covers the canvas (full-screen).
- **Mini-game**: `MobileMinigame` (Phaser) covers the canvas (full-screen).
- **Splash**: Phaser-based `MobileSplashScene` covers everything (full-screen).

`useInput.isMobile` is derived from `ontouchstart`, `maxTouchPoints`, or `window.innerWidth < 768`
(not UA sniffing), so Chrome DevTools mobile simulation works correctly.

## Improvement Roadmap
1. **Domain Store Migration**: Move remaining legacy stores to domain pattern
2. **Performance**: Add scene lifecycle manager for resource cleanup
3. **Remove Three.js**: Clean up Three.js dependencies after full R3F migration (minigames remain)

## Recent Changes

### 2026-02-28: Vec3 Migration in useSolarSystem (Safari iOS crash fix)
- Fixed: `useSolarSystem` no longer stores `THREE.Vector3`/`THREE.Euler` in Zustand state
- Changed: `cameraPosition`, `shipPosition`, `shipVelocity` → plain `Vec3 = {x,y,z}` objects
- Changed: `shipRotation` → plain `Vec3` (was `THREE.Euler` with getter-based x/y/z)
- Added: `vec3Distance(a, b)` helper exported from `useSolarSystem` — replaces `.distanceTo()`
- Updated callers: `CockpitHUD`, `PrimaryControlsHUD`, `NavigationPanel` (desktop + mobile),
  `EnemyField`, `AsteroidField`, `CombatDebugPanel`, `FastTravelMenu`, `saveGame.ts`
- Why: `THREE.Euler` uses getter-defined `x/y/z` properties; Safari iOS JavaScriptCore's
  `JSON.stringify` can fail on cyclic getter chains — this caused the `EngineErrorBoundary`
  crash on real mobile devices when the Babylon canvas first mounted
- Removed THREE import from `saveGame.ts` (no longer needed)

### 2026-02-28: Mobile Touch Fix + Regression Review
- Fixed: Babylon canvas now renders on BOTH mobile and desktop (was mobile-only dashboard before)
- Fixed: `MobileHUD` (ActionBar, ControlPanel, navigation panels) now renders in space flight view
- Fixed: `isMobile` in `useInput` now uses touch API + viewport width instead of User-Agent only
- Fixed: `MobileHUD` guard `if (!isMobile) return null` removed (rendered only inside mobile path)
- Fixed: AudioContext unhandledrejection suppressed before Replit error modal via capture phase listener
- Extracted: `CloudSyncProvider` from App.tsx; App.tsx reduced to ~250 lines
- Replaced: R3F Canvas splash screen background with Canvas2D `SplashStarfield`
- Deleted: Dead files — CameraController.tsx (1509 lines), WarpingEffect.tsx, SolarSystem.tsx,
  PlanetSurfaceScene.tsx (1643 lines), SurfaceScatter.tsx, CameraShake.tsx, ResourceManagerExample.tsx
- Added: `EngineErrorBoundary` wrapping BabylonCanvasWithInit in App.tsx
- Added: `/docs` folder with ARCHITECTURE, TODOS, FUTURE_FEATURES, README docs
- Marked: Legacy stores with `@deprecated` JSDoc in `lib/stores/index.ts`

### 2026-01-24: Babylon.js Unified Scene Migration
- Created BabylonCombatScene for enemies, projectiles, explosions in Babylon.js
- Created BabylonSurfaceScene for terrain, sky, lighting, resource nodes in Babylon.js
- Updated App.tsx to use single Babylon canvas for all scenes (seamless transitions)
- Combat scene overlays space scene with real-time enemy/projectile tracking
- Surface scene features dynamic lighting, resource pulsing, flashlight support
- Removed Three.js/R3F dependency for space and surface rendering
- All scenes share same stores for synchronized state

### 2026-01-24: Mobile UI Feature Parity
- Created NavigationPanel for mobile with planet list, coordinates, autopilot
- Created ShipStatusPanel with shields, hull, fuel bars (matching desktop)
- Created SettingsPanel with audio toggle, menu access, controls help
- Enhanced MobileHUD with quick-access buttons for all panels
- Added compact status bar showing fuel, shields, credits
- Added target indicator and wanted level display
- Mobile now hides HUD when landed (matching desktop behavior)
- All panels use same stores as desktop for synchronized state
- Added engine-agnostic setters to useSolarSystem for Babylon compatibility

### 2026-01-24: Babylon.js Full Migration (Space Scene)
- Replaced R3F Canvas with BabylonCanvas in App.tsx
- Created BabylonSolarSystem scene with all planets, sun, moon, starfield
- Implemented BabylonCameraController with keyboard navigation (WASD, QE, IJKL)
- Added setCameraTransform API to engine interface
- Orbital mechanics now run on Babylon update loop
- All 8 planets orbit with correct speeds and distances

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
