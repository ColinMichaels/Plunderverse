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

## Recent Planet Surface Improvements (October 2, 2025)

### Debug Lighting Controls
- **Manual Override System**: Toggle between automatic orbital mechanics and manual control
- **Sun Position Control**: Azimuth (0-360°) and Elevation (-90 to 90°) sliders
- **Intensity Adjustment**: Sun intensity (0-5) and ambient light (0-1) controls
- **Time of Day Presets**: Quick buttons for Dawn, Morning, Noon, Dusk, and Night
- **Sun Color Customization**: Color picker for artistic lighting control

### Enhanced Mining Visuals
- **Mining Laser Beam**: Dynamic energy beam connecting player to resource node with rarity-based colors (green/blue/purple/orange)
- **Progressive Node Deformation**: Resources gradually crack, wobble, and break apart during extraction with custom GLSL shaders
- **Advanced Particle System**: 300+ physics-based particles with sparks, dust clouds, debris, and resource-specific behaviors
- **Resource Glow System**: Dynamic emission and rim lighting based on rarity, with particle auras for legendary items
- **Mining Feedback**: Screen shake, varied sound pitch/volume, and visual overlays (flash, vignette, distortion) based on resource properties

### Improved Terrain Generation
- **Planet-Specific Features**: 
  - Earth: Rolling hills, valleys, mountains
  - Mars: Canyons, ancient riverbeds, impact craters
  - Moon/Mercury: Heavy cratering with mare regions
  - Venus: Volcanic features with lava flows
  - Gas Giants: Dense atmospheric simulation
- **Advanced Terrain Algorithm**: Multiple noise octaves, FBM, ridge noise, turbulence
- **Terrain Features**: Craters (25-30 per suitable planet), mountain ridges, valleys, plateaus
- **Performance**: Terrain caching system with instant retrieval

### Surface Details & Atmosphere
- **Procedural Scatter System**: 2800-4200 objects per planet using Poisson disk sampling
  - Small rocks, pebbles, debris
  - Planet-specific objects (ice chunks, dust drifts, volcanic rocks)
  - LOD system for performance
- **Atmospheric Effects**: 
  - Mars: Dust storms with visibility reduction
  - Venus: Thick fog, acid rain, heat shimmer
  - Earth: Morning fog, pollen, rain effects
  - Dynamic wind system affecting particles
- **Heat Shimmer**: Custom GPU shaders for heat distortion on hot planets
- **Weather System**: Time-of-day variations and storm events with atmospheric sounds