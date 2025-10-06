import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Enemy as EnemyType } from "../../lib/stores/combat/useEnemies";
import { EnemyHealthBar } from "./EnemyHealthBar";
import { useFocusState } from "@/lib/stores/ui/useFocusState";

interface EnemyProps {
  enemy: EnemyType;
  onHit?: (enemyId: string) => void;
}

export function Enemy({ enemy, onHit }: EnemyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastHullValue, setLastHullValue] = useState(enemy.hull);
  const { isPaused } = useFocusState();
  
  // Detect when enemy takes damage and trigger flash
  useEffect(() => {
    if (enemy.hull < lastHullValue && !enemy.isDying) {
      setIsFlashing(true);
      // Flash for 200ms
      const timer = setTimeout(() => setIsFlashing(false), 200);
      // Trigger onHit callback
      if (onHit) onHit(enemy.id);
      setLastHullValue(enemy.hull);
      return () => clearTimeout(timer);
    }
    setLastHullValue(enemy.hull);
  }, [enemy.hull, enemy.isDying, enemy.id, lastHullValue, onHit]);
  
  useFrame(() => {
    if (!meshRef.current || isPaused) return; // Don't update if paused
    
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
  
  // Flash color when hit
  const flashColor = isFlashing ? "#ffffff" : enemy.color;
  const flashEmissive = isFlashing ? "#ff0000" : enemy.color;
  const flashIntensity = isFlashing ? 0.8 : 0.3;
  
  return (
    <group>
      {/* Enemy ship - scaled for visibility, colored by faction */}
      <mesh ref={meshRef} scale={visualScale}>
        <boxGeometry args={[1, 0.6, 1.5]} />
        <meshStandardMaterial 
          color={flashColor} 
          emissive={flashEmissive}
          emissiveIntensity={flashIntensity}
        />
        {/* Health bar positioned above the enemy */}
        <EnemyHealthBar enemy={enemy} />
      </mesh>
      
      {/* Engine glow effect */}
      <mesh position={[0, 0, -visualScale * 0.8]} scale={visualScale * 0.3}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}