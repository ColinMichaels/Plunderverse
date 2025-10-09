# Plunderverse - Compressed Technical Specification

## Overview
"Plunderverse" is a 3D space outlaw game, inspired by Firefly, set in a bankrupt solar system in 2149. Built with React, Three.js, and Express, the game allows players to be smugglers and space outlaws engaging in dynamic gameplay loops: trade and survival, mission and story progression, and combat and notoriety management. The game features a procedurally generated, economically driven solar system, aiming to deliver a highly replayable outlaw experience with a rich narrative and emergent gameplay.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### 2025-10-09: Critical Mobile Login Bug Fix + Panel UI Standardization
- **Critical Bug Fix**: Fixed AuthProvider to show login screen when user is not authenticated
  - **Issue**: AuthProvider was rendering game even for unauthenticated users, causing stuck loading screen
  - **Fix**: Added check to show AuthScreen when `!isAuthenticated && !isGuest`
  - **Impact**: Mobile users can now log in on new browsers/devices (no longer stuck on loading screen)
- **Mobile Panel UI**: Standardized all mobile panels to match ShipRepairPanel compact header template
  - **Space Savings**: 30-40% reduction in header vertical space
  - **Structure**: Header (`p-2`), stats bar with integrated tabs (`bg-slate-700/50 px-2 py-1`), compact tabs (`px-2 py-0.5 text-[10px]`)
  - **Panels Updated**: MissionsPanel, MarketPanel, TradingPanel, TradeHistoryPanel, ShipUpgradePanel
  - **Design**: Solid colors (`bg-orange-600` active, `bg-slate-600` inactive) replace gradients

## System Architecture
The project employs a client-server architecture. The frontend utilizes React 18.3.1, Three.js (React Three Fiber 8.x), and Zustand 5.0 for state management. The backend is built with Express 4.x, PostgreSQL (Neon-backed), and Drizzle ORM. Development is supported by Vite 6.x and TypeScript 5.7, with styling managed by TailwindCSS 3.x and Radix UI components.

The game features three core gameplay loops:
1.  **Trade & Survive**: Involves resource mining, dynamic inter-station trading with fluctuating prices, and continuous management of resources like fuel, hull, oxygen, and crew wages. This loop integrates economic pressure, equipment degradation, and faction reputation.
2.  **Mission & Story**: Players undertake missions (delivery, combat, exploration) acquired from mission boards, with access tied to reputation. A multi-act story offers branching choices impacting karma and faction relations, leading to five distinct endings.
3.  **Combat & Heat**: Features turn-based combat against various enemy types. Illegal activities generate "heat," increasing notoriety, leading to aggressive patrols, and "shoot on sight" orders at higher levels.

The UI/UX is designed for responsiveness across desktop and mobile.
-   **Desktop**: Features a three-panel layout with a central 3D viewport, sidebars for navigation, and a bottom control bar.
-   **Mobile**: Offers a touch-optimized layout including a header, 3D viewport, virtual joystick, action bar, and slide-in overlay panels.
-   **Color Palette**: Employs deep space darks with vibrant cyan accents for interactive elements.
-   **Components**: Standardized button, panel, and HUD styles with defined CSS for transitions and feedback.
-   **Accessibility**: Includes features like colorblind modes, font scaling, screen reader support, and rebindable controls.

The system structure is hierarchical, managed by an `AuthProvider` that orchestrates `LoginScreen` and `GameContainer`. The `GameContainer` integrates a `ThreeCanvas` for 3D rendering, a `UILayer`, and an `AudioSystem`. Zustand stores manage various game states (player, ship, economy, combat, mission). The rendering pipeline uses Three.js with specific lighting, camera controls, object hierarchies, and post-processing effects. Performance is optimized through object pooling, LOD systems, and efficient texture management. Game state saving uses a structured JSON format with multiple save slots.

## External Dependencies

-   **Frontend Framework**: React 18.3.1
-   **3D Graphics Library**: Three.js (via React Three Fiber 8.x)
-   **State Management**: Zustand 5.0
-   **Backend Framework**: Express 4.x
-   **Database**: PostgreSQL (Neon-backed)
-   **ORM**: Drizzle ORM
-   **Build Tool**: Vite 6.x
-   **Language**: TypeScript 5.7
-   **Styling**: TailwindCSS 3.x with Radix UI components
-   **Authentication**: Session-based authentication (stored in PostgreSQL)
-   **Network Protocol**: WebSocket for real-time multiplayer communication