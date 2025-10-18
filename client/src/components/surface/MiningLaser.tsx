import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useMining } from "../../lib/stores/economy/useMining";
import { useSurfacePlayer } from "../../lib/stores/surface/useSurfacePlayer";
import * as THREE from "three";
import { Line } from "@react-three/drei";

interface MiningLaserProps {
  targetPosition: [number, number, number];
  nodeId: string;
}

// Get color based on rarity
const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case "common":
      return "#10B981"; // Green
    case "uncommon":
      return "#3B82F6"; // Blue
    case "rare":
      return "#8B5CF6"; // Purple
    case "legendary":
      return "#F59E0B"; // Orange
    default:
      return "#6B7280"; // Gray
  }
};

// Spark particle traveling along the beam
function LaserSpark({ 
  startPos, 
  endPos, 
  progress, 
  color 
}: { 
  startPos: THREE.Vector3; 
  endPos: THREE.Vector3; 
  progress: number; 
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      // Interpolate position along the beam
      meshRef.current.position.lerpVectors(startPos, endPos, progress);
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial 
        color={color}
      />
    </mesh>
  );
}

// Impact particles at the target
function ImpactParticles({ 
  position, 
  color, 
  intensity 
}: { 
  position: THREE.Vector3; 
  color: string; 
  intensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Generate particle positions
  const particles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      ),
      phase: Math.random() * Math.PI * 2
    }));
  }, []);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.02;
      
      groupRef.current.children.forEach((child, i) => {
        const particle = particles[i];
        if (particle) {
          const time = state.clock.elapsedTime;
          const pulse = Math.sin(time * 4 + particle.phase) * 0.3 + 0.7;
          child.scale.setScalar(pulse * intensity * 0.8);
        }
      });
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {particles.map((particle) => (
        <mesh key={particle.id} position={particle.offset}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshBasicMaterial
            color={color}
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

export function MiningLaser({ targetPosition, nodeId }: MiningLaserProps) {
  const { 
    isActive, 
    currentNodeId, 
    targetResource, 
    clicksCompleted, 
    clicksRequired 
  } = useMining();
  const { position: playerPosition } = useSurfacePlayer();
  
  // TODO: Sound effects needed:
  // 1. Laser beam activation sound (continuous hum/buzz while active)
  // 2. Laser impact sound (crackling/sizzling at the target)
  // 3. Power-up sound when laser intensity increases with progress
  // 4. Power-down sound when mining stops
  // 5. Different laser sounds based on resource rarity (higher pitch for legendary)
  
  const beamRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const sparksRef = useRef<{ progress: number }[]>([
    { progress: 0 },
    { progress: 0.33 },
    { progress: 0.66 }
  ]);
  
  // Calculate beam start and end positions (hooks must be called unconditionally)
  const startPos = useMemo(() => {
    return new THREE.Vector3(
      playerPosition.x, 
      playerPosition.y + 0.5, // Slightly above ground level
      playerPosition.z
    );
  }, [playerPosition]);
  
  const endPos = useMemo(() => {
    return new THREE.Vector3(...targetPosition);
  }, [targetPosition]);
  
  // Calculate beam direction and distance
  const beamDirection = useMemo(() => {
    return new THREE.Vector3().subVectors(endPos, startPos).normalize();
  }, [startPos, endPos]);
  
  const beamDistance = useMemo(() => {
    return startPos.distanceTo(endPos);
  }, [startPos, endPos]);
  
  // Calculate beam midpoint for positioning
  const beamMidpoint = useMemo(() => {
    return new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
  }, [startPos, endPos]);
  
  // Calculate rotation to align cylinder with beam direction
  const quaternion = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(up, beamDirection);
    return quaternion;
  }, [beamDirection]);
  
  // Calculate mining progress and color (conditionally)
  const miningProgress = (isActive && currentNodeId === nodeId && clicksRequired > 0) 
    ? clicksCompleted / clicksRequired 
    : 0;
  
  const laserColor = targetResource 
    ? getRarityColor(targetResource.rarity)
    : '#00ff00';
  
  const laserColorThree = new THREE.Color(laserColor);
  
  // Update beam animation
  useFrame((state) => {
    // Only update if actively mining this node
    if (!isActive || currentNodeId !== nodeId || !targetResource) return;
    
    const time = state.clock.elapsedTime;
    
    // Update main beam
    if (beamRef.current) {
      // Pulsing effect synced with mining progress
      const basePulse = Math.sin(time * 3) * 0.1 + 0.9;
      const progressPulse = miningProgress * 0.5 + 0.5;
      const scale = basePulse * progressPulse;
      
      beamRef.current.scale.x = scale * 0.3;
      beamRef.current.scale.z = scale * 0.3;
      
      // Rotate beam slightly for energy effect
      beamRef.current.rotation.y += 0.01;
    }
    
    // Update glow beam
    if (glowRef.current) {
      const glowPulse = Math.sin(time * 2 + Math.PI/2) * 0.2 + 0.8;
      const glowScale = glowPulse * (miningProgress * 0.7 + 0.3);
      
      glowRef.current.scale.x = glowScale * 0.6;
      glowRef.current.scale.z = glowScale * 0.6;
      
      // Counter-rotate for variation
      glowRef.current.rotation.y -= 0.005;
    }
    
    // Update spark positions
    sparksRef.current.forEach((spark, i) => {
      spark.progress += 0.02 * (1 + miningProgress);
      if (spark.progress > 1) {
        spark.progress = 0;
      }
    });
  });
  
  // Only render if this node is being mined
  if (!isActive || currentNodeId !== nodeId || !targetResource) {
    return null;
  }
  
  return (
    <group>
      {/* Main laser beam */}
      <mesh 
        ref={beamRef}
        position={beamMidpoint}
        quaternion={quaternion}
      >
        <cylinderGeometry args={[0.1, 0.15, beamDistance, 8]} />
        <meshBasicMaterial
          color={laserColor}
          transparent={true}
          opacity={0.7 + miningProgress * 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Glow beam (wider, more transparent) */}
      <mesh 
        ref={glowRef}
        position={beamMidpoint}
        quaternion={quaternion}
      >
        <cylinderGeometry args={[0.2, 0.3, beamDistance, 8]} />
        <meshBasicMaterial
          color={laserColor}
          transparent={true}
          opacity={0.2 + miningProgress * 0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Energy line core */}
      <Line
        points={[startPos, endPos]}
        color={laserColor}
        lineWidth={2}
        transparent={true}
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
      
      {/* Traveling sparks */}
      {sparksRef.current.map((spark, i) => (
        <LaserSpark
          key={i}
          startPos={startPos}
          endPos={endPos}
          progress={spark.progress}
          color={laserColor}
        />
      ))}
      
      {/* Impact particles at target */}
      <ImpactParticles
        position={endPos}
        color={laserColor}
        intensity={miningProgress}
      />
      
      {/* Start point glow */}
      <mesh position={startPos}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial
          color={laserColor}
          transparent={true}
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* End point impact glow */}
      <mesh position={endPos}>
        <sphereGeometry args={[0.3 + miningProgress * 0.2, 12, 12]} />
        <meshBasicMaterial
          color={laserColor}
          transparent={true}
          opacity={0.3 + miningProgress * 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}