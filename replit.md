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
- **Mute Controls**: User-controllable audio with persistent state
- **Audio Stores**: Centralized audio management through Zustand

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