import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { resourceManager } from "../../lib/utils/ResourceManager";

export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  
  // Load sun texture
  const sunTexture = useTexture("/textures/planets/2k_sun.jpg");

  // Register resources with ResourceManager
  useEffect(() => {
    console.log("[Sun] Registering resources with ResourceManager");
    
    // Register sun texture
    resourceManager.registerTexture("sun-texture", sunTexture, ['space-scene', 'sun']);
    
    return () => {
      console.log("[Sun] Cleaning up resources");
      // Dispose sun-specific resources
      resourceManager.disposeResource("sun-texture");
    };
  }, [sunTexture]);

  useFrame((state) => {
    // Rotate the sun slowly
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }

    // Animate the glow
    if (glowRef.current) {
      const time = state.clock.elapsedTime;
      glowRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
    }

    // Set directional light target for proper shading direction
    if (directionalLightRef.current) {
      directionalLightRef.current.target.position.set(100, 0, 100);
      directionalLightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Enhanced sun lighting - primary light source for realistic planet shading */}
      <pointLight
        position={[0, 0, 0]}
        intensity={5}
        color="#FDB813"
        distance={3000}
        decay={0.8}
      />
      
      {/* Directional light for enhanced texture shading with proper targeting */}
      <directionalLight
        ref={directionalLightRef}
        position={[10, 10, 10]}
        intensity={2}
        color="#FFE4B5"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-camera-near={1}
        shadow-camera-far={500}
      />

      {/* Sun glow */}
      <Sphere ref={glowRef} args={[6, 32, 32]}>
        <meshBasicMaterial
          color="#FDB813"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Sun core with enhanced emission for better lighting */}
      <Sphere ref={meshRef} args={[5, 32, 32]}>
        <meshStandardMaterial
          map={sunTexture}
          emissive="#FDB813"
          emissiveIntensity={0.9}
          color="#FFD700"
          roughness={0.1}
          metalness={0.0}
        />
      </Sphere>

      {/* Enhanced corona effect for realistic sun appearance */}
      <Sphere args={[7, 32, 32]}>
        <meshBasicMaterial
          color="#FFFF00"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer corona layer for more depth */}
      <Sphere args={[8.5, 32, 32]}>
        <meshBasicMaterial
          color="#FFA500"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}
