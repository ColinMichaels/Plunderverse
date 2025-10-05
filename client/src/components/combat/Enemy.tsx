import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Enemy as EnemyType } from "../../lib/stores/combat/useEnemies";

interface EnemyProps {
  enemy: EnemyType;
  onHit?: (enemyId: string) => void;
}

export function Enemy({ enemy, onHit }: EnemyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Update position and rotation
    meshRef.current.position.copy(enemy.position);
    meshRef.current.rotation.y = enemy.rotation.y;
    
    // Simple death animation - just shrink and fall
    if (enemy.isDying) {
      const deathProgress = enemy.deathTime || 0;
      meshRef.current.scale.setScalar(enemy.scale * (1 - deathProgress));
      meshRef.current.position.y -= deathProgress * 5;
    }
  });
  
  // Scale enemies larger for easier targeting (3-5x based on ship type)
  const visualScale = enemy.scale * 4;
  
  return (
    <group>
      {/* Enemy ship - scaled for visibility, colored by faction */}
      <mesh ref={meshRef} scale={visualScale}>
        <boxGeometry args={[1, 0.6, 1.5]} />
        <meshStandardMaterial 
          color={enemy.color} 
          emissive={enemy.color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Engine glow effect */}
      <mesh position={[0, 0, -visualScale * 0.8]} scale={visualScale * 0.3}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}