import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Enemy as EnemyType } from "../../lib/stores/combat/useEnemies";

interface EnemyProps {
  enemy: EnemyType;
  onHit?: (enemyId: string) => void;
}

export function Enemy({ enemy, onHit }: EnemyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [previousHealth, setPreviousHealth] = useState(enemy.hull);
  
  // Flash effect when hit
  useEffect(() => {
    if (enemy.hull < previousHealth) {
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 100);
      setPreviousHealth(enemy.hull);
    }
  }, [enemy.hull, previousHealth]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Update position and rotation
    meshRef.current.position.copy(enemy.position);
    meshRef.current.rotation.y = enemy.rotation.y;
    
    // Death animation
    if (enemy.isDying) {
      const deathProgress = enemy.deathTime || 0;
      meshRef.current.scale.setScalar(enemy.scale * (1 - deathProgress * 0.5));
      meshRef.current.rotation.z = deathProgress * Math.PI * 2;
      meshRef.current.position.y -= deathProgress * 2;
    }
    
    // Pulse effect based on behavior
    if (enemy.behavior === 'aggressive') {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      meshRef.current.scale.setScalar(enemy.scale * pulse);
    }
    
    // Shield visual
    if (shieldRef.current) {
      shieldRef.current.visible = enemy.shield > 0;
      if (enemy.shield > 0) {
        const shieldAlpha = enemy.shield / enemy.maxShield;
        (shieldRef.current.material as THREE.MeshBasicMaterial).opacity = shieldAlpha * 0.3;
        shieldRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
      }
    }
  });
  
  // Ship design based on type
  const getShipGeometry = () => {
    switch (enemy.shipType) {
      case 'fighter':
        return <coneGeometry args={[0.3, 1, 4]} />;
      case 'patrol':
        return <boxGeometry args={[0.6, 0.3, 1]} />;
      case 'bomber':
        return <octahedronGeometry args={[0.5]} />;
      case 'elite':
        return <dodecahedronGeometry args={[0.4]} />;
      default:
        return <tetrahedronGeometry args={[0.5]} />;
    }
  };
  
  return (
    <group>
      {/* Main ship body */}
      <mesh ref={meshRef}>
        {getShipGeometry()}
        <meshStandardMaterial
          color={hitFlash ? "#ffffff" : enemy.color}
          emissive={enemy.color}
          emissiveIntensity={enemy.behavior === 'aggressive' ? 0.5 : 0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* Shield sphere */}
      <mesh ref={shieldRef} position={enemy.position}>
        <sphereGeometry args={[enemy.scale * 1.5, 16, 16]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Engine glow */}
      <mesh position={enemy.position.clone().add(new THREE.Vector3(0, 0, -0.5 * enemy.scale))}>
        <sphereGeometry args={[0.2 * enemy.scale, 8, 8]} />
        <meshBasicMaterial
          color="#ff8800"
          emissive="#ff8800"
          emissiveIntensity={2}
        />
      </mesh>
      
      {/* Health bar */}
      {!enemy.isDying && (
        <group position={enemy.position.clone().add(new THREE.Vector3(0, enemy.scale * 2, 0))}>
          {/* Background */}
          <mesh>
            <planeGeometry args={[1.2 * enemy.scale, 0.1]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          {/* Health */}
          <mesh position={[-(1.2 * enemy.scale * 0.5) * (1 - enemy.hull / enemy.maxHull), 0, 0.01]}>
            <planeGeometry args={[1.2 * enemy.scale * (enemy.hull / enemy.maxHull), 0.08]} />
            <meshBasicMaterial 
              color={enemy.hull / enemy.maxHull > 0.5 ? "#00ff00" : 
                    enemy.hull / enemy.maxHull > 0.25 ? "#ffaa00" : "#ff0000"} 
            />
          </mesh>
        </group>
      )}
    </group>
  );
}