# Plunderverse - Compressed Technical Specification

## Overview
"Plunderverse" is a 3D space outlaw game, set in a bankrupt solar system in 2149. Built with React, Three.js, and Express, the game allows players to be smugglers and space outlaws engaging in dynamic gameplay loops: trade and survival, mission and story progression, and combat and notoriety management. The game features a procedurally generated, economically driven solar system, aiming to deliver a highly replayable outlaw experience with a rich narrative and emergent gameplay.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The project employs a client-server architecture. The frontend utilizes React, Three.js (React Three Fiber), and Zustand for state management. The backend is built with Express, PostgreSQL (Neon-backed), and Drizzle ORM. Development is supported by Vite and TypeScript, with styling managed by TailwindCSS and Radix UI components.

The game features three core gameplay loops:
1.  **Trade & Survive**: Involves resource mining, dynamic inter-station trading with fluctuating prices, and continuous management of resources like fuel, hull, oxygen, and crew wages, integrating economic pressure, equipment degradation, and faction reputation.
2.  **Mission & Story**: Players undertake missions (delivery, combat, exploration) with access tied to reputation. A multi-act story offers branching choices impacting karma and faction relations, leading to five distinct endings.
3.  **Combat & Heat**: Features turn-based combat against various enemy types. Illegal activities generate "heat," increasing notoriety, leading to aggressive patrols, and "shoot on sight" orders at higher levels.

The UI/UX is designed for responsiveness across desktop and mobile.
-   **Desktop**: Features a three-panel layout with a central 3D viewport, sidebars for navigation, and a bottom control bar.
-   **Mobile**: Offers a touch-optimized layout including a header, 3D viewport, virtual joystick, action bar, and slide-in overlay panels. Mobile panels have standardized compact headers to optimize vertical space.
-   **Color Palette**: Employs deep space darks with vibrant cyan accents for interactive elements. A theme system allows users to switch between "Classic" (cyberpunk orange/cyan) and "Monochrome" (black/white/gray) themes, with preference persistence.
-   **Components**: Standardized button, panel, and HUD styles with defined CSS for transitions and feedback. Standardized click-outside-to-close behavior for collapsible panels.
-   **Accessibility**: Includes features like colorblind modes, font scaling, screen reader support, and rebindable controls.

The system structure is hierarchical, managed by an `AuthProvider` that orchestrates `LoginScreen` and `GameContainer`. The `GameContainer` integrates a `ThreeCanvas` for 3D rendering, a `UILayer`, and an `AudioSystem`. Zustand stores manage various game states (player, ship, economy, combat, mission). The rendering pipeline uses Three.js with specific lighting, camera controls, object hierarchies, and post-processing effects. Performance is optimized through object pooling, LOD systems, and efficient texture management. Game state saving uses a structured JSON format with multiple save slots. The audio system implements real-time volume control by subscribing to global volume state changes. WebSocket connections are unified through a `CloudSyncManager` to ensure reliable real-time communication and authentication across all environments, including mini-games, by always using the current application URL. Player death handling and mission ID generation have been refined for stability and uniqueness.

## External Dependencies

-   **Frontend Framework**: React
-   **3D Graphics Library**: Three.js (via React Three Fiber)
-   **State Management**: Zustand
-   **Backend Framework**: Express
-   **Database**: PostgreSQL (Neon-backed)
-   **ORM**: Drizzle ORM
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Styling**: TailwindCSS with Radix UI components
-   **Authentication**: Session-based authentication
-   **Network Protocol**: WebSocket for real-time multiplayer communication