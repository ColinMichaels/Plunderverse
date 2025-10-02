import * as THREE from 'three';

export interface PoissonDiskSample {
  position: THREE.Vector2;
  density: number; // 0.0 to 1.0 - affects object scale/count in this area
}

export interface PoissonDiskOptions {
  width: number;
  height: number;
  minDistance: number;
  maxTries?: number;
  densityFunction?: (x: number, z: number) => number; // Returns 0.0 to 1.0
  existingObjects?: Array<{ position: THREE.Vector3; radius: number }>;
}

/**
 * Poisson disk sampling for natural distribution of objects
 * Based on Bridson's algorithm for fast Poisson disk sampling
 */
export class PoissonDiskSampling {
  private width: number;
  private height: number;
  private minDistance: number;
  private maxTries: number;
  private cellSize: number;
  private gridCols: number;
  private gridRows: number;
  private grid: (PoissonDiskSample | null)[][];
  private densityFunction: (x: number, z: number) => number;
  private existingObjects: Array<{ position: THREE.Vector3; radius: number }>;

  constructor(options: PoissonDiskOptions) {
    this.width = options.width;
    this.height = options.height;
    this.minDistance = options.minDistance;
    this.maxTries = options.maxTries || 30;
    this.densityFunction = options.densityFunction || (() => 1.0);
    this.existingObjects = options.existingObjects || [];
    
    // Grid cell size for spatial indexing
    this.cellSize = this.minDistance / Math.sqrt(2);
    this.gridCols = Math.ceil(this.width / this.cellSize);
    this.gridRows = Math.ceil(this.height / this.cellSize);
    
    // Initialize grid
    this.grid = Array(this.gridRows)
      .fill(null)
      .map(() => Array(this.gridCols).fill(null));
  }

  /**
   * Generate samples using Poisson disk sampling
   */
  generateSamples(): PoissonDiskSample[] {
    const samples: PoissonDiskSample[] = [];
    const activeList: PoissonDiskSample[] = [];
    
    // Start with a random point
    const initialSample = this.createSample(
      Math.random() * this.width - this.width / 2,
      Math.random() * this.height - this.height / 2
    );
    
    if (this.isValidSample(initialSample, samples)) {
      samples.push(initialSample);
      activeList.push(initialSample);
      this.addToGrid(initialSample);
    }
    
    // Process active list
    while (activeList.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeList.length);
      const currentSample = activeList[randomIndex];
      let foundValidSample = false;
      
      // Try to generate new samples around current point
      for (let tries = 0; tries < this.maxTries; tries++) {
        const newSample = this.generateAroundPoint(currentSample);
        
        if (newSample && this.isValidSample(newSample, samples)) {
          samples.push(newSample);
          activeList.push(newSample);
          this.addToGrid(newSample);
          foundValidSample = true;
        }
      }
      
      // Remove from active list if no valid samples found
      if (!foundValidSample) {
        activeList.splice(randomIndex, 1);
      }
    }
    
    return samples;
  }

  /**
   * Create a sample with density value
   */
  private createSample(x: number, z: number): PoissonDiskSample {
    const density = this.densityFunction(x, z);
    return {
      position: new THREE.Vector2(x, z),
      density: Math.max(0, Math.min(1, density))
    };
  }

  /**
   * Generate a new sample around a given point
   */
  private generateAroundPoint(sample: PoissonDiskSample): PoissonDiskSample | null {
    const angle = Math.random() * Math.PI * 2;
    const distance = this.minDistance * (1 + Math.random()); // Between minDistance and 2*minDistance
    
    const x = sample.position.x + Math.cos(angle) * distance;
    const z = sample.position.y + Math.sin(angle) * distance;
    
    // Check bounds
    if (x < -this.width / 2 || x > this.width / 2 ||
        z < -this.height / 2 || z > this.height / 2) {
      return null;
    }
    
    return this.createSample(x, z);
  }

  /**
   * Check if a sample is valid (doesn't conflict with existing samples or objects)
   */
  private isValidSample(sample: PoissonDiskSample, samples: PoissonDiskSample[]): boolean {
    const x = sample.position.x;
    const z = sample.position.y;
    
    // Check against existing collision objects
    for (const obj of this.existingObjects) {
      // Skip objects without valid positions
      if (!obj || !obj.position) {
        continue;
      }
      const distance2D = Math.sqrt(
        Math.pow(x - obj.position.x, 2) + 
        Math.pow(z - obj.position.z, 2)
      );
      if (distance2D < this.minDistance + obj.radius) {
        return false;
      }
    }
    
    // Check neighboring grid cells
    const gridX = Math.floor((x + this.width / 2) / this.cellSize);
    const gridZ = Math.floor((z + this.height / 2) / this.cellSize);
    
    const searchRadius = 2; // Check neighboring cells
    for (let dz = -searchRadius; dz <= searchRadius; dz++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const checkX = gridX + dx;
        const checkZ = gridZ + dz;
        
        if (checkX >= 0 && checkX < this.gridCols &&
            checkZ >= 0 && checkZ < this.gridRows) {
          const neighbor = this.grid[checkZ][checkX];
          
          if (neighbor) {
            const distance = sample.position.distanceTo(neighbor.position);
            // Apply density-based distance modification
            const modifiedMinDistance = this.minDistance * 
              (1.0 - (sample.density * 0.3)); // Higher density allows closer packing
            
            if (distance < modifiedMinDistance) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Add sample to spatial grid
   */
  private addToGrid(sample: PoissonDiskSample): void {
    const gridX = Math.floor((sample.position.x + this.width / 2) / this.cellSize);
    const gridZ = Math.floor((sample.position.y + this.height / 2) / this.cellSize);
    
    if (gridX >= 0 && gridX < this.gridCols && 
        gridZ >= 0 && gridZ < this.gridRows) {
      this.grid[gridZ][gridX] = sample;
    }
  }
}

/**
 * Helper function to create density based on terrain features
 */
export function createTerrainDensityFunction(
  terrainData: any,
  getHeightAt: (x: number, z: number) => number
): (x: number, z: number) => number {
  return (x: number, z: number) => {
    // Calculate slope at this point
    const sampleDistance = 0.5;
    const h0 = getHeightAt(x, z);
    const h1 = getHeightAt(x + sampleDistance, z);
    const h2 = getHeightAt(x, z + sampleDistance);
    
    const slopeX = Math.abs(h1 - h0) / sampleDistance;
    const slopeZ = Math.abs(h2 - h0) / sampleDistance;
    const slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
    
    // Lower density on steep slopes
    let density = 1.0;
    if (slope > 0.5) {
      density *= Math.max(0.1, 1.0 - (slope - 0.5) * 2);
    }
    
    // Higher density near terrain features (if available)
    if (terrainData && terrainData.features) {
      const checkRadius = 10;
      
      // Check proximity to craters (higher density on crater floors)
      if (terrainData.features.craters) {
        for (const crater of terrainData.features.craters) {
          // Skip craters without valid center
          if (!crater || !crater.center) continue;
          
          const dist = Math.sqrt(
            Math.pow(x - crater.center.x, 2) + 
            Math.pow(z - crater.center.z, 2)
          );
          if (dist < crater.radius * 0.5) {
            density *= 1.5; // More debris in crater centers
          }
        }
      }
      
      // Check proximity to valleys (higher density in valleys)
      if (terrainData.features.valleys) {
        for (const valley of terrainData.features.valleys) {
          // Skip valleys without valid center
          if (!valley || !valley.center) continue;
          
          // Simple distance check to valley center
          const dist = Math.sqrt(
            Math.pow(x - valley.center.x, 2) + 
            Math.pow(z - valley.center.z, 2)
          );
          if (dist < checkRadius) {
            density *= 1.3;
          }
        }
      }
    }
    
    return Math.min(1.0, density);
  };
}