import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSettings } from "../../lib/stores/ui/useSettings";
import { configLoader } from "../../lib/config/configLoader";
import { ParticlePresetConfig } from "../../lib/config/types";

interface ResourceParticleAuraProps {
  position: [number, number, number];
  color: string;
  rarity: string;
  isActive: boolean;
  mineralName?: string;
}

export function ResourceParticleAura({
  position,
  color,
  rarity,
  isActive,
  mineralName,
}: ResourceParticleAuraProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const frameCountRef = useRef(0);
  const { enableParticles, graphicsQuality } = useSettings();
  const { camera } = useThree();
  const [particleConfig, setParticleConfig] = useState<ParticlePresetConfig | null>(null);

  // Load particle configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (mineralName) {
          const mineralConfig = await configLoader.getMineralConfig(mineralName);
          if (mineralConfig?.particles.enabled && mineralConfig.particles.preset) {
            const preset = await configLoader.getParticlePreset(mineralConfig.particles.preset);
            setParticleConfig(preset);
          }
        } else {
          const rarityPreset = rarity === 'legendary' ? 'legendary_glow' : rarity === 'rare' ? 'rare_glow' : null;
          if (rarityPreset) {
            const preset = await configLoader.getParticlePreset(rarityPreset);
            setParticleConfig(preset);
          }
        }
      } catch (error) {
        console.error('[ResourceParticleAura] Failed to load config:', error);
      }
    };
    loadConfig();
  }, [mineralName, rarity]);

  // Disable particles entirely in low performance mode
  const performanceMode = graphicsQuality === 'low';
  
  // Only show particles when enabled in config and settings, not in performance mode
  const shouldShow = isActive && particleConfig?.enabled && enableParticles && !performanceMode;

  // Track camera distance - updated each frame for proper LOD
  const distanceToCameraRef = useRef<number>(Infinity);

  // Determine base particle count from config (max count)
  const maxParticleCount = useMemo(() => {
    if (!shouldShow || !particleConfig) return 0;
    return particleConfig.count;
  }, [shouldShow, particleConfig]);
  
  // Track actual particle count based on LOD
  const [particleCount, setParticleCount] = useState(maxParticleCount);

  // Determine update frequency from config
  const updateFrequency = useMemo(() => {
    if (!particleConfig) return 3;
    return particleConfig.updateFrequency;
  }, [particleConfig]);

  // Generate particle positions with config-based properties
  const { positions, velocities, lifetimes, sizes } = useMemo(() => {
    if (particleCount === 0 || !particleConfig) return { positions: new Float32Array(0), velocities: [], lifetimes: [], sizes: [] };

    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const lifetimes = [];
    const sizes = [];
    
    const spread = particleConfig.spread;
    const speed = particleConfig.speed;
    const lifetime = particleConfig.lifetime;
    const size = particleConfig.size;

    for (let i = 0; i < particleCount; i++) {
      // Random position around the resource
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spread;
      const height = Math.random() * (spread * 1.5) - (spread * 0.75);

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Random velocity (upward drift)
      velocities.push({
        x: (Math.random() - 0.5) * speed,
        y: Math.random() * speed * 1.5 + speed * 0.5,
        z: (Math.random() - 0.5) * speed,
      });

      // Random lifetime
      lifetimes.push(Math.random() * lifetime + lifetime * 0.5);

      // Particle size variation
      sizes.push(Math.random() * size * 0.5 + size * 0.5);
    }

    return { positions, velocities, lifetimes, sizes };
  }, [particleCount, particleConfig]);

  // Particle texture with proper color tinting to prevent white flashes
  const particleTexture = useMemo(() => {
    if (!shouldShow || !particleConfig) return null;
    
    // Get texture config
    const textureSize = graphicsQuality === 'high' ? 64 : graphicsQuality === 'medium' ? 32 : 16;
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const context = canvas.getContext('2d');

    if (context) {
      const center = textureSize / 2;
      
      // Parse the particle color
      const tempColor = new THREE.Color(color);
      const r = Math.floor(tempColor.r * 255);
      const g = Math.floor(tempColor.g * 255);
      const b = Math.floor(tempColor.b * 255);
      
      // Create gradient using the actual particle color (not white!)
      // This prevents white flashes by using the resource's color directly
      const gradient = context.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.6)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, textureSize, textureSize);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [shouldShow, graphicsQuality, color, particleConfig]);

  // Optimized animation with config-based behavior
  useFrame((state) => {
    if (!particlesRef.current || !shouldShow || !particleConfig) return;

    // Calculate distance to camera each frame for proper LOD
    const cameraPos = state.camera.position;
    const resourcePos = new THREE.Vector3(...position);
    const currentDistance = cameraPos.distanceTo(resourcePos);
    distanceToCameraRef.current = currentDistance;
    
    // Update particle count based on distance (LOD)
    const lodDistance = particleConfig.lodDistances[graphicsQuality as keyof typeof particleConfig.lodDistances];
    let lodParticleCount = maxParticleCount;
    if (currentDistance > lodDistance * 2) {
      lodParticleCount = Math.floor(maxParticleCount * 0.3);
    } else if (currentDistance > lodDistance) {
      lodParticleCount = Math.floor(maxParticleCount * 0.6);
    }
    if (lodParticleCount !== particleCount) {
      setParticleCount(lodParticleCount);
    }

    // Throttle updates based on config
    frameCountRef.current++;
    if (frameCountRef.current % updateFrequency !== 0) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    // LOD culling distance from config
    const cullingDistance = lodDistance * 3;
    if (currentDistance > cullingDistance) return;

    const spread = particleConfig.spread;
    const swirlIntensity = particleConfig.swirlIntensity || 0;

    for (let i = 0; i < positions.length / 3; i++) {
      const velocity = velocities[i];
      
      // Update position with velocity
      positions[i * 3] += velocity.x;
      positions[i * 3 + 1] += velocity.y;
      positions[i * 3 + 2] += velocity.z;

      // Reset particle when it goes too high
      const maxHeight = spread * 2;
      if (positions[i * 3 + 1] > maxHeight) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * spread;
        
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = -spread * 0.75;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }

      // Optional swirl motion
      if (swirlIntensity > 0 && graphicsQuality === 'high') {
        const swirl = Math.sin(time * 2 + i) * swirlIntensity;
        positions[i * 3] += swirl;
        positions[i * 3 + 2] += Math.cos(time * 2 + i) * swirlIntensity;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    // Rotation speed based on particle config
    particlesRef.current.rotation.y = time * 0.05;
  });

  if (!shouldShow || particleCount === 0 || !particleConfig) return null;

  // Adjust particle size and opacity based on LOD and config
  const lodDistance = particleConfig.lodDistances[graphicsQuality as keyof typeof particleConfig.lodDistances];
  const currentDistance = distanceToCameraRef.current;
  const particleSize = currentDistance > lodDistance ? particleConfig.size * 0.6 : particleConfig.size;
  const particleOpacity = currentDistance > lodDistance ? particleConfig.opacity * 0.7 : particleConfig.opacity;
  
  // Get blending mode from config
  const blendingMode = particleConfig.blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;

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
        blending={blendingMode}
        color="#ffffff"
        sizeAttenuation
        vertexColors={false}
      />
    </points>
  );
}