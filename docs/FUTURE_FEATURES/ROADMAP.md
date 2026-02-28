# Feature Roadmap

## Near-Term (Next Sprint)

- **Textured Planets**: Replace solid-color planet spheres with texture atlases in `BabylonSolarSystem`
- **Landing Animation**: Smooth descent transition when landing on a planet (Babylon camera animation)
- **Combat Feedback**: Screen flash and shake on player hull damage (Babylon post-processing effect)
- **Minigame Integration**: Connect Phaser minigame rewards to the economy domain store

## Mid-Term (1–3 Months)

- **Procedural Planet Surfaces**: Use terrain data from `terrainGenerator.ts` to render a real mesh in `BabylonSurfaceScene`
- **Multi-Enemy Combat**: Increase `maxEnemies` with proper LOD and culling for performance
- **Faction Reputation UI**: Visual reputation meter per faction in the HUD
- **Trade Route Map**: Interactive solar system map showing profitable trade routes
- **Crew Abilities Active Use**: Expose crew bonuses through UI actions (hack, negotiate, pilot boost)
- **Save/Load from Server**: Complete cloud save integration (currently WebSocket sync is partial)

## Long-Term (3+ Months)

- **Ship Customization**: Visual ship model selection + loadout screen
- **Multiplayer Encounters**: Real-time player-vs-player patrol encounters via WebSocket
- **Station Interiors**: Babylon.js interior scenes for space stations (trading, repairs, bar)
- **Full Story Campaign**: Branching narrative across all 8 planets
- **WebGPU Support**: Add a WebGPU adapter stub to `IRenderingEngine` for future performance uplift
- **Controller Support**: Gamepad input via `navigator.getGamepads()` mapped to `BabylonCameraController`

## Dependencies / Blockers

| Feature | Blocked By |
|---------|------------|
| Procedural terrain mesh | `terrainGenerator.ts` integration into `BabylonSurfaceScene` |
| Multi-enemy combat | Performance profiling at 3–5 enemies with post-processing on |
| WebGPU adapter | Babylon.js WebGPU renderer stable release |
| Multiplayer | Auth system + WebSocket reliability improvements |
