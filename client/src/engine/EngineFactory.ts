import type { IRenderingEngine, RenderingEngineType } from './interfaces/RenderingEngine';
import { BabylonAdapter } from './adapters/BabylonAdapter';

let activeEngine: IRenderingEngine | null = null;

export function createRenderingEngine(type: RenderingEngineType): IRenderingEngine {
  switch (type) {
    case 'babylon':
      return new BabylonAdapter();
    case 'three':
      console.warn('[EngineFactory] Three.js adapter not yet implemented - falling back to Babylon.js');
      return new BabylonAdapter();
    default:
      console.warn(`[EngineFactory] Unknown engine type: ${type} - falling back to Babylon.js`);
      return new BabylonAdapter();
  }
}

export function getActiveEngine(): IRenderingEngine | null {
  return activeEngine;
}

export function setActiveEngine(engine: IRenderingEngine | null): void {
  activeEngine = engine;
}

export function getPreferredEngine(): RenderingEngineType {
  const stored = localStorage.getItem('plunderverse_rendering_engine');
  if (stored === 'babylon' || stored === 'three') {
    return stored;
  }
  return 'babylon';
}

export function setPreferredEngine(type: RenderingEngineType): void {
  localStorage.setItem('plunderverse_rendering_engine', type);
}
