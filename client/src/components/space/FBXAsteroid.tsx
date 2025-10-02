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
    
    // Load the FBX model
    const randomModel =
      asteroidModels[Math.floor(Math.random() * asteroidModels.length)];
    const fbxModel = useFBX(randomModel);

    // Clone and configure the model for reuse
    const configuredModel = useMemo(() => {
      const clone = fbxModel.clone();

      // Traverse and apply materials to all meshes
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Create and register material for this asteroid
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness,
            metalness,
            emissive: new THREE.Color(emissive),
            emissiveIntensity,
          });
          
          // Register the material with ResourceManager
          resourceManager.registerMaterial(`${asteroidId}-material`, material, ['space-scene', 'asteroids']);
          
          // Apply the material to the mesh
          child.material = material;

          // Configure shadows
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;
          
          // Register the geometry if it exists
          if (child.geometry) {
            resourceManager.registerGeometry(`${asteroidId}-geometry`, child.geometry, ['space-scene', 'asteroids']);
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
        resourceManager.disposeResource(`${asteroidId}-geometry`);
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
