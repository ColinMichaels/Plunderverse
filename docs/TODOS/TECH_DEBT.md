# Tech Debt

Priority: **S** = small (< 1 day), **M** = medium (1–3 days), **L** = large (3+ days)

## Rendering / Engine

- [ ] **S** Replace splash screen R3F canvas (`SplashSolarSystem.tsx`) with Babylon or CSS
- [ ] **M** Replace `THREE.Vector3` in `useEnemies` / `useWeaponSystems` with plain `{x,y,z}` objects
- [ ] **M** Port `HolographicParrot` from R3F to Babylon particle/shader effect
- [ ] **L** Remove `three`, `@react-three/fiber`, `@react-three/drei` after full migration

## State Management

- [ ] **M** Replace all remaining uses of deprecated `useCredits` with `useCreditsStore`
- [ ] **M** Replace all remaining uses of deprecated `useInventory` with `useInventoryStore`
- [ ] **L** Move `useMining`, `useEquipment`, `useUpgrades` to domain pattern (`domain/`)

## Code Quality

- [ ] **S** Remove remaining `console.log` statements from production paths in `useEnemies` (947 total in codebase)
- [ ] **S** Remove `(window as any)` crew bonus access in `useEnemies` — replace with proper store subscription
- [ ] **M** Split `gameFacade.ts` (2,053 lines) into focused service classes
- [ ] **M** Split `App.tsx` cloud sync logic into a `CloudSyncProvider`
- [ ] **L** Split `MissionDebugPanel.tsx` (2,030 lines) into tab-separated sub-panels

## Mobile

- [ ] **S** Audit `BoostMeter.tsx` — uses R3F `useFrame`, determine if still needed
- [ ] **M** Refactor `StationDashboard.tsx` (1,479 lines) into smaller panel components

## Dependencies

- [ ] **S** Remove `r3f-perf` once R3F is fully removed
- [ ] **S** Remove `react-haiku` if no features use it (verify)
- [ ] **S** Remove `gl-matrix` if engine math utils cover all cases (verify)
- [ ] **S** Audit `ogl`, `meshline` (already removed) — confirm not re-added

## Tests

- [ ] **M** Add unit tests for `engine/utils/math.ts` (Vec3, Quat, Color)
- [ ] **M** Add unit tests for `lib/terrain/terrainGeneration.ts` noise functions
- [ ] **M** Add unit tests for economy domain stores (`credits.store`, `inventory.store`)
- [ ] **L** Add integration tests for scene switching (landed/space transitions)

## TypeScript

- [ ] **S** Remove `(window as any)` patterns — replace with proper typed window augmentation or store access
- [ ] **M** Add strict return types to all store action functions in `useEnemies` and `useWeaponSystems`
