import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSurfaceCollision } from '../../lib/stores/surface/useSurfaceCollision';
import { useTerrain } from '../../lib/stores/surface/useTerrain';
import { PoissonDiskSampling, createTerrainDensityFunction } from '../../lib/poissonDiskSampling';
import { ResourceManager } from '../../lib/utils/ResourceManager';

// Planet-specific scatter configurations
interface ScatterConfig {
  categories: {
    [key: string]: {
      minScale: number;
      maxScale: number;
      count: number;
      geometryType: 'box' | 'sphere' | 'tetrahedron' | 'octahedron' | 'cylinder';
      colorVariation: number; // 0.0 to 1.0
      baseColor: string;
    };
  };
  totalMaxObjects: number;
  minSpacing: number;
  lodDistances: [number, number, number]; // Near, medium, far distances
}

const PLANET_CONFIGS: { [key: string]: ScatterConfig } = {
  Earth: {
    categories: {
      grassTufts: {
        minScale: 0.1,
        maxScale: 0.3,
        count: 800,
        geometryType: 'cylinder',
        colorVariation: 0.3,
        baseColor: '#4a7c59'
      },
      smallStones: {
        minScale: 0.05,
        maxScale: 0.15,
        count: 600,
        geometryType: 'box',
        colorVariation: 0.2,
        baseColor: '#8b7355'
      },
      twigs: {
        minScale: 0.08,
        maxScale: 0.25,
        count: 400,
        geometryType: 'cylinder',
        colorVariation: 0.2,
        baseColor: '#654321'
      },
      pebbles: {
        minScale: 0.02,
        maxScale: 0.08,
        count: 1000,
        geometryType: 'sphere',
        colorVariation: 0.3,
        baseColor: '#808080'
      }
    },
    totalMaxObjects: 2800,
    minSpacing: 0.8,
    lodDistances: [30, 60, 100]
  },
  Mars: {
    categories: {
      redDustDrifts: {
        minScale: 0.15,
        maxScale: 0.4,
        count: 600,
        geometryType: 'box',
        colorVariation: 0.15,
        baseColor: '#cd5c5c'
      },
      rustRocks: {
        minScale: 0.05,
        maxScale: 0.2,
        count: 800,
        geometryType: 'octahedron',
        colorVariation: 0.25,
        baseColor: '#a0522d'
      },
      sandPiles: {
        minScale: 0.1,
        maxScale: 0.35,
        count: 400,
        geometryType: 'sphere',
        colorVariation: 0.1,
        baseColor: '#d2691e'
      },
      debris: {
        minScale: 0.03,
        maxScale: 0.1,
        count: 1200,
        geometryType: 'tetrahedron',
        colorVariation: 0.2,
        baseColor: '#bc6c25'
      }
    },
    totalMaxObjects: 3000,
    minSpacing: 0.7,
    lodDistances: [35, 65, 110]
  },
  Moon: {
    categories: {
      regolithParticles: {
        minScale: 0.02,
        maxScale: 0.08,
        count: 1500,
        geometryType: 'sphere',
        colorVariation: 0.1,
        baseColor: '#c0c0c0'
      },
      microCraters: {
        minScale: 0.1,
        maxScale: 0.3,
        count: 500,
        geometryType: 'cylinder',
        colorVariation: 0.05,
        baseColor: '#808080'
      },
      moonDust: {
        minScale: 0.05,
        maxScale: 0.15,
        count: 1000,
        geometryType: 'box',
        colorVariation: 0.08,
        baseColor: '#d3d3d3'
      },
      smallRocks: {
        minScale: 0.04,
        maxScale: 0.12,
        count: 800,
        geometryType: 'tetrahedron',
        colorVariation: 0.12,
        baseColor: '#a9a9a9'
      }
    },
    totalMaxObjects: 3800,
    minSpacing: 0.6,
    lodDistances: [40, 70, 120]
  },
  Venus: {
    categories: {
      volcanicRocks: {
        minScale: 0.08,
        maxScale: 0.25,
        count: 700,
        geometryType: 'octahedron',
        colorVariation: 0.2,
        baseColor: '#8b4513'
      },
      obsidianShards: {
        minScale: 0.05,
        maxScale: 0.15,
        count: 900,
        geometryType: 'tetrahedron',
        colorVariation: 0.05,
        baseColor: '#0c0c0c'
      },
      sulfurDeposits: {
        minScale: 0.1,
        maxScale: 0.3,
        count: 400,
        geometryType: 'box',
        colorVariation: 0.15,
        baseColor: '#ffff00'
      },
      lavaDebris: {
        minScale: 0.03,
        maxScale: 0.12,
        count: 1100,
        geometryType: 'sphere',
        colorVariation: 0.25,
        baseColor: '#ff4500'
      }
    },
    totalMaxObjects: 3100,
    minSpacing: 0.75,
    lodDistances: [32, 62, 105]
  },
  Mercury: {
    categories: {
      sharpDebris: {
        minScale: 0.05,
        maxScale: 0.18,
        count: 1000,
        geometryType: 'tetrahedron',
        colorVariation: 0.15,
        baseColor: '#696969'
      },
      metallicFragments: {
        minScale: 0.03,
        maxScale: 0.1,
        count: 1200,
        geometryType: 'octahedron',
        colorVariation: 0.1,
        baseColor: '#708090'
      },
      craterEjecta: {
        minScale: 0.08,
        maxScale: 0.22,
        count: 600,
        geometryType: 'box',
        colorVariation: 0.18,
        baseColor: '#595959'
      },
      ironPebbles: {
        minScale: 0.02,
        maxScale: 0.07,
        count: 1400,
        geometryType: 'sphere',
        colorVariation: 0.08,
        baseColor: '#483d8b'
      }
    },
    totalMaxObjects: 4200,
    minSpacing: 0.5,
    lodDistances: [38, 68, 115]
  }
};

// Default config for unknown planets
const DEFAULT_CONFIG: ScatterConfig = {
  categories: {
    rocks: {
      minScale: 0.05,
      maxScale: 0.2,
      count: 600,
      geometryType: 'box',
      colorVariation: 0.2,
      baseColor: '#808080'
    },
    pebbles: {
      minScale: 0.02,
      maxScale: 0.08,
      count: 1000,
      geometryType: 'sphere',
      colorVariation: 0.15,
      baseColor: '#696969'
    },
    debris: {
      minScale: 0.03,
      maxScale: 0.12,
      count: 800,
      geometryType: 'tetrahedron',
      colorVariation: 0.25,
      baseColor: '#595959'
    }
  },
  totalMaxObjects: 2400,
  minSpacing: 0.8,
  lodDistances: [35, 65, 100]
};

interface ScatterInstancedMeshProps {
  category: string;
  config: ScatterConfig['categories'][string];
  instances: Array<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
    colorOffset: THREE.Color;
  }>;
  lodDistances: [number, number, number];
  planetColor: string;
}

function ScatterInstancedMesh({ 
  category, 
  config, 
  instances, 
  lodDistances,
  planetColor 
}: ScatterInstancedMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const resourceManager = ResourceManager.getInstance();
  const geometryIdRef = useRef<string>(`scatter-geometry-${category}-${Date.now()}`);
  const materialIdRef = useRef<string>(`scatter-material-${category}-${Date.now()}`);
  
  // Create geometry based on type
  const geometry = useMemo(() => {
    const geom = (() => {
      switch (config.geometryType) {
        case 'box':
          return new THREE.BoxGeometry(1, 1, 1);
        case 'sphere':
          return new THREE.SphereGeometry(0.5, 6, 4);
        case 'tetrahedron':
          return new THREE.TetrahedronGeometry(0.6, 0);
        case 'octahedron':
          return new THREE.OctahedronGeometry(0.5, 0);
        case 'cylinder':
          return new THREE.CylinderGeometry(0.3, 0.4, 1, 5);
        default:
          return new THREE.BoxGeometry(1, 1, 1);
      }
    })();
    
    // Register geometry with ResourceManager
    resourceManager.registerGeometry(geometryIdRef.current, geom, ['surface-scatter', category]);
    console.log(`[SurfaceScatter] Registered geometry for ${category}: ${geometryIdRef.current}`);
    
    return geom;
  }, [config.geometryType, category]);

  // Setup instance matrices and colors
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    instances.forEach((instance, i) => {
      matrix.compose(
        instance.position,
        new THREE.Quaternion().setFromEuler(instance.rotation),
        new THREE.Vector3(instance.scale, instance.scale, instance.scale)
      );
      mesh.setMatrixAt(i, matrix);

      // Apply color variation
      color.copy(instance.colorOffset);
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [instances]);

  // LOD system - update visibility based on distance
  const frameCounter = useRef(0);
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Only update every 15 frames to significantly reduce CPU load
    frameCounter.current++;
    if (frameCounter.current % 15 !== 0) return;

    const mesh = meshRef.current;
    const cameraPosition = camera.position;
    
    // Simple LOD: Hide distant objects
    instances.forEach((instance, i) => {
      const distance = cameraPosition.distanceTo(instance.position);
      
      let scale = instance.scale;
      
      // Apply LOD scaling
      if (distance > lodDistances[2]) {
        scale = 0; // Hide completely
      } else if (distance > lodDistances[1]) {
        scale *= 0.5; // Half size at medium distance
      } else if (distance > lodDistances[0]) {
        scale *= 0.8; // Slightly smaller at near-medium distance
      }
      
      // Update instance matrix with LOD scale
      const matrix = new THREE.Matrix4();
      matrix.compose(
        instance.position,
        new THREE.Quaternion().setFromEuler(instance.rotation),
        new THREE.Vector3(scale, scale, scale)
      );
      mesh.setMatrixAt(i, matrix);
    });
    
    mesh.instanceMatrix.needsUpdate = true;
  });

  // Mix planet color with base color
  const materialColor = useMemo(() => {
    const base = new THREE.Color(config.baseColor);
    const planet = new THREE.Color(planetColor);
    return base.lerp(planet, 0.3);
  }, [config.baseColor, planetColor]);

  // Register material and cleanup
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      resourceManager.registerMaterial(materialIdRef.current, meshRef.current.material, ['surface-scatter', category]);
      console.log(`[SurfaceScatter] Registered material for ${category}: ${materialIdRef.current}`);
    }
    
    return () => {
      // Dispose of resources when component unmounts
      console.log(`[SurfaceScatter] Disposing resources for ${category}`);
      resourceManager.disposeById(geometryIdRef.current);
      resourceManager.disposeById(materialIdRef.current);
    };
  }, [category]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, instances.length]}
      castShadow={false}
      receiveShadow={true}
      frustumCulled={true}
    >
      <meshStandardMaterial
        color={materialColor}
        roughness={0.9}
        metalness={config.geometryType === 'octahedron' && category.includes('metallic') ? 0.3 : 0.05}
      />
    </instancedMesh>
  );
}

interface SurfaceScatterProps {
  planetName: string;
  planetColor?: string;
}

export function SurfaceScatter({ planetName, planetColor = '#808080' }: SurfaceScatterProps) {
  const { collisionObjects } = useSurfaceCollision();
  const { currentTerrainData, getHeightAt } = useTerrain();
  const resourceManager = ResourceManager.getInstance();
  
  // Get configuration for this planet
  const config = PLANET_CONFIGS[planetName] || DEFAULT_CONFIG;
  
  // Cleanup resources when planet changes or component unmounts
  useEffect(() => {
    console.log(`[SurfaceScatter] Initializing scatter for planet: ${planetName}`);
    
    return () => {
      console.log(`[SurfaceScatter] Cleaning up scatter resources for planet: ${planetName}`);
      // Dispose all resources tagged with surface-scatter
      resourceManager.disposeByTag('surface-scatter');
      resourceManager.disposeByTag(`planet-${planetName}`);
    };
  }, [planetName]);
  
  // Generate scatter instances using Poisson disk sampling
  const scatterInstances = useMemo(() => {
    if (!currentTerrainData) return {};
    
    const instances: { [category: string]: Array<{
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: number;
      colorOffset: THREE.Color;
    }> } = {};
    
    // Create density function based on terrain
    const densityFunction = createTerrainDensityFunction(
      currentTerrainData,
      getHeightAt
    );
    
    // Prepare existing objects for collision avoidance
    const existingObjects = collisionObjects
      .filter(obj => obj && obj.position) // Filter out objects without valid positions
      .map(obj => ({
        position: obj.position,
        radius: obj.radius + 0.5 // Add buffer
      }));
    
    // Generate samples for each category
    Object.entries(config.categories).forEach(([category, catConfig]) => {
      instances[category] = [];
      
      // Create Poisson disk sampler with much smaller area for performance
      const sampler = new PoissonDiskSampling({
        width: 100, // Significantly reduced for better performance
        height: 100,
        minDistance: config.minSpacing * 2, // Increase spacing to reduce density
        densityFunction,
        existingObjects,
        maxTries: 10 // Reduce max tries for faster generation
      });
      
      // Generate samples
      const samples = sampler.generateSamples();
      
      // Limit to much smaller count for better performance
      const maxCount = Math.min(catConfig.count, 200); // Cap at 200 objects per category
      const limitedSamples = samples.slice(0, maxCount);
      
      // Create instances from samples
      limitedSamples.forEach(sample => {
        const x = sample.position.x;
        const z = sample.position.y;
        const y = getHeightAt(x, z);
        
        // Random variations
        const scaleVariation = Math.random() * (catConfig.maxScale - catConfig.minScale) + catConfig.minScale;
        const scaleDensityMod = 0.8 + sample.density * 0.4; // Density affects size
        const finalScale = scaleVariation * scaleDensityMod;
        
        // Random rotation
        const rotation = new THREE.Euler(
          Math.random() * 0.2 - 0.1, // Slight tilt
          Math.random() * Math.PI * 2, // Full Y rotation
          Math.random() * 0.2 - 0.1 // Slight tilt
        );
        
        // Color variation
        const baseColor = new THREE.Color(catConfig.baseColor);
        const colorVariation = catConfig.colorVariation;
        const r = baseColor.r + (Math.random() - 0.5) * colorVariation;
        const g = baseColor.g + (Math.random() - 0.5) * colorVariation;
        const b = baseColor.b + (Math.random() - 0.5) * colorVariation;
        
        // Add slight position offset for more natural look
        const positionOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          0,
          (Math.random() - 0.5) * 0.1
        );
        
        instances[category].push({
          position: new THREE.Vector3(
            x + positionOffset.x,
            y + finalScale * 0.5, // Place on surface
            z + positionOffset.z
          ),
          rotation,
          scale: finalScale,
          colorOffset: new THREE.Color(
            Math.max(0, Math.min(1, r)),
            Math.max(0, Math.min(1, g)),
            Math.max(0, Math.min(1, b))
          )
        });
      });
    });
    
    // Log scatter statistics
    const totalInstances = Object.values(instances).reduce((sum, cat) => sum + cat.length, 0);
    console.log(`[SCATTER] Generated ${totalInstances} scatter objects for ${planetName}:`, 
      Object.entries(instances).map(([cat, inst]) => `${cat}: ${inst.length}`).join(', ')
    );
    
    return instances;
  }, [planetName, currentTerrainData, collisionObjects, config, getHeightAt]);
  
  return (
    <group name="surface-scatter">
      {Object.entries(scatterInstances).map(([category, instances]) => (
        instances.length > 0 && (
          <ScatterInstancedMesh
            key={category}
            category={category}
            config={config.categories[category]}
            instances={instances}
            lodDistances={config.lodDistances}
            planetColor={planetColor}
          />
        )
      ))}
    </group>
  );
}