# Plunderverse - Compressed Technical Specification

## Overview
"Plunderverse" is a 3D space outlaw game, set in a bankrupt solar system in 2149. Built with React, Three.js, and Express, the game allows players to be smugglers and space outlaws engaging in dynamic gameplay loops: trade and survival, mission and story progression, and combat and notoriety management. The game features a procedurally generated, economically driven solar system, aiming to deliver a highly replayable outlaw experience with a rich narrative and emergent gameplay.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### 2025-10-12: Player Death Crash Fix - Radix UI Component Cleanup During Unmount
- **Death Screen Crash Fix**: Fixed infinite loop crash when player dies
  - **Issue**: "Maximum update depth exceeded" error when death screen appears, causing app to freeze/crash
  - **Root Cause**: Radix UI components (Slider in ParrotSettingsPanel, ScrollAreas in various panels) tried to update state during unmount when death screen appeared
  - **Solution**: Wrapped all UI components containing Radix elements in `phase !== "ended"` conditionals to unmount cleanly before death screen, plus added mounted flag to ParrotSettingsPanel useEffect
  - **Components Fixed**: NavigationSidebar, ActionBar, OrbitalInterface, MobileHUD, MusicPlayer, MainMenu, SaveGamePanel, BottomControlSidebar
  - **Impact**: Player death now works smoothly without crashes, death screen displays properly, revival flow intact

### 2025-10-12: WebSocket Connection Fix - Proper Environment Handling
- **WebSocket Environment Fix**: Fixed WebSocket connection failures in Replit production environment
  - **Issue**: Multiple WebSocket connection errors - both Vite HMR and CloudSync failing with undefined ports
  - **Root Cause**: CloudSync using localhost in production, HMR patch not detecting Replit environment properly
  - **Solution**: Updated CloudSyncWebSocket to properly detect dev vs production, improved HMR detection in websocketPatch
  - **Dev Behavior**: Uses `ws://localhost:5000/ws/sync` for CloudSync, patches HMR to use port 5000
  - **Production Behavior**: Uses current hostname with appropriate port (443 for wss, 80 for ws), HMR gets proper Replit URL
  - **Impact**: Eliminated all WebSocket connection errors, both Vite HMR and CloudSync working properly

### 2025-10-11: Performance Fix - Eliminated Excessive Material Logging
- **Performance Optimization**: Fixed AtmosphericEffects fog plane material regeneration causing performance issues
  - **Issue**: Fog plane materials used `Date.now()` in IDs, creating new materials every render, causing console spam and performance degradation
  - **Solution**: Removed `Date.now()` from material IDs, using stable IDs: `fog-plane-material-${height}-${planetName}`
  - **Logging**: Disabled verbose material registration logging in ResourceManager and AtmosphericEffects
  - **Impact**: Eliminated thousands of console logs per second, improved rendering performance

### 2025-10-11: Fixed React Duplicate Key Warning in Mission IDs
- **Mission ID Fix**: Fixed duplicate React key warning by improving mission ID generation
  - **Issue**: Mission IDs included seed with location name, causing location to appear twice (e.g., `Earth_0_player1_timestamp_playerId_Earth_1`)
  - **Root Cause**: Seed pattern `${playerId}:${location}:${gameDay}` contained location, duplicating it in final mission ID
  - **Solution**: Replaced seed with random string: `${location}_mission${i}_rank${playerRank}_${timestamp}_${random9chars}`
  - **Impact**: Eliminated all React duplicate key warnings, truly unique mission IDs
  - **Pattern**: Earth_mission0_rank1_1760225145123_a2b3c4d5e

### 2025-10-11: Fixed Player Stats & Authentication UI on Splash Screen
- **Stats Panel Fix**: Fixed player stats panel visibility and interaction on splash screen
  - **Issue**: Account dropdown was always visible, stats panel not showing properly
  - **Solution**: Made dropdown conditional, added click trigger button, implemented click-outside handler
  - **Impact**: Player stats now properly display when authenticated, account menu works correctly
  - **UI Flow**: Minimized stats always visible → Hover expands details → Click user for account menu

### 2025-10-11: WebSocket Authentication Fix
- **WebSocket Auth**: Added authentication tokens to CloudSyncManager WebSocket connections
  - **Issue**: WebSocket connections failing due to missing authentication tokens
  - **Solution**: Added token to WebSocket URL as query parameter
  - **Impact**: Stable WebSocket connections, no more connection errors

### 2025-10-11: Mining System Crash Fixes
- **Mining Fix**: Fixed spacebar mining crash on planet surfaces
  - **Issue**: Resource data undefined when pressing spacebar, causing crash
  - **Solution**: Added resource data to collision registration, comprehensive null checks
  - **Impact**: Mining system now stable and crash-free

### 2025-10-09: Unified Sync Architecture - Consolidated WebSocket Connections
- **Sync Consolidation**: Removed duplicate WebSocket in MiniGameSyncService, unified with CloudSyncManager
  - **Issue**: Mini-game created separate WebSocket connection causing duplicate connections and sync errors
  - **Solution**: Refactored MiniGameSyncService to use CloudSyncManager's existing WebSocket via message handlers
  - **Impact**: Single WebSocket for all sync (desktop + mobile mini-game), eliminates connection errors
  - **Architecture**: MiniGameSyncService registers/unregisters message handlers with CloudSyncManager when mini-game activates/deactivates
  - **Queuing**: All messages route through CloudSyncManager's queue system for reliable delivery

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