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
      // Point laser in direction of travel
      meshRef.current.lookAt(
        projectile.position.clone().add(projectile.direction)
      );
      meshRef.current.rotateX(Math.PI / 2);
    }
  });

  // Different colors for player vs enemy projectiles
  const laserColor = projectile.ownerType === 'player' ? "#00ffff" : "#ff4444";
  const emissiveColor = projectile.ownerType === 'player' ? "#0088ff" : "#ff0000";

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.05, 0.15, 0.5, 8]} />
      <meshStandardMaterial
        color={laserColor}
        emissive={emissiveColor}
        emissiveIntensity={2.0}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}
