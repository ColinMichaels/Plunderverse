import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSurfacePlayer } from "../../lib/stores/surface/useSurfacePlayer";

interface MiningBeamVisualProps {
  active: boolean;
  targetPosition: THREE.Vector3 | null;
  color?: string;
}

export function MiningBeamVisual({ active, targetPosition, color = "#00ff88" }: MiningBeamVisualProps) {
  const beamRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { position: playerPosition } = useSurfacePlayer();
  
  // Create beam geometry dynamically
  const beamGeometry = useRef(new THREE.CylinderGeometry(0.1, 0.05, 1, 8));
  
  useEffect(() => {
    // Cleanup geometry on unmount
    return () => {
      beamGeometry.current.dispose();
    };
  }, []);

  useFrame((state) => {
    if (beamRef.current && targetPosition && active && playerPosition) {
      // Calculate beam position and orientation
      const start = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
      const end = targetPosition.clone();
      
      // Calculate midpoint for beam position
      const midpoint = start.clone().add(end).multiplyScalar(0.5);
      beamRef.current.position.copy(midpoint);
      
      // Calculate beam length
      const distance = start.distanceTo(end);
      beamRef.current.scale.y = distance;
      
      // Orient beam to point from player to target
      const direction = end.clone().sub(start).normalize();
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      beamRef.current.quaternion.copy(quaternion);
      
      // Animate beam opacity and color intensity
      if (materialRef.current) {
        const pulse = Math.sin(state.clock.elapsedTime * 10) * 0.2 + 0.8;
        materialRef.current.opacity = 0.6 * pulse;
        materialRef.current.emissiveIntensity = pulse;
      }
      
      beamRef.current.visible = true;
    } else if (beamRef.current) {
      beamRef.current.visible = false;
    }
  });

  if (!active || !targetPosition) return null;

  return (
    <mesh ref={beamRef} geometry={beamGeometry.current}>
      <meshBasicMaterial 
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={1}
        transparent={true}
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}