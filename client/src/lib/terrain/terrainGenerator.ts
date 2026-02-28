import { NoiseGenerator, TerrainFeatures, PLANET_TERRAIN_CONFIGS, DEFAULT_TERRAIN_CONFIG, PlanetTerrainConfig } from './terrainGeneration';

interface Vec3 { x: number; y: number; z: number }

function vec3(x = 0, y = 0, z = 0): Vec3 { return { x, y, z }; }
function subVectors(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function crossVectors(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function addVectors(a: Vec3, b: Vec3): Vec3 { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function normalizeVec3(a: Vec3): Vec3 {
  const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

export interface TerrainData {
  vertices: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  width: number;
  height: number;
  segmentsX: number;
  segmentsZ: number;
  bounds: {
    minHeight: number;
    maxHeight: number;
  };
  features: {
    craters: Array<{ x: number; z: number; radius: number; depth: number }>;
    ridges: Array<{ startX: number; startZ: number; endX: number; endZ: number; height: number }>;
    valleys: Array<{ path: { x: number; z: number }[]; depth: number }>;
    plateaus: Array<{ x: number; z: number; radius: number; height: number }>;
    volcanoes: Array<{ x: number; z: number; radius: number; height: number }>;
  };
}

// Cache for generated terrain data
class TerrainCache {
  private cache: Map<string, TerrainData> = new Map();
  private maxCacheSize: number = 5;

  get(planetName: string): TerrainData | undefined {
    return this.cache.get(planetName);
  }

  set(planetName: string, data: TerrainData): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(planetName, data);
  }

  clear(): void {
    this.cache.clear();
  }

  has(planetName: string): boolean {
    return this.cache.has(planetName);
  }
}

export class TerrainGenerator {
  private noise: NoiseGenerator;
  private cache: TerrainCache;
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.noise = new NoiseGenerator(seed);
    this.cache = new TerrainCache();
  }

  // Get or generate terrain for a planet
  getTerrainData(
    planetName: string,
    width: number = 400,
    height: number = 400,
    segmentsX: number = 100,
    segmentsZ: number = 100,
    forceRegenerate: boolean = false
  ): TerrainData {
    // Check cache first
    if (!forceRegenerate && this.cache.has(planetName)) {
      const cached = this.cache.get(planetName);
      if (cached && cached.width === width && cached.height === height &&
          cached.segmentsX === segmentsX && cached.segmentsZ === segmentsZ) {
        return cached;
      }
    }

    // Generate new terrain
    const terrainData = this.generateTerrain(planetName, width, height, segmentsX, segmentsZ);
    
    // Cache the result
    this.cache.set(planetName, terrainData);
    
    return terrainData;
  }

  private generateTerrain(
    planetName: string,
    width: number,
    height: number,
    segmentsX: number,
    segmentsZ: number
  ): TerrainData {
    const config = PLANET_TERRAIN_CONFIGS[planetName] || DEFAULT_TERRAIN_CONFIG;
    const rng = new SeededRandom(this.seed + planetName.charCodeAt(0));

    // Generate features
    const features = this.generateFeatures(config, width, height, rng);

    // Generate height map
    const vertexCount = (segmentsX + 1) * (segmentsZ + 1);
    const vertices = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    let minHeight = Infinity;
    let maxHeight = -Infinity;

    // Generate vertices with height values
    for (let iz = 0; iz <= segmentsZ; iz++) {
      for (let ix = 0; ix <= segmentsX; ix++) {
        const index = iz * (segmentsX + 1) + ix;
        
        // World position
        const x = (ix / segmentsX - 0.5) * width;
        const z = (iz / segmentsZ - 0.5) * height;

        // Calculate height from base noise
        let y = this.calculateBaseHeight(x, z, config);

        // Add features
        y += this.applyFeatures(x, z, features, config);

        // Store vertex
        vertices[index * 3] = x;
        vertices[index * 3 + 1] = y;
        vertices[index * 3 + 2] = z;

        // UV coordinates
        uvs[index * 2] = ix / segmentsX;
        uvs[index * 2 + 1] = iz / segmentsZ;

        // Track bounds
        minHeight = Math.min(minHeight, y);
        maxHeight = Math.max(maxHeight, y);
      }
    }

    // Calculate normals
    this.calculateNormals(vertices, normals, segmentsX, segmentsZ);

    // Generate indices
    const indices = this.generateIndices(segmentsX, segmentsZ);

    return {
      vertices,
      normals,
      uvs,
      indices,
      width,
      height,
      segmentsX,
      segmentsZ,
      bounds: { minHeight, maxHeight },
      features
    };
  }

  private calculateBaseHeight(x: number, z: number, config: PlanetTerrainConfig): number {
    // Base terrain using FBM
    const baseHeight = this.noise.fbm(
      x * config.baseScale,
      z * config.baseScale,
      config.baseOctaves,
      config.basePersistence,
      config.baseLacunarity
    ) * config.baseAmplitude;

    // Add some ridge noise for more interesting terrain
    const ridgeNoise = this.noise.ridgeNoise(
      x * config.baseScale * 0.5,
      z * config.baseScale * 0.5,
      3
    ) * config.baseAmplitude * 0.3;

    return baseHeight + ridgeNoise;
  }

  private generateFeatures(config: PlanetTerrainConfig, width: number, height: number, rng: SeededRandom) {
    const features: TerrainData['features'] = {
      craters: [],
      ridges: [],
      valleys: [],
      plateaus: [],
      volcanoes: []
    };

    // Generate craters
    if (config.features.craters) {
      const { count, minRadius, maxRadius, minDepth, maxDepth } = config.features.craters;
      for (let i = 0; i < count; i++) {
        features.craters.push({
          x: (rng.next() - 0.5) * width * 0.8,
          z: (rng.next() - 0.5) * height * 0.8,
          radius: minRadius + rng.next() * (maxRadius - minRadius),
          depth: minDepth + rng.next() * (maxDepth - minDepth)
        });
      }
    }

    // Generate ridges
    if (config.features.ridges) {
      const { count, minLength, maxLength, minHeight, maxHeight } = config.features.ridges;
      for (let i = 0; i < count; i++) {
        const centerX = (rng.next() - 0.5) * width * 0.6;
        const centerZ = (rng.next() - 0.5) * height * 0.6;
        const angle = rng.next() * Math.PI * 2;
        const length = minLength + rng.next() * (maxLength - minLength);
        
        features.ridges.push({
          startX: centerX - Math.cos(angle) * length / 2,
          startZ: centerZ - Math.sin(angle) * length / 2,
          endX: centerX + Math.cos(angle) * length / 2,
          endZ: centerZ + Math.sin(angle) * length / 2,
          height: minHeight + rng.next() * (maxHeight - minHeight)
        });
      }
    }

    // Generate valleys
    if (config.features.valleys) {
      const { count, minLength, maxLength, minDepth, maxDepth } = config.features.valleys;
      for (let i = 0; i < count; i++) {
        const path: { x: number; z: number }[] = [];
        const startX = (rng.next() - 0.5) * width * 0.7;
        const startZ = (rng.next() - 0.5) * height * 0.7;
        const length = minLength + rng.next() * (maxLength - minLength);
        const segments = 5 + Math.floor(rng.next() * 5);
        
        // Create winding valley path
        let currentX = startX;
        let currentZ = startZ;
        let angle = rng.next() * Math.PI * 2;
        
        for (let j = 0; j <= segments; j++) {
          path.push({ x: currentX, z: currentZ });
          const segmentLength = length / segments;
          angle += (rng.next() - 0.5) * 0.8; // Vary direction
          currentX += Math.cos(angle) * segmentLength;
          currentZ += Math.sin(angle) * segmentLength;
        }
        
        features.valleys.push({
          path,
          depth: minDepth + rng.next() * (maxDepth - minDepth)
        });
      }
    }

    // Generate plateaus
    if (config.features.plateaus) {
      const { count, minRadius, maxRadius, minHeight, maxHeight } = config.features.plateaus;
      for (let i = 0; i < count; i++) {
        features.plateaus.push({
          x: (rng.next() - 0.5) * width * 0.7,
          z: (rng.next() - 0.5) * height * 0.7,
          radius: minRadius + rng.next() * (maxRadius - minRadius),
          height: minHeight + rng.next() * (maxHeight - minHeight)
        });
      }
    }

    // Generate volcanoes
    if (config.features.volcanoes) {
      const { count, minRadius, maxRadius, minHeight, maxHeight } = config.features.volcanoes;
      for (let i = 0; i < count; i++) {
        features.volcanoes.push({
          x: (rng.next() - 0.5) * width * 0.6,
          z: (rng.next() - 0.5) * height * 0.6,
          radius: minRadius + rng.next() * (maxRadius - minRadius),
          height: minHeight + rng.next() * (maxHeight - minHeight)
        });
      }
    }

    return features;
  }

  private applyFeatures(x: number, z: number, features: TerrainData['features'], config: PlanetTerrainConfig): number {
    let featureHeight = 0;

    // Apply craters
    for (const crater of features.craters) {
      featureHeight += TerrainFeatures.crater(
        x, z, crater.x, crater.z, 
        crater.radius, crater.depth, crater.depth * 0.3
      );
    }

    // Apply ridges
    for (const ridge of features.ridges) {
      featureHeight += TerrainFeatures.ridge(
        x, z, ridge.startX, ridge.startZ,
        ridge.endX, ridge.endZ, 15, ridge.height, this.noise
      );
    }

    // Apply valleys
    for (const valley of features.valleys) {
      featureHeight += TerrainFeatures.valley(
        x, z, valley.path, 20, valley.depth, this.noise
      );
    }

    // Apply plateaus
    for (const plateau of features.plateaus) {
      featureHeight += TerrainFeatures.plateau(
        x, z, plateau.x, plateau.z,
        plateau.radius, plateau.height, 0.3
      );
    }

    // Apply volcanoes
    for (const volcano of features.volcanoes) {
      featureHeight += TerrainFeatures.volcano(
        x, z, volcano.x, volcano.z,
        volcano.radius, volcano.height, volcano.radius * 0.3
      );

      // Add lava flows from volcanoes (Venus)
      if (config.features.lavaFlows) {
        const flowCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < flowCount; i++) {
          const flowPath: { x: number; z: number }[] = [];
          let flowX = volcano.x;
          let flowZ = volcano.z;
          const flowLength = 30 + Math.random() * 50;
          const flowAngle = (i / flowCount) * Math.PI * 2 + Math.random() * 0.5;
          
          for (let j = 0; j < 10; j++) {
            flowPath.push({ x: flowX, z: flowZ });
            flowX += Math.cos(flowAngle + Math.random() * 0.3) * (flowLength / 10);
            flowZ += Math.sin(flowAngle + Math.random() * 0.3) * (flowLength / 10);
          }
          
          featureHeight += TerrainFeatures.lavaFlow(
            x, z, flowPath, 3, volcano.height * 0.1, this.noise
          );
        }
      }
    }

    return featureHeight;
  }

  private calculateNormals(vertices: Float32Array, normals: Float32Array, segmentsX: number, segmentsZ: number): void {
    const getVertex = (ix: number, iz: number): Vec3 => {
      const index = iz * (segmentsX + 1) + ix;
      return vec3(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
    };

    for (let iz = 0; iz <= segmentsZ; iz++) {
      for (let ix = 0; ix <= segmentsX; ix++) {
        const index = iz * (segmentsX + 1) + ix;
        let normal = vec3();
        const v0 = getVertex(ix, iz);

        if (ix > 0 && iz > 0) {
          const v1 = getVertex(ix - 1, iz);
          const v2 = getVertex(ix, iz - 1);
          normal = addVectors(normal, crossVectors(subVectors(v1, v0), subVectors(v2, v0)));
        }

        if (ix < segmentsX && iz < segmentsZ) {
          const v1 = getVertex(ix + 1, iz);
          const v2 = getVertex(ix, iz + 1);
          normal = addVectors(normal, crossVectors(subVectors(v2, v0), subVectors(v1, v0)));
        }

        const n = normalizeVec3(normal);
        normals[index * 3] = n.x;
        normals[index * 3 + 1] = n.y;
        normals[index * 3 + 2] = n.z;
      }
    }
  }

  private generateIndices(segmentsX: number, segmentsZ: number): Uint32Array {
    const indices = new Uint32Array(segmentsX * segmentsZ * 6);
    let indexOffset = 0;

    for (let iz = 0; iz < segmentsZ; iz++) {
      for (let ix = 0; ix < segmentsX; ix++) {
        const a = iz * (segmentsX + 1) + ix;
        const b = a + 1;
        const c = a + segmentsX + 1;
        const d = c + 1;

        indices[indexOffset++] = a;
        indices[indexOffset++] = c;
        indices[indexOffset++] = b;

        indices[indexOffset++] = b;
        indices[indexOffset++] = c;
        indices[indexOffset++] = d;
      }
    }

    return indices;
  }

  // Get height at a specific world position (for collision detection)
  getHeightAt(x: number, z: number, planetName: string): number {
    const terrainData = this.cache.get(planetName);
    if (!terrainData) {
      // Fallback to simple calculation
      const config = PLANET_TERRAIN_CONFIGS[planetName] || DEFAULT_TERRAIN_CONFIG;
      return this.calculateBaseHeight(x, z, config);
    }

    // Find the closest vertices and interpolate
    const halfWidth = terrainData.width / 2;
    const halfHeight = terrainData.height / 2;
    
    // Convert world position to terrain grid coordinates
    const gridX = (x + halfWidth) / terrainData.width * terrainData.segmentsX;
    const gridZ = (z + halfHeight) / terrainData.height * terrainData.segmentsZ;
    
    // Get integer grid coordinates
    const x0 = Math.floor(Math.max(0, Math.min(terrainData.segmentsX - 1, gridX)));
    const x1 = Math.min(terrainData.segmentsX, x0 + 1);
    const z0 = Math.floor(Math.max(0, Math.min(terrainData.segmentsZ - 1, gridZ)));
    const z1 = Math.min(terrainData.segmentsZ, z0 + 1);
    
    // Get fractional parts
    const fx = gridX - x0;
    const fz = gridZ - z0;
    
    // Get heights at corners
    const getHeight = (ix: number, iz: number): number => {
      const index = iz * (terrainData.segmentsX + 1) + ix;
      return terrainData.vertices[index * 3 + 1];
    };
    
    const h00 = getHeight(x0, z0);
    const h10 = getHeight(x1, z0);
    const h01 = getHeight(x0, z1);
    const h11 = getHeight(x1, z1);
    
    // Bilinear interpolation
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    
    return h0 * (1 - fz) + h1 * fz;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Seeded random for feature generation
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

// Global terrain generator instance
export const terrainGenerator = new TerrainGenerator();