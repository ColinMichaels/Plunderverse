import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
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
  const { enableParticles } = useSettings();

  // Only show particles for legendary resources when enabled
  const shouldShow = isActive && rarity === 'legendary' && enableParticles;

  // Generate particle positions
  const { positions, velocities, lifetimes, sizes } = useMemo(() => {
    if (!shouldShow) return { positions: new Float32Array(0), velocities: [], lifetimes: [], sizes: [] };

    const count = 50; // Number of particles
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const lifetimes = [];
    const sizes = [];

    for (let i = 0; i < count; i++) {
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

      // Random size
      sizes.push(Math.random() * 0.3 + 0.1);
    }

    return { positions, velocities, lifetimes, sizes };
  }, [shouldShow]);

  // Particle texture
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');

    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Animate particles
  useFrame((state) => {
    if (!particlesRef.current || !shouldShow) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < positions.length / 3; i++) {
      const velocity = velocities[i];
      const lifetime = lifetimes[i];
      
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

      // Add some swirl motion
      const swirl = Math.sin(time * 2 + i) * 0.01;
      positions[i * 3] += swirl;
      positions[i * 3 + 2] += Math.cos(time * 2 + i) * 0.01;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    // Rotate the entire particle system
    particlesRef.current.rotation.y = time * 0.1;
  });

  if (!shouldShow) return null;

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
        size={0.5}
        map={particleTexture}
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={color}
        sizeAttenuation
      />
    </points>
  );
}