import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Projectile } from "../../lib/stores/combat/useShooting";

interface LaserProps {
  projectile: Projectile;
}

export function Laser({ projectile }: LaserProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(projectile.position);
    }
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.05, 0.15, 0.15, 8]} />
      <meshStandardMaterial
        color="#00ffff"
        emissive="#ff0000"
        emissiveIntensity={10.8}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
