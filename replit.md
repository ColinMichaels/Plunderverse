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
├── hooks/            # Custom React hooks
├── lib/
│   ├── stores/       # Zustand state management
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
- **Frontend**: React, Three.js (React Three Fiber), Zustand, TailwindCSS
- **Backend**: Express, PostgreSQL (Neon), Drizzle ORM
- **Build**: Vite, TypeScript
- **Audio**: Howler.js
- **Network**: WebSocket for real-time sync

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

## Recent Changes

### 2026-01-24: Codebase Cleanup
- Removed scattered test files from src/ root
- Organized Parrot components into dedicated folder
- Removed old test documentation and backup files
- Cleaned up unused imports and dependencies
- Simplified project structure
