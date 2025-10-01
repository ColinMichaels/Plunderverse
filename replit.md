# Plunderverse - Solar System Explorer

## Overview

This is "Plunderverse" - a Firefly-inspired 3D space outlaw game built with React, Three.js, and Express. Set in 2149 in a bankrupt solar system, players operate on the fringes as smugglers and space outlaws. The game features a comprehensive outlaw gameplay system including faction reputation, moral choices with consequences, crew management, heat/notoriety tracking, and a 4-act story progression from Rogue to Space Pirate Supreme. Built with a JSON-based mission authoring system for easy content creation while maintaining a sci-fi aesthetic with outlaw mechanics.

## User Preferences

Preferred communication style: Simple, everyday language.

### UI Design Guidelines
- **Action Buttons**: Use icon-only design with hover-over tooltips for better space efficiency
- **Button Style**: `bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center`
- **Icon Size**: Use `text-xl` for icon size within buttons
- **Tooltip**: Always include descriptive `title` attribute for accessibility
- **Consistency**: All new UI action items should follow this pattern for uniformity and better layout

## Plunderverse Features (October 1, 2025)

### Core Gameplay Systems

#### 1. Mission Engine
- **JSON-based content authoring** in `client/src/content/plunderverse/`
- **Branching dialogue** with moral choices affecting outcomes
- **Mission objectives**: delivery, combat, mining, smuggling
- **Dynamic generation** based on location and player rank
- **Hot-reload support** via Vite for instant content updates

#### 2. Faction Reputation
- **Three factions**: Corporations, Independents, Outlaws
- **Reputation affects**: mission availability, prices, heat decay
- **Black market access** requires Outlaw reputation ≥10
- **Dynamic pricing** based on faction standing (60%-200% modifier)

#### 3. Economic Pressure
- **Fuel consumption** based on travel distance
- **Daily operating costs**: crew salaries, life support, docking fees
- **Equipment degradation** requiring maintenance
- **Survival resources**: food, water, oxygen, medical supplies
- **Emergency missions** when credits drop below 100

#### 4. Heat/Notoriety System
- **Six wanted levels** from Clean to Shoot on Sight
- **Patrol encounters** with bribe/flee/fight options
- **Laying low mechanics** to reduce heat over time
- **Consequences**: price markups, mission restrictions, bounty hunters

#### 5. Crew Management
- **10 unique crew members** with skills and backgrounds
- **Loyalty system** affecting performance and desertion
- **Skill bonuses**: pilot, mechanic, medic, gunner, negotiator, hacker
- **Personal quest hooks** for narrative depth
- **Daily salary costs** adding to economic pressure

#### 6. Story Progression
- **4-act narrative**: The Rogue, The Outlaw, The Captain, The Legend
- **11 ranks** from Rogue to Space Pirate Supreme
- **Story missions** with permanent consequences
- **Multiple endings** based on choices and faction allegiance
- **Morality tracking** affecting available paths

#### 7. Content System
- **Hot-reloadable JSON files** for all content
- **ContentRegistry** managing missions, factions, nodes, ranks
- **GameFacade** orchestrating all gameplay systems
- **Deterministic RNG** for consistent procedural generation

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI framework using functional components and hooks
- **React Three Fiber**: React renderer for Three.js, enabling declarative 3D graphics
- **React Three Drei**: Helper components and utilities for Three.js scenes
- **Vite**: Fast build tool and development server with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless component library for accessible UI primitives

### Component Organization (October 1, 2025)
Components are organized by gameplay mechanics and features for easier navigation:

- **`space/`** - 3D Space Scene & Celestial Bodies
  - SolarSystem, Planet, Moon, Sun, Starfield
  - Asteroid, AsteroidField, FBXAsteroid

- **`navigation/`** - Camera Controls & Navigation
  - CameraController, OrbitalInterface, WarpingEffect
  - MiniMap subfolder: MiniMap, FixedMiniMap

- **`surface/`** - Planet Surface Gameplay
  - PlanetSurfaceScene, SurfaceMovementController, SurfaceStatsPanel
  - LandingTransition, LandingWarning, TakeoffControls, FlashlightSystem

- **`cockpit/`** - Cockpit & HUD Elements
  - CockpitHUD, CockpitOverlay, CoordinatesDisplay, ShipStatusHUD

- **`combat/`** - Combat Systems
  - ShootingSystem, Laser

- **`economy/`** - Economy & Trading
  - InventoryDisplay, TradingInterface, MiningInterface, MissionsPanel
  - crypto subfolder: CryptoWallet, CryptoMarketplace

- **`ship/`** - Ship Status & Management
  - ShipStatus, EquipmentWarning

- **`screens/`** - Game Screens & Menus
  - SplashScreen, SettingsPanel, ControlsHelp, HintModal, MusicPlayer

- **`ui/`** - Pure UI Framework (no game logic)
  - GameUI (main orchestrator), SpaceUIPanel, UILayoutManager, DraggablePanel
  - primitives subfolder: Shadcn/ui components

- **`mobile/`** - Mobile-specific Controls
  - MobileHUD, MobileControls, MobilePropulsion

- **`debug/`** - Development Tools
  - DevDebugOverlay, DebugCollisionBoxes, DebugWireframeWrapper

- **`shared/`** - Shared/Info Components
  - PlanetInfo

### Store Organization (October 1, 2025)
Zustand stores are organized by feature to match the component structure:

- **`space/`** - Space & Celestial Bodies State
  - useSolarSystem (planetary orbits, time)
  - useAsteroids (asteroid field state)

- **`navigation/`** - Navigation & Autopilot
  - useAutopilot (autopilot control, orbit tracking)

- **`surface/`** - Planet Surface State
  - useLandedState (landing status)
  - useLandingWarning (landing warnings)
  - useFlashlight (flashlight control)
  - useSurfaceCollision (surface collision detection)

- **`combat/`** - Combat Systems
  - useShooting (shooting mechanics)

- **`economy/`** - Economy & Trading
  - useInventory (inventory management)
  - useCredits (credit system)
  - useMining (mining operations)
  - useCrypto (cryptocurrency wallet)
  - useMissions (missions system)

- **`ship/`** - Ship Management
  - useShipStatus (ship status)
  - useEquipment (equipment management)

- **`player/`** - Player State
  - usePlayer (player stats and state)

- **`ui/`** - UI State
  - useGame (game lifecycle)
  - useSettings (user settings)
  - useHints (hint system)
  - useMusicPlayer (music player)
  - useAudio (audio controls)
  - useRewards (rewards system)

- **`debug/`** - Debug Tools
  - useDebugTools (debug utilities)

All stores are re-exported through `client/src/lib/stores/index.ts` for convenient imports.

### Assets Organization (October 1, 2025)

**Textures** (`client/public/textures/`):
- **`planets/`** - Planet surface textures (2k resolution)
  - Earth, Mars, Mercury, Venus, Jupiter, Saturn, Uranus, Neptune, Moon, Sun, Ceres
- **`surfaces/`** - Special surface textures
  - Moon detail textures
- **`materials/`** - Material textures
  - crystal_mineral.png, gold_ore.png, asphalt.png, wood.jpg
- **`terrain/`** - Terrain textures
  - earth_grass.png, grass.png, mars_terrain.png, moon_terrain.png, sand.jpg
- **Root level**: sky.png

**Audio** (`client/public/sounds/`):
- **`music/`** - Background music tracks
  - 9 ambient space music tracks
- **Root level** - Sound effects
  - thruster.mp3, space-lazer.mp3, hit.mp3, success.mp3, zap.mp3, etc.

**Geometries** (`client/public/geometries/`):
- 3D model files (FBX, GLTF)
  - Asteroid_1b.fbx, heart.gltf

### State Management
- **Zustand**: Lightweight state management organized by feature (see Store Organization above)

### 3D Graphics System
- **Three.js**: Core 3D graphics engine
- **Orbital Mechanics**: Real-time planetary orbit calculations with accurate relative speeds
- **Camera Controls**: First-person space navigation with keyboard input
- **Lighting System**: Dynamic lighting with sun as primary light source
- **Particle Systems**: Starfield background with thousands of procedurally positioned stars

### Backend Architecture
- **Express.js**: Minimal REST API server
- **TypeScript**: Full-stack type safety
- **Memory Storage**: In-memory data storage for user management (easily replaceable with database)
- **Session Management**: Ready for user authentication and session handling

### Database Layer
- **Drizzle ORM**: Type-safe database toolkit configured for PostgreSQL
- **Drizzle Kit**: Database migrations and schema management
- **Neon Database**: Serverless PostgreSQL (via `@neondatabase/serverless`)
- **Schema Definition**: Shared type definitions between client and server

### Build System
- **ESM Modules**: Modern ES module system throughout
- **esbuild**: Fast bundling for server-side code
- **Vite Build**: Optimized client bundling with asset handling
- **GLSL Shader Support**: Custom shader loading for enhanced graphics

### Audio System
- **HTML5 Audio**: Native audio playback with background music and sound effects
- **Global Audio Config**: Centralized configuration in `client/src/lib/audioConfig.ts` for all audio files and effects
- **Configurable Sound Effects**: Volume, looping, throttling, and playback rate settings for each sound effect
- **Music Track Management**: Category-based music system (space/surface/atmospheric) with configurable tracks
- **Mute Controls**: User-controllable audio with persistent state
- **Audio Stores**: Centralized audio management through Zustand
- **Autopilot Audio**: Throttled thruster sound effects during automated flight

### Autopilot System
- **Auto-Orbit Mechanics**: Automatically orbits around moving planets when reaching landing distance
- **Movement Control Lockout**: Disables manual controls during autopilot for immersive automated flight
- **Real-time Orbit Tracking**: Uses orbital mechanics to follow planets as they move through their orbits
- **Warping Visual Effects**: Particle-based "stars streaming past cockpit" effects during autopilot travel
- **Extended Travel Time**: Reduced autopilot speed (4 units/sec) for more immersive space travel experience
- **Navigation Integration**: Credit-based system with automatic target selection and UI management

### UI Layout and Sidebar System (October 1, 2025)
- **Right Sidebar Integration**: Missions Panel and Controls Help converted to SpaceUIPanel system
- **Panel Ordering**: Right sidebar displays panels in priority order: Missions (📋), Controls (❓), Crypto Wallet (💰), Crypto Marketplace (🏪)
- **State Persistence**: UILayoutManager preserves component state when panels are collapsed (tab selection, scroll position, form data)
- **Draggable Panels**: DevDebugOverlay, SurfaceStatsPanel, MissionsPanel (legacy), and ControlsHelp (legacy) support drag-and-drop positioning
- **Sidebar Controls**: F1 key toggles Controls Help, panel icons in sidebar for quick access

### Cryptocurrency Integration (September 30, 2025)
- **Wallet System**: One-click wallet initialization with persistent player IDs stored in localStorage
- **Mining Rewards**: Automatic cryptocurrency rewards (0.1% of resource value) for successful mining operations
- **Marketplace Operations**: Buy and sell resources using cryptocurrency with atomic transaction handling
- **Transaction Management**: Complete transaction history with balance tracking and market price updates
- **Error Handling**: Comprehensive error handling with user-friendly messages and automatic rollback on failures
- **State Synchronization**: Coordinated updates between crypto balance, game inventory, and credits
- **UI Integration**: Crypto wallet and marketplace panels integrated into GameUI with proper visibility and z-index
- **API Contract**: Server mock API responses match client TypeScript interfaces (CryptoWallet, CryptoMarketPrice) with proper field names and types

## External Dependencies

### Core Frameworks
- **React 18**: Frontend framework with concurrent features
- **Three.js Ecosystem**: 3D graphics via `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- **Express.js**: Backend web framework

### Database & ORM
- **Drizzle ORM**: Type-safe database operations
- **Neon Database**: Serverless PostgreSQL hosting
- **PostgreSQL**: Relational database (configured but not actively used)

### UI Components
- **Radix UI**: Complete headless component library for accessible interfaces
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library for UI elements

### Development Tools
- **Vite**: Build tool with TypeScript support
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing with Tailwind integration

### Utilities
- **TanStack Query**: Data fetching and caching (prepared for API integration)
- **Class Variance Authority**: Type-safe component variants
- **Date-fns**: Date manipulation utilities
- **Zustand**: Lightweight state management

### Audio Assets
- Background music and sound effects loaded from `/public/sounds/` directory
- Support for MP3, OGG, and WAV audio formats