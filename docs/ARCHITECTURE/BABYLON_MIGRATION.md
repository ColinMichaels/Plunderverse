# Babylon.js Migration Status

## Summary

The migration from Three.js / React Three Fiber (R3F) to Babylon.js is **~85% complete**.
All primary gameplay scenes now render in Babylon.js. The remaining R3F usage is isolated to minigames and splash screen.

## What's Done

| System | Status |
|--------|--------|
| Engine abstraction layer (`IRenderingEngine`) | Done |
| `BabylonAdapter` implementation | Done |
| `BabylonSolarSystem` (space flight) | Done |
| `BabylonSurfaceScene` (planet surface) | Done |
| `BabylonCombatScene` (enemies/projectiles) | Done |
| `BabylonCameraController` (keyboard/joystick) | Done |
| Post-processing pipeline | Done |
| Particle systems (sun corona) | Done |
| Store math decoupled from THREE.Vector3 (terrain, navigation) | Done |
| Dead Three.js code removed (`SolarSystem.tsx`, `PlanetSurfaceScene.tsx`, `CameraController.tsx`) | Done |

## Remaining Three.js / R3F Usage

| File | Usage | Priority to Remove |
|------|-------|--------------------|
| `components/screens/EnhancedSplashScreen.tsx` + `SplashSolarSystem.tsx` | R3F canvas for animated background | Medium |
| `components/minigames/AsteroidShootingGallery.tsx` | R3F Three.js mini-game | Low (standalone minigame) |
| `components/minigames/ZeroGravityRacing.tsx` | R3F Three.js mini-game | Low (standalone minigame) |
| `components/parrot/HolographicParrot.tsx` | R3F holographic effect | Low (cosmetic) |
| `components/ui/BoostMeter.tsx` | `useFrame` from R3F | Low (only used internally) |
| `lib/stores/combat/useEnemies.tsx` | `THREE.Vector3` for enemy positions | Medium (requires interface refactor) |
| `lib/stores/combat/useWeaponSystems.tsx` | `THREE.Vector3` for projectile math | Medium |

## Recommended Next Steps

### Step 1: Replace Splash Screen R3F Scene (Low Risk)
Create `BabylonSplashScene` using the existing engine abstraction, or replace with a CSS/canvas animated starfield. This removes one R3F `<Canvas>` from the critical path.

### Step 2: Replace Enemy/Projectile Positions (Medium Risk)
Change `Enemy.position` and `HomingProjectile.position` from `THREE.Vector3` to a plain `{ x, y, z }` object with a local math helper. The `BabylonCombatScene` already reads these and passes them to `engine.setNodeTransform()`.

### Step 3: Minigame Isolation (Low Priority)
The arcade minigames (Asteroids, Pong, Space Shooter, AsteroidShootingGallery, ZeroGravityRacing) use Phaser 3 and R3F independently. They are well-isolated and can remain until a dedicated minigame refactor.

### Step 4: Remove Three.js from package.json (After Steps 1-3)
Once `useEnemies`, `useWeaponSystems`, splash screen, and parrot are migrated, Three.js and R3F can be fully removed, saving ~500KB in the production bundle.

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking combat scene by changing Vector3 types | Medium | Enemy store has full type coverage; Babylon combat scene is the only consumer |
| Splash screen regression | Low | Splash screen is cosmetic; a CSS fallback is zero-risk |
| Minigame breakage | Low | Minigames are isolated behind their own routing/display logic |
| Engine crash in production | Low | `EngineErrorBoundary` provides graceful fallback |
