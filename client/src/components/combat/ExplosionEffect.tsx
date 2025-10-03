import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ExplosionEffectProps {
  position: THREE.Vector3;
  scale?: number;
  duration?: number;
  color?: string;
}

export function ExplosionEffect({ 
  position, 
  scale = 1, 
  duration = 1,
  color = "#ff8800" 
}: ExplosionEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now() / 1000);
  
  // Create particle geometry
  const particleCount = 30;
  const positions = useRef(new Float32Array(particleCount * 3));
  const velocities = useRef(new Float32Array(particleCount * 3));
  const colors = useRef(new Float32Array(particleCount * 3));
  
  useEffect(() => {
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      // Random spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = Math.random() * 0.5;
      
      positions.current[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions.current[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions.current[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random velocities
      velocities.current[i * 3] = (Math.random() - 0.5) * 10;
      velocities.current[i * 3 + 1] = (Math.random() - 0.5) * 10;
      velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      // Color gradient from white to orange to red
      const colorMix = Math.random();
      if (colorMix < 0.3) {
        // White core
        colors.current[i * 3] = 1;
        colors.current[i * 3 + 1] = 1;
        colors.current[i * 3 + 2] = 1;
      } else if (colorMix < 0.7) {
        // Orange middle
        colors.current[i * 3] = 1;
        colors.current[i * 3 + 1] = 0.5;
        colors.current[i * 3 + 2] = 0;
      } else {
        // Red outer
        colors.current[i * 3] = 1;
        colors.current[i * 3 + 1] = 0.2;
        colors.current[i * 3 + 2] = 0;
      }
    }
  }, [particleCount]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    
    // Update explosion sphere
    if (sphereRef.current) {
      const sphereScale = scale * (1 + progress * 2);
      sphereRef.current.scale.setScalar(sphereScale);
      
      const material = sphereRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.6 * (1 - progress));
    }
    
    // Update particles
    if (particlesRef.current) {
      const geometry = particlesRef.current.geometry;
      const positionsAttr = geometry.attributes.position;
      
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        
        // Update positions based on velocity
        positionsAttr.array[idx] += velocities.current[idx] * delta;
        positionsAttr.array[idx + 1] += velocities.current[idx + 1] * delta;
        positionsAttr.array[idx + 2] += velocities.current[idx + 2] * delta;
        
        // Apply gravity
        positionsAttr.array[idx + 1] -= 2 * delta;
        
        // Damping
        velocities.current[idx] *= 0.98;
        velocities.current[idx + 1] *= 0.98;
        velocities.current[idx + 2] *= 0.98;
      }
      
      positionsAttr.needsUpdate = true;
      
      // Fade out particles
      const material = particlesRef.current.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, 1 - progress);
    }
    
    // Remove after duration
    if (progress >= 1) {
      groupRef.current.visible = false;
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Explosion sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions.current}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={colors.current}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1 * scale}
          vertexColors
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      
      {/* Flash light */}
      <pointLight
        color={color}
        intensity={10}
        distance={10 * scale}
        decay={2}
      />
    </group>
  );
}