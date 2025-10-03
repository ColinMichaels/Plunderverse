import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSettings } from "../../lib/stores/ui/useSettings";

interface ResourceParticleAuraProps {
  position: [number, number, number];
  color: string;
  rarity: string;
  isActive: boolean;
}

export function ResourceParticleAura({
  position,
  color,
  rarity,
  isActive,
}: ResourceParticleAuraProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const frameCountRef = useRef(0);
  const { enableParticles, graphicsQuality } = useSettings();
  const { camera } = useThree();

  // Disable particles entirely in low performance mode
  const performanceMode = graphicsQuality === 'low';
  
  // Only show particles for legendary resources when enabled and not in performance mode
  const shouldShow = isActive && rarity === 'legendary' && enableParticles && !performanceMode;

  // Calculate LOD based on distance from camera
  const distanceToCamera = useMemo(() => {
    if (!shouldShow) return Infinity;
    const cameraPos = camera.position;
    const resourcePos = new THREE.Vector3(...position);
    return cameraPos.distanceTo(resourcePos);
  }, [camera.position, position, shouldShow]);

  // Determine particle count based on graphics quality and LOD
  const particleCount = useMemo(() => {
    if (!shouldShow) return 0;
    
    // Base count depends on graphics quality (reduced from 50)
    let baseCount = graphicsQuality === 'high' ? 30 : 20;
    
    // Apply LOD reduction based on distance
    if (distanceToCamera > 100) {
      baseCount = Math.floor(baseCount * 0.3); // 30% particles at far distance
    } else if (distanceToCamera > 50) {
      baseCount = Math.floor(baseCount * 0.6); // 60% particles at medium distance
    }
    
    return baseCount;
  }, [graphicsQuality, distanceToCamera, shouldShow]);

  // Determine update frequency based on graphics quality
  const updateFrequency = useMemo(() => {
    if (graphicsQuality === 'high') return 1; // Update every frame
    if (graphicsQuality === 'medium') return 2; // Update every 2 frames
    return 3; // Update every 3 frames for low (though particles are disabled in low)
  }, [graphicsQuality]);

  // Generate particle positions with optimized count
  const { positions, velocities, lifetimes, sizes } = useMemo(() => {
    if (particleCount === 0) return { positions: new Float32Array(0), velocities: [], lifetimes: [], sizes: [] };

    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const lifetimes = [];
    const sizes = [];

    for (let i = 0; i < particleCount; i++) {
      // Random position around the resource
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;
      const height = Math.random() * 3 - 1.5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Random velocity (upward drift)
      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: Math.random() * 0.03 + 0.01,
        z: (Math.random() - 0.5) * 0.02,
      });

      // Random lifetime
      lifetimes.push(Math.random() * 2 + 1);

      // Smaller sizes for better performance
      sizes.push(Math.random() * 0.2 + 0.05);
    }

    return { positions, velocities, lifetimes, sizes };
  }, [particleCount]);

  // Simpler particle texture (smaller resolution for better performance)
  const particleTexture = useMemo(() => {
    if (!shouldShow) return null;
    
    // Use smaller texture size for better performance
    const size = graphicsQuality === 'high' ? 32 : 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    if (context) {
      const center = size / 2;
      // Simpler gradient for better performance
      const gradient = context.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [shouldShow, graphicsQuality]);

  // Optimized animation with frame throttling
  useFrame((state) => {
    if (!particlesRef.current || !shouldShow) return;

    // Throttle updates based on graphics quality
    frameCountRef.current++;
    if (frameCountRef.current % updateFrequency !== 0) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    // Only update particles if they're visible (LOD check)
    if (distanceToCamera > 150) return;

    for (let i = 0; i < positions.length / 3; i++) {
      const velocity = velocities[i];
      
      // Update position with velocity
      positions[i * 3] += velocity.x;
      positions[i * 3 + 1] += velocity.y;
      positions[i * 3 + 2] += velocity.z;

      // Reset particle when it goes too high
      if (positions[i * 3 + 1] > 4) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2;
        
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = -1.5;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }

      // Reduced swirl motion for performance
      if (graphicsQuality === 'high') {
        const swirl = Math.sin(time * 2 + i) * 0.01;
        positions[i * 3] += swirl;
        positions[i * 3 + 2] += Math.cos(time * 2 + i) * 0.01;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    // Slower rotation for better performance
    particlesRef.current.rotation.y = time * 0.05;
  });

  if (!shouldShow || particleCount === 0) return null;

  // Adjust particle size based on LOD
  const particleSize = distanceToCamera > 50 ? 0.3 : 0.5;
  const particleOpacity = distanceToCamera > 50 ? 0.4 : 0.6;

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        map={particleTexture}
        transparent
        opacity={particleOpacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={color}
        sizeAttenuation
        // Use simpler vertex colors for better performance
        vertexColors={false}
      />
    </points>
  );
}