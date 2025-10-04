import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ExplosionEffectProps {
  position: THREE.Vector3;
  scale?: number;
  duration?: number;
  color?: string;
}

export function ExplosionEffect({ 
  position, 
  scale = 1, 
  duration = 1,
  color = "#ff8800" 
}: ExplosionEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now() / 1000);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    
    // Update explosion sphere
    if (sphereRef.current) {
      const sphereScale = scale * (1 + progress * 3);
      sphereRef.current.scale.setScalar(sphereScale);
      
      const material = sphereRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.8 * (1 - progress));
    }
    
    // Remove after duration
    if (progress >= 1) {
      groupRef.current.visible = false;
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Simple explosion sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Flash light */}
      <pointLight
        color={color}
        intensity={5}
        distance={10 * scale}
        decay={2}
      />
    </group>
  );
}