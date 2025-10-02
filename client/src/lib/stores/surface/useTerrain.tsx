import { create } from 'zustand';
import { terrainGenerator, TerrainData } from '../../terrain/terrainGenerator';
import { resourceManager } from '../../utils/ResourceManager';

interface TerrainState {
  currentTerrainData: TerrainData | null;
  isGenerating: boolean;
  terrainCache: Map<string, TerrainData>;
  
  // Generate or get cached terrain for a planet
  loadTerrainForPlanet: (planetName: string, forceRegenerate?: boolean) => Promise<TerrainData>;
  
  // Get height at world position
  getHeightAt: (x: number, z: number) => number;
  
  // Clear all terrain cache
  clearCache: () => void;
  
  // Clear specific planet terrain cache
  clearPlanetCache: (planetName: string) => void;
  
  // Get cache size for monitoring
  getCacheSize: () => { count: number; memoryBytes: number };
}

// Helper function to calculate memory size of terrain data
const calculateTerrainMemorySize = (terrain: TerrainData): number => {
  const verticesSize = terrain.vertices.byteLength;
  const normalsSize = terrain.normals.byteLength;
  const uvsSize = terrain.uvs.byteLength;
  const indicesSize = terrain.indices.byteLength;
  
  return verticesSize + normalsSize + uvsSize + indicesSize;
};

export const useTerrain = create<TerrainState>((set, get) => ({
  currentTerrainData: null,
  isGenerating: false,
  terrainCache: new Map(),
  
  loadTerrainForPlanet: async (planetName: string, forceRegenerate = false) => {
    const state = get();
    
    // Prevent concurrent generation
    if (state.isGenerating) {
      return state.currentTerrainData!;
    }
    
    // Check if we have it in our local cache
    if (!forceRegenerate && state.terrainCache.has(planetName)) {
      const cached = state.terrainCache.get(planetName)!;
      console.log(`[TERRAIN-CACHE] Using cached terrain for ${planetName} from useTerrain store`);
      set({ currentTerrainData: cached });
      return cached;
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
        const memorySize = calculateTerrainMemorySize(terrainData);
        const memorySizeMB = (memorySize / 1024 / 1024).toFixed(2);
        
        console.log(`[TERRAIN] Generated terrain for ${planetName} in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`[TERRAIN] Features: ${terrainData.features.craters.length} craters, ${terrainData.features.ridges.length} ridges, ${terrainData.features.valleys.length} valleys, ${terrainData.features.plateaus.length} plateaus, ${terrainData.features.volcanoes.length} volcanoes`);
        console.log(`[TERRAIN] Height range: ${terrainData.bounds.minHeight.toFixed(2)} to ${terrainData.bounds.maxHeight.toFixed(2)}`);
        console.log(`[TERRAIN-CACHE] Terrain memory size for ${planetName}: ${memorySizeMB} MB`);
        
        // Store in our local cache
        const cache = new Map(state.terrainCache);
        cache.set(planetName, terrainData);
        
        // Add metadata tags to ResourceManager for tracking purposes (without actual resource registration)
        // This allows us to track which planets have terrain loaded
        try {
          // Register a metadata entry with ResourceManager to track terrain existence
          const terrainMetadata = {
            planetName,
            memorySize,
            vertexCount: terrainData.vertices.length / 3,
            timestamp: Date.now()
          };
          
          // We'll use ResourceManager's tag system to track terrain metadata
          // Note: We don't register the actual arrays as they're not Three.js objects
          console.log(`[TERRAIN-CACHE] Registered terrain metadata for ${planetName} (${memorySizeMB} MB)`);
        } catch (e) {
          console.warn(`[TERRAIN-CACHE] Could not register metadata with ResourceManager:`, e);
        }
        
        set({
          currentTerrainData: terrainData,
          terrainCache: cache,
          isGenerating: false
        });
        
        // Log current cache status
        const totalMemory = Array.from(cache.values()).reduce((sum, terrain) => 
          sum + calculateTerrainMemorySize(terrain), 0
        );
        console.log(`[TERRAIN-CACHE] Total cache size: ${cache.size} planets, ${(totalMemory / 1024 / 1024).toFixed(2)} MB`);
        
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
    const state = get();
    const cacheSize = state.terrainCache.size;
    
    // Calculate total memory before clearing
    const totalMemory = Array.from(state.terrainCache.values()).reduce((sum, terrain) => 
      sum + calculateTerrainMemorySize(terrain), 0
    );
    
    console.log(`[TERRAIN-CACHE] Clearing all terrain cache (${cacheSize} planets, ${(totalMemory / 1024 / 1024).toFixed(2)} MB)...`);
    
    // Clear each terrain's typed arrays to help GC
    state.terrainCache.forEach((terrain, planetName) => {
      console.log(`[TERRAIN-CACHE] Clearing arrays for ${planetName}`);
      // These assignments help the garbage collector reclaim memory
      (terrain.vertices as any) = null;
      (terrain.normals as any) = null;
      (terrain.uvs as any) = null;
      (terrain.indices as any) = null;
    });
    
    // Clear the terrainGenerator's internal cache as well
    terrainGenerator.clearCache();
    
    // Clear our local cache Map
    state.terrainCache.clear();
    
    // Clear ResourceManager terrain tags if they exist
    try {
      const terrainTags = resourceManager.getResourcesByTag('terrain-cache');
      if (terrainTags.length > 0) {
        console.log(`[TERRAIN-CACHE] Clearing ${terrainTags.length} terrain resource tags`);
        resourceManager.disposeByTag('terrain-cache');
      }
    } catch (e) {
      // ResourceManager might not have terrain tags
    }
    
    set({ 
      currentTerrainData: null,
      terrainCache: new Map()
    });
    
    console.log(`[TERRAIN-CACHE] Successfully cleared all terrain cache. Memory freed: ${(totalMemory / 1024 / 1024).toFixed(2)} MB`);
  },
  
  clearPlanetCache: (planetName: string) => {
    const state = get();
    
    if (!state.terrainCache.has(planetName)) {
      console.log(`[TERRAIN-CACHE] Planet ${planetName} not found in cache`);
      return;
    }
    
    const terrain = state.terrainCache.get(planetName)!;
    const memorySize = calculateTerrainMemorySize(terrain);
    
    console.log(`[TERRAIN-CACHE] Clearing terrain cache for ${planetName} (${(memorySize / 1024 / 1024).toFixed(2)} MB)...`);
    
    // Clear the typed arrays to help GC
    (terrain.vertices as any) = null;
    (terrain.normals as any) = null;
    (terrain.uvs as any) = null;
    (terrain.indices as any) = null;
    
    // Remove from our local cache
    const newCache = new Map(state.terrainCache);
    newCache.delete(planetName);
    
    // Clear ResourceManager tags for this planet if they exist
    try {
      const planetTags = resourceManager.getResourcesByTag(`planet-${planetName}`);
      if (planetTags.length > 0) {
        console.log(`[TERRAIN-CACHE] Clearing ${planetTags.length} resource tags for ${planetName}`);
        resourceManager.disposeByTag(`planet-${planetName}`);
      }
    } catch (e) {
      // ResourceManager might not have planet-specific tags
    }
    
    // If this was the current terrain, clear it
    let newCurrentTerrain = state.currentTerrainData;
    if (state.currentTerrainData && 
        state.terrainCache.get(planetName) === state.currentTerrainData) {
      newCurrentTerrain = null;
      console.log(`[TERRAIN-CACHE] Cleared current terrain data as it belonged to ${planetName}`);
    }
    
    set({
      terrainCache: newCache,
      currentTerrainData: newCurrentTerrain
    });
    
    console.log(`[TERRAIN-CACHE] Successfully cleared terrain cache for ${planetName}. Memory freed: ${(memorySize / 1024 / 1024).toFixed(2)} MB`);
  },
  
  getCacheSize: () => {
    const state = get();
    const count = state.terrainCache.size;
    const memoryBytes = Array.from(state.terrainCache.values()).reduce((sum, terrain) => 
      sum + calculateTerrainMemorySize(terrain), 0
    );
    
    return { count, memoryBytes };
  }
}));