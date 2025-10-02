import * as THREE from 'three';

// Simple seedable random number generator
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

// Improved Perlin/Simplex-like noise implementation
export class NoiseGenerator {
  private permutation: number[];
  private gradients3D: THREE.Vector3[];

  constructor(seed: number = 12345) {
    const rng = new SeededRandom(seed);
    
    // Create permutation table
    this.permutation = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    // Shuffle permutation table
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Duplicate for overflow
    for (let i = 0; i < 512; i++) {
      this.permutation[i] = p[i & 255];
    }

    // Generate gradient vectors
    this.gradients3D = [];
    for (let i = 0; i < 16; i++) {
      const theta = rng.next() * 2 * Math.PI;
      const z = rng.next() * 2 - 1;
      const r = Math.sqrt(1 - z * z);
      this.gradients3D.push(
        new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), z)
      );
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const grad = this.gradients3D[h];
    return grad.x * x + grad.y * y;
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;

    return this.lerp(v,
      this.lerp(u, this.grad(this.permutation[A], x, y),
                   this.grad(this.permutation[B], x - 1, y)),
      this.lerp(u, this.grad(this.permutation[A + 1], x, y - 1),
                   this.grad(this.permutation[B + 1], x - 1, y - 1))
    );
  }

  // Fractal Brownian Motion - combines multiple octaves of noise
  fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  // Ridge noise - creates sharp mountain ridges
  ridgeNoise(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.noise2D(x * frequency, y * frequency));
      value += n * n * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.1;
    }

    return value / maxValue;
  }

  // Turbulence - creates more chaotic patterns
  turbulence(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += Math.abs(this.noise2D(x * frequency, y * frequency)) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

// Terrain feature generators
export class TerrainFeatures {
  // Generate a crater at the given position
  static crater(
    x: number,
    z: number,
    centerX: number,
    centerZ: number,
    radius: number,
    depth: number,
    rimHeight: number = 0.3
  ): number {
    const distance = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
    
    if (distance > radius * 1.5) return 0;
    
    // Crater bowl with raised rim
    if (distance < radius) {
      // Inner crater - smooth bowl shape
      const t = distance / radius;
      const bowlDepth = -depth * (1 - t * t);
      return bowlDepth;
    } else if (distance < radius * 1.2) {
      // Raised rim
      const t = (distance - radius) / (radius * 0.2);
      return rimHeight * (1 - t);
    } else {
      // Ejecta falloff
      const t = (distance - radius * 1.2) / (radius * 0.3);
      return rimHeight * 0.3 * (1 - t);
    }
  }

  // Generate a ridge/mountain range
  static ridge(
    x: number,
    z: number,
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    width: number,
    height: number,
    noise: NoiseGenerator
  ): number {
    // Calculate distance from point to line segment
    const dx = endX - startX;
    const dz = endZ - startZ;
    const lengthSquared = dx * dx + dz * dz;
    
    if (lengthSquared === 0) return 0;
    
    const t = Math.max(0, Math.min(1, ((x - startX) * dx + (z - startZ) * dz) / lengthSquared));
    const projX = startX + t * dx;
    const projZ = startZ + t * dz;
    
    const distance = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2);
    
    if (distance > width) return 0;
    
    // Ridge profile with noise variation
    const profile = Math.pow(1 - distance / width, 2);
    const variation = noise.fbm(x * 0.1, z * 0.1, 2, 0.3) * 0.3 + 0.7;
    
    return height * profile * variation;
  }

  // Generate a valley/canyon
  static valley(
    x: number,
    z: number,
    centerLine: { x: number, z: number }[],
    width: number,
    depth: number,
    noise: NoiseGenerator
  ): number {
    // Find closest point on valley centerline
    let minDistance = Infinity;
    
    for (let i = 0; i < centerLine.length - 1; i++) {
      const start = centerLine[i];
      const end = centerLine[i + 1];
      
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const lengthSquared = dx * dx + dz * dz;
      
      if (lengthSquared > 0) {
        const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared));
        const projX = start.x + t * dx;
        const projZ = start.z + t * dz;
        
        const distance = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2);
        minDistance = Math.min(minDistance, distance);
      }
    }
    
    if (minDistance > width) return 0;
    
    // Valley profile - V-shaped with some variation
    const t = minDistance / width;
    const profile = -depth * (1 - t * t);
    const variation = noise.fbm(x * 0.05, z * 0.05, 2, 0.4) * 0.2;
    
    return profile + variation * Math.abs(profile);
  }

  // Generate a plateau/mesa
  static plateau(
    x: number,
    z: number,
    centerX: number,
    centerZ: number,
    radius: number,
    height: number,
    edgeSlope: number = 0.3
  ): number {
    const distance = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
    
    if (distance < radius * (1 - edgeSlope)) {
      // Flat top
      return height;
    } else if (distance < radius) {
      // Sloped edges
      const t = (distance - radius * (1 - edgeSlope)) / (radius * edgeSlope);
      return height * (1 - t);
    }
    
    return 0;
  }

  // Generate volcanic features
  static volcano(
    x: number,
    z: number,
    centerX: number,
    centerZ: number,
    radius: number,
    height: number,
    craterRadius: number
  ): number {
    const distance = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
    
    if (distance > radius) return 0;
    
    // Cone shape
    const coneHeight = height * (1 - distance / radius);
    
    // Central crater
    if (distance < craterRadius) {
      const craterDepth = height * 0.3 * (1 - (distance / craterRadius) ** 2);
      return coneHeight - craterDepth;
    }
    
    return coneHeight;
  }

  // Generate lava flow patterns
  static lavaFlow(
    x: number,
    z: number,
    flowPath: { x: number, z: number }[],
    width: number,
    height: number,
    noise: NoiseGenerator
  ): number {
    let minDistance = Infinity;
    
    for (let i = 0; i < flowPath.length - 1; i++) {
      const start = flowPath[i];
      const end = flowPath[i + 1];
      
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const lengthSquared = dx * dx + dz * dz;
      
      if (lengthSquared > 0) {
        const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared));
        const projX = start.x + t * dx;
        const projZ = start.z + t * dz;
        
        const distance = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2);
        
        // Width varies along flow
        const widthVariation = 1 + noise.noise2D(projX * 0.1, projZ * 0.1) * 0.3;
        const effectiveWidth = width * widthVariation;
        
        if (distance < effectiveWidth) {
          const flowHeight = height * (1 - distance / effectiveWidth);
          minDistance = Math.min(minDistance, -flowHeight); // Negative for raised flow
        }
      }
    }
    
    return minDistance === Infinity ? 0 : minDistance;
  }
}

// Planet-specific terrain configurations
export interface PlanetTerrainConfig {
  baseOctaves: number;
  basePersistence: number;
  baseLacunarity: number;
  baseScale: number;
  baseAmplitude: number;
  features: {
    craters?: { count: number; minRadius: number; maxRadius: number; minDepth: number; maxDepth: number };
    ridges?: { count: number; minLength: number; maxLength: number; minHeight: number; maxHeight: number };
    valleys?: { count: number; minLength: number; maxLength: number; minDepth: number; maxDepth: number };
    plateaus?: { count: number; minRadius: number; maxRadius: number; minHeight: number; maxHeight: number };
    volcanoes?: { count: number; minRadius: number; maxRadius: number; minHeight: number; maxHeight: number };
    lavaFlows?: { count: number; minLength: number; maxLength: number };
  };
  colorVariation?: {
    enabled: boolean;
    scale: number;
    intensity: number;
  };
}

export const PLANET_TERRAIN_CONFIGS: Record<string, PlanetTerrainConfig> = {
  Earth: {
    baseOctaves: 6,
    basePersistence: 0.5,
    baseLacunarity: 2.2,
    baseScale: 0.008,
    baseAmplitude: 12,
    features: {
      ridges: { count: 3, minLength: 80, maxLength: 150, minHeight: 8, maxHeight: 15 },
      valleys: { count: 5, minLength: 60, maxLength: 120, minDepth: 3, maxDepth: 6 },
      plateaus: { count: 2, minRadius: 15, maxRadius: 30, minHeight: 3, maxHeight: 6 },
    },
    colorVariation: {
      enabled: true,
      scale: 0.02,
      intensity: 0.1
    }
  },
  Mars: {
    baseOctaves: 5,
    basePersistence: 0.45,
    baseLacunarity: 2.3,
    baseScale: 0.007,
    baseAmplitude: 18,
    features: {
      craters: { count: 8, minRadius: 5, maxRadius: 20, minDepth: 2, maxDepth: 8 },
      valleys: { count: 6, minLength: 80, maxLength: 180, minDepth: 5, maxDepth: 12 },
      plateaus: { count: 3, minRadius: 20, maxRadius: 40, minHeight: 5, maxHeight: 10 },
    },
    colorVariation: {
      enabled: true,
      scale: 0.015,
      intensity: 0.15
    }
  },
  Moon: {
    baseOctaves: 4,
    basePersistence: 0.4,
    baseLacunarity: 2.1,
    baseScale: 0.01,
    baseAmplitude: 8,
    features: {
      craters: { count: 25, minRadius: 3, maxRadius: 25, minDepth: 1, maxDepth: 10 },
      plateaus: { count: 4, minRadius: 15, maxRadius: 35, minHeight: 0.5, maxHeight: 2 },
    },
    colorVariation: {
      enabled: false,
      scale: 0.01,
      intensity: 0.05
    }
  },
  Venus: {
    baseOctaves: 5,
    basePersistence: 0.6,
    baseLacunarity: 2.0,
    baseScale: 0.009,
    baseAmplitude: 10,
    features: {
      volcanoes: { count: 6, minRadius: 10, maxRadius: 25, minHeight: 8, maxHeight: 20 },
      lavaFlows: { count: 8, minLength: 40, maxLength: 100 },
      plateaus: { count: 5, minRadius: 10, maxRadius: 30, minHeight: 4, maxHeight: 8 },
      craters: { count: 2, minRadius: 5, maxRadius: 15, minDepth: 1, maxDepth: 3 },
    },
    colorVariation: {
      enabled: true,
      scale: 0.02,
      intensity: 0.2
    }
  },
  Mercury: {
    baseOctaves: 4,
    basePersistence: 0.35,
    baseLacunarity: 2.4,
    baseScale: 0.011,
    baseAmplitude: 12,
    features: {
      craters: { count: 30, minRadius: 2, maxRadius: 30, minDepth: 2, maxDepth: 15 },
      ridges: { count: 4, minLength: 60, maxLength: 120, minHeight: 3, maxHeight: 8 },
    },
    colorVariation: {
      enabled: false,
      scale: 0.008,
      intensity: 0.03
    }
  },
  Jupiter: {
    baseOctaves: 3,
    basePersistence: 0.7,
    baseLacunarity: 1.8,
    baseScale: 0.02,
    baseAmplitude: 3,
    features: {
      plateaus: { count: 8, minRadius: 20, maxRadius: 50, minHeight: 1, maxHeight: 3 },
    },
    colorVariation: {
      enabled: true,
      scale: 0.03,
      intensity: 0.3
    }
  },
  Saturn: {
    baseOctaves: 3,
    basePersistence: 0.65,
    baseLacunarity: 1.9,
    baseScale: 0.018,
    baseAmplitude: 4,
    features: {
      plateaus: { count: 6, minRadius: 25, maxRadius: 45, minHeight: 1, maxHeight: 4 },
    },
    colorVariation: {
      enabled: true,
      scale: 0.025,
      intensity: 0.25
    }
  },
  Uranus: {
    baseOctaves: 4,
    basePersistence: 0.5,
    baseLacunarity: 2.1,
    baseScale: 0.012,
    baseAmplitude: 6,
    features: {
      craters: { count: 10, minRadius: 5, maxRadius: 20, minDepth: 1, maxDepth: 5 },
      ridges: { count: 2, minLength: 50, maxLength: 100, minHeight: 2, maxHeight: 5 },
    },
    colorVariation: {
      enabled: true,
      scale: 0.02,
      intensity: 0.15
    }
  },
  Neptune: {
    baseOctaves: 4,
    basePersistence: 0.55,
    baseLacunarity: 2.0,
    baseScale: 0.013,
    baseAmplitude: 7,
    features: {
      craters: { count: 12, minRadius: 4, maxRadius: 18, minDepth: 1, maxDepth: 6 },
      valleys: { count: 4, minLength: 50, maxLength: 100, minDepth: 2, maxDepth: 5 },
    },
    colorVariation: {
      enabled: true,
      scale: 0.022,
      intensity: 0.18
    }
  }
};

// Default config for unknown planets
export const DEFAULT_TERRAIN_CONFIG: PlanetTerrainConfig = {
  baseOctaves: 4,
  basePersistence: 0.5,
  baseLacunarity: 2.0,
  baseScale: 0.01,
  baseAmplitude: 8,
  features: {
    craters: { count: 5, minRadius: 5, maxRadius: 15, minDepth: 1, maxDepth: 5 },
  },
  colorVariation: {
    enabled: false,
    scale: 0.01,
    intensity: 0.1
  }
};