# Plunderverse - Solar System Explorer

## Overview
"Plunderverse" is a Firefly-inspired 3D space outlaw game built with React, Three.js, and Express. Set in a bankrupt solar system in 2149, players embody smugglers and space outlaws. The game features an outlaw gameplay system with faction reputation, moral choices, crew management, heat/notoriety tracking, and a 4-act story progressing from Rogue to Space Pirate Supreme. Content is created using a JSON-based mission authoring system, blending a sci-fi aesthetic with outlaw mechanics. The vision is to create an immersive experience in a morally ambiguous universe, offering rich narrative and dynamic gameplay.

## User Preferences
Preferred communication style: Simple, everyday language.

### UI Design Guidelines
- **Action Buttons**: Use icon-only design with hover-over tooltips for better space efficiency
- **Button Style**: `bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center`
- **Icon Size**: Use `text-xl` for icon size within buttons
- **Tooltip**: Always include descriptive `title` attribute for accessibility
- **Consistency**: All new UI action items should follow this pattern for uniformity and better layout

## System Architecture

### Frontend
- **Frameworks**: React with TypeScript, React Three Fiber for 3D graphics, React Three Drei for Three.js utilities.
- **Build**: Vite for fast development and optimized client bundling.
- **Styling**: Tailwind CSS for utility-first styling, Radix UI for headless accessible components.
- **State Management**: Zustand for lightweight, feature-organized state management.
- **3D Graphics**: Three.js for core 3D, handling orbital mechanics, camera controls, dynamic lighting, and particle systems.
- **UI/UX**: Component organization by gameplay mechanics (`space/`, `navigation/`, `surface/`, `cockpit/`, `combat/`, `economy/`, `ship/`, `screens/`, `ui/`, `mobile/`, `debug/`, `shared/`). UI layout includes a right sidebar system with draggable panels and state persistence.
- **Assets**: Organized textures, audio (music and sound effects), and 3D models (FBX, GLTF).

### Backend
- **Framework**: Express.js with TypeScript for a minimal REST API server.
- **Data Storage**: In-memory storage for user management, designed for easy replacement with a database.
- **Session Management**: Ready for user authentication and session handling.

### Database
- **ORM**: Drizzle ORM for type-safe database interactions.
- **Migrations**: Drizzle Kit for schema management.
- **Hosting**: Neon Database for serverless PostgreSQL.
- **Schema**: Shared type definitions between client and server.

### Core Systems
- **Mission Engine**: JSON-based content authoring, branching dialogue, dynamic objective generation, and real-time tracking.
- **Faction Reputation**: Three factions (Corporations, Independents, Outlaws) influencing missions, prices, and heat decay.
- **Economic Pressure**: Fuel consumption, daily operating costs, equipment degradation, and survival resources.
- **Heat/Notoriety System**: Six wanted levels, patrol encounters, and mechanics to reduce heat.
- **Crew Management**: 10 unique crew members with loyalty, skills, and personal quests.
- **Story Progression**: 4-act narrative with 11 ranks, story missions, and multiple endings.
- **Content System**: Hot-reloadable JSON, ContentRegistry, GameFacade, and deterministic RNG.
- **Audio System**: HTML5 Audio with global configuration, configurable sound effects, category-based music, and mute controls.
- **Autopilot System**: Auto-orbit mechanics, movement control lockout, real-time orbit tracking, warping visual effects, and navigation integration.
- **Cryptocurrency Integration**: Wallet system, mining rewards, marketplace operations, transaction management, and state synchronization.

### Build System
- **Modules**: ESM Modules throughout.
- **Bundlers**: esbuild for server-side, Vite Build for client-side.
- **Shaders**: GLSL Shader support for advanced graphics.

## External Dependencies

### Core Frameworks
- **React 18**
- **Three.js Ecosystem**: `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- **Express.js**

### Database & ORM
- **Drizzle ORM**
- **Neon Database**
- **PostgreSQL**

### UI Components
- **Radix UI**
- **Tailwind CSS**
- **Lucide React**

### Development Tools
- **Vite**
- **TypeScript**
- **PostCSS**

### Utilities
- **Zustand**
- **TanStack Query** (prepared for API integration)
- **Class Variance Authority**
- **Date-fns**

### Audio Assets
- Background music and sound effects from `/public/sounds/` (MP3, OGG, WAV).