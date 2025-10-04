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

  // Bright yellow for visibility
  const laserColor = "#ffff00";

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial
        color={laserColor}
      />
    </mesh>
  );
}
