import { create } from 'zustand';
import { terrainGenerator, TerrainData } from '../../terrain/terrainGenerator';

interface TerrainState {
  currentTerrainData: TerrainData | null;
  isGenerating: boolean;
  
  // Generate or get cached terrain for a planet
  loadTerrainForPlanet: (planetName: string, forceRegenerate?: boolean) => Promise<TerrainData>;
  
  // Get height at world position
  getHeightAt: (x: number, z: number) => number;
  
  // Clear terrain cache
  clearCache: () => void;
}

export const useTerrain = create<TerrainState>((set, get) => ({
  currentTerrainData: null,
  isGenerating: false,
  
  loadTerrainForPlanet: async (planetName: string, forceRegenerate = false) => {
    const state = get();
    
    // Prevent concurrent generation
    if (state.isGenerating) {
      return state.currentTerrainData!;
    }
    
    set({ isGenerating: true });
    
    // Generate terrain in next frame to avoid blocking
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        console.log(`[TERRAIN] Generating terrain for ${planetName}...`);
        const startTime = performance.now();
        
        const terrainData = terrainGenerator.getTerrainData(
          planetName,
          400,  // width
          400,  // height
          100,  // segmentsX
          100,  // segmentsZ
          forceRegenerate
        );
        
        const endTime = performance.now();
        console.log(`[TERRAIN] Generated terrain for ${planetName} in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`[TERRAIN] Features: ${terrainData.features.craters.length} craters, ${terrainData.features.ridges.length} ridges, ${terrainData.features.valleys.length} valleys, ${terrainData.features.plateaus.length} plateaus, ${terrainData.features.volcanoes.length} volcanoes`);
        console.log(`[TERRAIN] Height range: ${terrainData.bounds.minHeight.toFixed(2)} to ${terrainData.bounds.maxHeight.toFixed(2)}`);
        
        set({
          currentTerrainData: terrainData,
          isGenerating: false
        });
        
        resolve(terrainData);
      });
    });
  },
  
  getHeightAt: (x: number, z: number) => {
    const state = get();
    if (!state.currentTerrainData) {
      // Fallback to simple calculation
      return Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2 +
             Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
    }
    
    const { vertices, segmentsX, segmentsZ, width, height } = state.currentTerrainData;
    
    // Convert world position to terrain grid coordinates
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const gridX = (x + halfWidth) / width * segmentsX;
    const gridZ = (z + halfHeight) / height * segmentsZ;
    
    // Get integer grid coordinates
    const x0 = Math.floor(Math.max(0, Math.min(segmentsX - 1, gridX)));
    const x1 = Math.min(segmentsX, x0 + 1);
    const z0 = Math.floor(Math.max(0, Math.min(segmentsZ - 1, gridZ)));
    const z1 = Math.min(segmentsZ, z0 + 1);
    
    // Get fractional parts for interpolation
    const fx = gridX - x0;
    const fz = gridZ - z0;
    
    // Get heights at corners
    const getHeight = (ix: number, iz: number): number => {
      const index = iz * (segmentsX + 1) + ix;
      return vertices[index * 3 + 1];
    };
    
    const h00 = getHeight(x0, z0);
    const h10 = getHeight(x1, z0);
    const h01 = getHeight(x0, z1);
    const h11 = getHeight(x1, z1);
    
    // Bilinear interpolation
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    
    return h0 * (1 - fz) + h1 * fz;
  },
  
  clearCache: () => {
    terrainGenerator.clearCache();
    set({ currentTerrainData: null });
  }
}));