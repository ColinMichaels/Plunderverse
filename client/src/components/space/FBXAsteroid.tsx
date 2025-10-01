import { useRef, forwardRef, useMemo } from "react";
import { useFBX } from "@react-three/drei";
import * as THREE from "three";

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
    // Load the FBX model
    const fbxModel = useFBX("/geometries/Asteroid_1b.fbx");

    // Clone and configure the model for reuse
    const configuredModel = useMemo(() => {
      const clone = fbxModel.clone();

      // Traverse and apply materials to all meshes
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Apply the custom material properties
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness,
            metalness,
            emissive: new THREE.Color(emissive),
            emissiveIntensity,
          });

          // Configure shadows
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;
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
    ]);

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
