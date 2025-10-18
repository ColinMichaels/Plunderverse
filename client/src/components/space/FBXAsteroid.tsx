import { useRef, forwardRef, useMemo, useEffect } from "react";
import { useFBX } from "@react-three/drei";
import * as THREE from "three";
import { resourceManager } from "../../lib/utils/ResourceManager";

/* want to randomize the asteroid model and color used for the Astroid FBX files. Create an array of the different models to randomly place  */

const asteroidModels = [
  "/geometries/Asteroid_1b.fbx",
  "/geometries/_asteroid_01.fbx",
  "/geometries/_asteroid_02.fbx",
  "/geometries/_asteroid_03.fbx",
  "/geometries/_asteroid_04.fbx",
  "/geometries/_asteroid_05.fbx",
  "/geometries/_asteroid_06.fbx",
  "/geometries/_asteroid_07.fbx",
  "/geometries/_asteroid_08.fbx",
  "/geometries/_asteroid_09.fbx",
  "/geometries/_asteroid_010.fbx",
];

// Pre-load all asteroid models to prevent stuttering on first spawn
// This runs once when the module is loaded
let preloadInitiated = false;
export const preloadAsteroidModels = () => {
  if (!preloadInitiated) {
    preloadInitiated = true;
    console.log("[FBXAsteroid] Pre-loading asteroid models...");
    
    // Pre-load each model using useFBX.preload
    asteroidModels.forEach((model, index) => {
      try {
        useFBX.preload(model);
        console.log(`[FBXAsteroid] Pre-loaded model ${index + 1}/${asteroidModels.length}: ${model}`);
      } catch (error) {
        console.warn(`[FBXAsteroid] Failed to pre-load model: ${model}`, error);
      }
    });
    
    console.log("[FBXAsteroid] Pre-loading complete!");
  }
};

interface FBXAsteroidProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  color?: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export const FBXAsteroid = forwardRef<THREE.Group, FBXAsteroidProps>(
  (
    {
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      scale = 1,
      color = "#666666",
      roughness = 0.8,
      metalness = 0.01,
      emissive = "#000000",
      emissiveIntensity = 0,
      castShadow = true,
      receiveShadow = true,
      onClick,
      onPointerOver,
      onPointerOut,
    },
    ref,
  ) => {
    // Generate a unique ID for this asteroid instance
    const asteroidId = useRef(`asteroid-${Math.random().toString(36).substr(2, 9)}`).current;
    
    // Select random model once per component instance using useMemo
    const randomModel = useMemo(() => {
      const modelIndex = Math.floor(Math.random() * asteroidModels.length);
      return asteroidModels[modelIndex];
    }, []); // Empty dependency array ensures this only runs once per instance
    
    // Load the FBX model
    const fbxModel = useFBX(randomModel);

    // Clone and configure the model for reuse
    const configuredModel = useMemo(() => {
      const clone = fbxModel.clone();
      
      // Create shared material once for all meshes
      const materialId = `${asteroidId}-material`;
      let sharedMaterial = resourceManager.getResource<THREE.Material>(materialId);
      
      if (!sharedMaterial) {
        sharedMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness,
          metalness,
          emissive: new THREE.Color(emissive),
          emissiveIntensity,
        });
        
        // Register the material with ResourceManager once
        resourceManager.registerMaterial(materialId, sharedMaterial, ['space-scene', 'asteroids']);
      }

      // Track which geometries we've already registered to avoid duplicates
      const registeredGeometries = new Set<string>();

      // Traverse and apply materials to all meshes
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Apply the shared material to this mesh
          child.material = sharedMaterial;

          // Configure shadows
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;
          
          // Register unique geometries only once
          if (child.geometry) {
            // Create a unique ID for this specific geometry
            const geometryHash = child.geometry.uuid;
            const geometryId = `${asteroidId}-geometry-${geometryHash}`;
            
            if (!registeredGeometries.has(geometryHash) && !resourceManager.hasResource(geometryId)) {
              resourceManager.registerGeometry(geometryId, child.geometry, ['space-scene', 'asteroids']);
              registeredGeometries.add(geometryHash);
            }
          }
        }
      });

      return clone;
    }, [
      fbxModel,
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
      castShadow,
      receiveShadow,
      asteroidId,
    ]);

    // Cleanup resources on unmount
    useEffect(() => {
      console.log(`[FBXAsteroid ${asteroidId}] Component mounted`);
      
      return () => {
        console.log(`[FBXAsteroid ${asteroidId}] Cleaning up resources`);
        // Dispose asteroid-specific resources
        resourceManager.disposeResource(`${asteroidId}-material`);
        
        // Dispose all geometry resources for this asteroid
        // Since we create unique geometry IDs with UUIDs, we need to dispose by tag
        const asteroidResources = resourceManager.getResourcesByTag('asteroids');
        asteroidResources.forEach(resourceId => {
          if (resourceId.startsWith(`${asteroidId}-geometry-`)) {
            resourceManager.disposeResource(resourceId);
          }
        });
      };
    }, [asteroidId]);

    return (
      <group
        ref={ref}
        position={position}
        rotation={rotation}
        scale={scale}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <primitive object={configuredModel} />
      </group>
    );
  },
);

FBXAsteroid.displayName = "FBXAsteroid";
