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
      meshRef.current.scale.setScalar(2 * (1 - deathProgress));
      meshRef.current.position.y -= deathProgress * 5;
    }
  });
  
  return (
    <group>
      {/* Simple box enemy - RED color for visibility */}
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
    </group>
  );
}