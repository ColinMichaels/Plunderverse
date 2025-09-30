# Solar System Explorer

## Overview

This is an interactive 3D solar system exploration game built with React, Three.js, and Express. Users can navigate through space, explore planets, and learn about our solar system through an immersive 3D experience. The application features realistic planetary orbits, detailed planet information, keyboard controls for space navigation, and audio feedback.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI framework using functional components and hooks
- **React Three Fiber**: React renderer for Three.js, enabling declarative 3D graphics
- **React Three Drei**: Helper components and utilities for Three.js scenes
- **Vite**: Fast build tool and development server with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless component library for accessible UI primitives

### State Management
- **Zustand**: Lightweight state management for:
  - Solar system time and planet selection (`useSolarSystem`)
  - Audio controls and sound effects (`useAudio`)
  - Game phases and lifecycle (`useGame`)
  - Cryptocurrency wallet and marketplace (`useCrypto`)
  - Economy and inventory management (`useInventoryStore`, `useCreditsStore`)
  - Mining operations (`useMining`)
  - Equipment and ship status (`useEquipment`)

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

### Cryptocurrency Integration (September 30, 2025)
- **Wallet System**: One-click wallet initialization with persistent player IDs stored in localStorage
- **Mining Rewards**: Automatic cryptocurrency rewards (0.1% of resource value) for successful mining operations
- **Marketplace Operations**: Buy and sell resources using cryptocurrency with atomic transaction handling
- **Transaction Management**: Complete transaction history with balance tracking and market price updates
- **Error Handling**: Comprehensive error handling with user-friendly messages and automatic rollback on failures
- **State Synchronization**: Coordinated updates between crypto balance, game inventory, and credits
- **UI Integration**: Crypto wallet and marketplace panels integrated into GameUI with proper visibility and z-index

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