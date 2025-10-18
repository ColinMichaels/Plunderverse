import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAutopilot } from '../../lib/stores/navigation/useAutopilot';

export function WarpingEffect() {
  // Use selector to only subscribe to isActive, preventing unnecessary re-renders from orbit state changes
  const isAutopilotActive = useAutopilot(state => state.isActive);
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<THREE.BufferGeometry>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  
  // Memoize particle generation to prevent recreation on every render
  const { particleCount, positions } = useMemo(() => {
    const count = 1000;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Create stars in a sphere around origin (local space - group will follow camera)
      const radius = Math.random() * 500 + 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = radius * Math.cos(phi);
      
      // Set initial velocities toward center (origin of local space)
      vel[i3] = pos[i3] * -0.1;
      vel[i3 + 1] = pos[i3 + 1] * -0.1;
      vel[i3 + 2] = pos[i3 + 2] * -0.1;
    }
    
    // Store velocities in ref to persist across renders
    velocitiesRef.current = vel;
    
    return { particleCount: count, positions: pos };
  }, []); // Empty dependency array - only create once
  
  useFrame((state, delta) => {
    if (!isAutopilotActive || !particlesRef.current || !velocitiesRef.current || !groupRef.current) return;
    
    // Keep the group positioned at camera location for local space effect
    groupRef.current.position.copy(camera.position);
    
    const positions = particlesRef.current.attributes.position.array as Float32Array;
    const velocities = velocitiesRef.current;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Move particles toward center (origin of local space) for warp streaking effect
      positions[i3] += velocities[i3] * delta * 10;
      positions[i3 + 1] += velocities[i3 + 1] * delta * 10;
      positions[i3 + 2] += velocities[i3 + 2] * delta * 10;
      
      // Calculate distance from origin (local space center)
      const distanceFromCenter = Math.sqrt(
        positions[i3] * positions[i3] +
        positions[i3 + 1] * positions[i3 + 1] +
        positions[i3 + 2] * positions[i3 + 2]
      );
      
      if (distanceFromCenter < 10) {
        // Respawn at outer edge in local space
        const radius = Math.random() * 500 + 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        // Position in local space around origin
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        // Update velocity toward center (origin of local space)
        velocities[i3] = positions[i3] * -0.1;
        velocities[i3 + 1] = positions[i3 + 1] * -0.1;
        velocities[i3 + 2] = positions[i3 + 2] * -0.1;
      }
    }
    
    particlesRef.current.attributes.position.needsUpdate = true;
  });
  
  if (!isAutopilotActive) return null;
  
  return (
    <group ref={groupRef}>
      <points ref={starsRef}>
        <bufferGeometry ref={particlesRef}>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#00FFFF"
          size={2}
          sizeAttenuation={true}
          transparent
          opacity={0.8}
        />
      </points>
    </group>
  );
}