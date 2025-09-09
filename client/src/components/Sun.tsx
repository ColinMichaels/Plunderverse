import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";

export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  // Load sun texture
  const sunTexture = useTexture("/textures/planets/2k_sun.jpg");

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
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Sun point light - primary light source for planets */}
      <pointLight
        position={[0, 0, 0]}
        intensity={3}
        color="#FDB813"
        distance={2000}
        decay={1}
        castShadow
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

      {/* Sun core with texture */}
      <Sphere ref={meshRef} args={[5, 32, 32]}>
        <meshStandardMaterial
          map={sunTexture}
          emissive="#FDB813"
          emissiveIntensity={0.6}
          color="#FFD700"
        />
      </Sphere>

      {/* Corona effect */}
      <Sphere args={[7, 32, 32]}>
        <meshBasicMaterial
          color="#FFFF00"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}
