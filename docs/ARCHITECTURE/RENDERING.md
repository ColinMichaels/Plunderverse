# Rendering Architecture

## Engine Abstraction

All rendering goes through the `IRenderingEngine` interface defined in `engine/interfaces/RenderingEngine.ts`. This means game scenes only call engine-agnostic methods like `createMesh`, `createLight`, `createCamera`, `setPostProcessing`, etc.

The only implementation is `BabylonAdapter` (`engine/adapters/BabylonAdapter.ts`), which maps each interface call to Babylon.js 8.x APIs.

## Canvas and Lifecycle

```
BabylonCanvasWithInit
  └── creates <canvas> element
  └── calls useEngine() hook → BabylonAdapter.initialize(canvas)
  └── renders children as React components that call useEngine() to access adapter
  └── cleanup: disposes engine on unmount
```

The engine is created **synchronously** in `useEngine.tsx` (before async operations) to prevent React StrictMode's double-render from disposing the engine mid-initialization.

## Scene Switching

App.tsx switches between scenes based on `useLandedState.isLanded`:

```
isLanded === false  →  BabylonSolarSystem + BabylonCombatScene
isLanded === true   →  BabylonSurfaceScene
```

Both scenes share the same Babylon canvas and engine instance — only the mesh/light/camera setup changes. Each scene's `useEffect` cleans up its own resources on unmount.

## Post-Processing

Configured in each scene via `engine.setPostProcessing()`:
- Space: Glow (1.0), Bloom (0.5 threshold 0.6), Vignette (0.8)
- Surface: Directional sun light, sky dome color

## Particle Systems

Sun corona in `BabylonSolarSystem` uses Babylon's built-in particle system via `engine.createParticleSystem()`. Particle system IDs are tracked and disposed on scene unmount.

## Camera

- Camera created with `engine.createCamera({ id, type: 'perspective', ... })`
- `BabylonCameraController` reads keyboard/joystick input and calls `engine.setCameraTransform()` each frame
- Autopilot paths are computed in `useAutopilot` store and fed to the camera controller

## Resource Disposal and Memory

- `ResourceManager` (`lib/utils/ResourceManager.ts`) tracks resources by tag (e.g., `"space-scene"`, `"planet-surface"`)
- On scene transition: `resourceManager.disposeByTag(tag)` is called from `App.tsx`
- `memoryProfiler` logs memory snapshots before and after transitions
- `EngineErrorBoundary` wraps the canvas — any render crash shows a user-friendly "Try Again" screen

## Performance Notes

- 200 star spheres in BabylonSolarSystem — low poly, no shadows
- Planets use `sphere` primitives with emissive color — no textures (future: texture atlas)
- No shadow mapping currently active (avoids ~3x draw call cost)
- Post-processing pipeline runs per-frame; disable in settings for low-end devices
- `BabylonCombatScene` renders up to `maxEnemies = 1` ships by default to keep FPS stable
