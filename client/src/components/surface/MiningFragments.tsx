import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMining } from "../../lib/stores/economy/useMining";
import { useEquipment } from "../../lib/stores/ship/useEquipment";
import { ResourceData } from "../../lib/planetData";

// Particle types
enum ParticleType {
  FRAGMENT = "fragment",
  SPARK = "spark",
  DUST = "dust",
  DROPLET = "droplet",
}

// Particle pooling system to avoid GC
class ParticlePool {
  private pool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 80) {  // Increased for more dramatic effect while maintaining performance
    this.maxParticles = maxParticles;
  }

  spawn(
    type: ParticleType,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
    size: number,
    lifetime: number
  ): Particle | null {
    if (this.activeParticles.length >= this.maxParticles) {
      // Recycle oldest particle
      const oldest = this.activeParticles.shift();
      if (oldest) {
        oldest.reset(type, position, velocity, color, size, lifetime);
        this.activeParticles.push(oldest);
        return oldest;
      }
      return null;
    }

    let particle = this.pool.pop();
    if (!particle) {
      particle = new Particle();
    }
    
    particle.reset(type, position, velocity, color, size, lifetime);
    this.activeParticles.push(particle);
    return particle;
  }

  update(deltaTime: number, terrainHeightAt: (x: number, z: number) => number): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      particle.update(deltaTime, terrainHeightAt);
      
      if (particle.isDead()) {
        this.activeParticles.splice(i, 1);
        this.pool.push(particle);
      }
    }
  }

  getActiveParticles(): Particle[] {
    return this.activeParticles;
  }

  clear(): void {
    this.pool.push(...this.activeParticles);
    this.activeParticles = [];
  }
}

// Individual particle with physics
class Particle {
  type: ParticleType = ParticleType.FRAGMENT;
  position: THREE.Vector3 = new THREE.Vector3();
  velocity: THREE.Vector3 = new THREE.Vector3();
  acceleration: THREE.Vector3 = new THREE.Vector3();
  color: THREE.Color = new THREE.Color();
  size: number = 1;
  lifetime: number = 1;
  maxLifetime: number = 1;
  rotation: THREE.Euler = new THREE.Euler();
  rotationSpeed: THREE.Vector3 = new THREE.Vector3();
  bounce: number = 0.5;
  friction: number = 0.98;
  gravity: number = -9.8;
  trailPositions: THREE.Vector3[] = [];
  maxTrailLength: number = 5;

  reset(
    type: ParticleType,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
    size: number,
    lifetime: number
  ): void {
    this.type = type;
    this.position.copy(position);
    this.velocity.copy(velocity);
    this.acceleration.set(0, this.gravity, 0);
    this.color.copy(color);
    this.size = size;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    this.rotationSpeed.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    this.trailPositions = [];

    // Set physics properties based on particle type - more realistic values
    switch (type) {
      case ParticleType.SPARK:
        this.bounce = 0.3;
        this.friction = 0.92;
        this.gravity = -8;
        this.maxTrailLength = 10;
        break;
      case ParticleType.DUST:
        this.bounce = 0;
        this.friction = 0.7;
        this.gravity = -3;
        break;
      case ParticleType.DROPLET:
        this.bounce = 0.2;
        this.friction = 0.85;
        this.gravity = -12;
        break;
      case ParticleType.FRAGMENT:
      default:
        // Realistic rock bounce coefficient (0.3-0.5)
        this.bounce = 0.3 + Math.random() * 0.2;
        this.friction = 0.75 + Math.random() * 0.1; // Variable friction
        this.gravity = -9.8; // Real gravity
        break;
    }
  }

  update(deltaTime: number, terrainHeightAt: (x: number, z: number) => number): void {
    // Update physics
    this.velocity.addScaledVector(this.acceleration, deltaTime);
    this.position.addScaledVector(this.velocity, deltaTime);
    
    // Add trail position for sparks
    if (this.type === ParticleType.SPARK && this.trailPositions.length < this.maxTrailLength) {
      this.trailPositions.push(this.position.clone());
      if (this.trailPositions.length > this.maxTrailLength) {
        this.trailPositions.shift();
      }
    }
    
    // Enhanced ground collision with rolling physics
    const groundHeight = terrainHeightAt(this.position.x, this.position.z) + this.size * 0.5;
    if (this.position.y <= groundHeight) {
      this.position.y = groundHeight;
      
      // Calculate impact force
      const impactVelocity = Math.abs(this.velocity.y);
      
      // Only bounce if impact is strong enough
      if (impactVelocity > 0.5) {
        this.velocity.y = impactVelocity * this.bounce;
        
        // Energy loss on impact
        const energyLoss = 1 - (this.bounce * 0.5);
        this.velocity.x *= energyLoss;
        this.velocity.z *= energyLoss;
        
        // Add slight random bounce direction for realism
        if (this.type === ParticleType.FRAGMENT) {
          this.velocity.x += (Math.random() - 0.5) * impactVelocity * 0.1;
          this.velocity.z += (Math.random() - 0.5) * impactVelocity * 0.1;
          
          // Reduce rotation speed on impact
          this.rotationSpeed.multiplyScalar(0.8);
        }
      } else {
        // Fragment has settled - apply rolling physics
        this.velocity.y = 0;
        this.velocity.multiplyScalar(this.friction);
        
        // Gradually stop rotation when settled
        this.rotationSpeed.multiplyScalar(0.95);
        
        // Apply stronger friction when moving slowly (simulate rolling resistance)
        if (this.velocity.length() < 1) {
          this.velocity.multiplyScalar(0.9);
        }
      }
    }
    
    // Apply air resistance based on particle type
    const airResistance = this.type === ParticleType.DUST ? 0.98 : 
                          this.type === ParticleType.SPARK ? 0.995 : 
                          0.999;
    this.velocity.multiplyScalar(airResistance);
    
    // Update rotation with angular damping
    this.rotation.x += this.rotationSpeed.x * deltaTime;
    this.rotation.y += this.rotationSpeed.y * deltaTime;
    this.rotation.z += this.rotationSpeed.z * deltaTime;
    
    // Apply angular damping
    this.rotationSpeed.multiplyScalar(0.999);
    
    // Update lifetime
    this.lifetime -= deltaTime;
  }

  isDead(): boolean {
    return this.lifetime <= 0;
  }

  getOpacity(): number {
    return Math.max(0, Math.min(1, this.lifetime / this.maxLifetime));
  }

  getScale(): number {
    if (this.type === ParticleType.DUST) {
      // Dust expands as it fades
      return this.size * (1 + (1 - this.getOpacity()) * 2);
    }
    return this.size * this.getOpacity();
  }
}

// Get color based on resource rarity
const getRarityColor = (rarity: string): THREE.Color => {
  switch (rarity) {
    case "common":
      return new THREE.Color("#10B981");
    case "uncommon":
      return new THREE.Color("#3B82F6");
    case "rare":
      return new THREE.Color("#8B5CF6");
    case "legendary":
      return new THREE.Color("#F59E0B");
    default:
      return new THREE.Color("#6B7280");
  }
};

// Get particle behavior based on resource type - enhanced for more dramatic effects
const getResourceParticleBehavior = (resourceType: string): {
  particleTypes: ParticleType[];
  sparkCount: number;
  dustCount: number;
  fragmentCount: number;
  dropletCount: number;
  colorVariation: number;
  sparkSpeed: number;
  fragmentSpeed: number;
  explosionForce: number;
} => {
  // Metals: Sparks and metallic shards
  if (resourceType.includes("Iron") || resourceType.includes("Platinum") || resourceType.includes("Metal")) {
    return {
      particleTypes: [ParticleType.SPARK, ParticleType.FRAGMENT],
      sparkCount: 15,
      dustCount: 5,
      fragmentCount: 12,
      dropletCount: 0,
      colorVariation: 0.1,
      sparkSpeed: 12,
      fragmentSpeed: 8,
      explosionForce: 10,
    };
  }
  
  // Crystals: Glowing fragments with light trails
  if (resourceType.includes("Crystal") || resourceType.includes("Diamond") || resourceType.includes("Gem")) {
    return {
      particleTypes: [ParticleType.SPARK, ParticleType.FRAGMENT],
      sparkCount: 20,
      dustCount: 8,
      fragmentCount: 15,
      dropletCount: 0,
      colorVariation: 0.3,
      sparkSpeed: 15,
      fragmentSpeed: 6,
      explosionForce: 8,
    };
  }
  
  // Liquids: Splash and droplet effects
  if (resourceType.includes("Water") || resourceType.includes("Ice") || resourceType.includes("Oil")) {
    return {
      particleTypes: [ParticleType.DROPLET, ParticleType.DUST],
      sparkCount: 0,
      dustCount: 10,
      fragmentCount: 0,
      dropletCount: 25,
      colorVariation: 0.2,
      sparkSpeed: 0,
      fragmentSpeed: 0,
      explosionForce: 5,
    };
  }
  
  // Gas: Mostly dust particles
  if (resourceType.includes("Gas") || resourceType.includes("Methane")) {
    return {
      particleTypes: [ParticleType.DUST],
      sparkCount: 0,
      dustCount: 30,
      fragmentCount: 0,
      dropletCount: 0,
      colorVariation: 0.4,
      sparkSpeed: 0,
      fragmentSpeed: 0,
      explosionForce: 3,
    };
  }
  
  // Default minerals: Rock chunks and dust
  return {
    particleTypes: [ParticleType.FRAGMENT, ParticleType.DUST],
    sparkCount: 5,
    dustCount: 12,
    fragmentCount: 10,
    dropletCount: 0,
    colorVariation: 0.15,
    sparkSpeed: 8,
    fragmentSpeed: 6,
    explosionForce: 7,
  };
};

// Instanced mesh for fragments with enhanced visuals
function FragmentParticles({ particles, color }: { particles: Particle[]; color: THREE.Color }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const fragments = particles.filter(p => p.type === ParticleType.FRAGMENT);
  
  useEffect(() => {
    if (!meshRef.current || fragments.length === 0) return;
    
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    
    fragments.forEach((particle, i) => {
      tempObject.position.copy(particle.position);
      tempObject.rotation.copy(particle.rotation);
      tempObject.scale.setScalar(particle.getScale());
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      // Apply color with variation and glow for fresh fragments
      tempColor.copy(particle.color);
      const freshnessRatio = particle.lifetime / particle.maxLifetime;
      
      // Fresh fragments have a bright glow that fades over time
      if (freshnessRatio > 0.7) {
        // Add emissive glow effect for freshly broken fragments
        const glowIntensity = (freshnessRatio - 0.7) / 0.3;
        tempColor.multiplyScalar(1 + glowIntensity * 0.5);
      }
      
      const brightness = 0.5 + particle.getOpacity() * 0.5;
      tempColor.multiplyScalar(brightness);
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [fragments]);
  
  if (fragments.length === 0) return null;
  
  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, fragments.length]} castShadow>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.5}
          emissive={color}
          emissiveIntensity={0.1}
        />
      </instancedMesh>
      
      {/* Add glow effect for fresh fragments */}
      {fragments.filter(p => p.lifetime / p.maxLifetime > 0.7).length > 0 && (
        <instancedMesh args={[undefined, undefined, fragments.filter(p => p.lifetime / p.maxLifetime > 0.7).length]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </group>
  );
}

// Points geometry for sparks with enhanced glow
function SparkParticles({ particles, color }: { particles: Particle[]; color: THREE.Color }) {
  const pointsRef = useRef<THREE.Points>(null);
  const sparks = particles.filter(p => p.type === ParticleType.SPARK);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(sparks.length * 3);
    sparks.forEach((particle, i) => {
      pos[i * 3] = particle.position.x;
      pos[i * 3 + 1] = particle.position.y;
      pos[i * 3 + 2] = particle.position.z;
    });
    return pos;
  }, [sparks]);
  
  const colors = useMemo(() => {
    const col = new Float32Array(sparks.length * 3);
    sparks.forEach((particle, i) => {
      const c = particle.color.clone();
      const intensity = particle.getOpacity();
      
      // Make sparks glow brighter when fresh
      const freshnessRatio = particle.lifetime / particle.maxLifetime;
      const glowMultiplier = freshnessRatio > 0.5 ? 2.5 : 2;
      
      c.multiplyScalar(intensity * glowMultiplier);
      col[i * 3] = Math.min(1, c.r);
      col[i * 3 + 1] = Math.min(1, c.g);
      col[i * 3 + 2] = Math.min(1, c.b);
    });
    return col;
  }, [sparks]);
  
  const sizes = useMemo(() => {
    const s = new Float32Array(sparks.length);
    sparks.forEach((particle, i) => {
      // Larger sparks when fresh, smaller as they fade
      const freshnessRatio = particle.lifetime / particle.maxLifetime;
      const sizeMultiplier = freshnessRatio > 0.5 ? 8 : 5;
      s[i] = particle.getScale() * sizeMultiplier;
    });
    return s;
  }, [sparks]);
  
  if (sparks.length === 0) return null;
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={sparks.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={sparks.length}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sparks.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        sizeAttenuation
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Dust cloud particles
function DustParticles({ particles, color }: { particles: Particle[]; color: THREE.Color }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dust = particles.filter(p => p.type === ParticleType.DUST);
  
  useEffect(() => {
    if (!meshRef.current || dust.length === 0) return;
    
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    
    dust.forEach((particle, i) => {
      tempObject.position.copy(particle.position);
      tempObject.rotation.set(0, particle.rotation.y, 0);
      tempObject.scale.setScalar(particle.getScale());
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      // Dust color fades to brown/gray
      tempColor.copy(particle.color);
      tempColor.lerp(new THREE.Color(0x8b7355), 1 - particle.getOpacity());
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [dust]);
  
  if (dust.length === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, dust.length]}>
      <sphereGeometry args={[0.3, 8, 6]} />
      <meshStandardMaterial
        color={color}
        roughness={1}
        metalness={0}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// Droplet particles for liquids
function DropletParticles({ particles, color }: { particles: Particle[]; color: THREE.Color }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const droplets = particles.filter(p => p.type === ParticleType.DROPLET);
  
  useEffect(() => {
    if (!meshRef.current || droplets.length === 0) return;
    
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    
    droplets.forEach((particle, i) => {
      tempObject.position.copy(particle.position);
      const stretchY = 1 + Math.abs(particle.velocity.y) * 0.1; // Stretch based on velocity
      tempObject.scale.set(particle.getScale(), particle.getScale() * stretchY, particle.getScale());
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      tempColor.copy(particle.color);
      tempColor.multiplyScalar(particle.getOpacity());
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [droplets]);
  
  if (droplets.length === 0) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, droplets.length]} castShadow>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
        transparent
        opacity={0.7}
      />
    </instancedMesh>
  );
}

interface MiningFragmentsProps {
  resource: ResourceData;
  position: [number, number, number];
  progress: number;
  isActive: boolean;
}

export function MiningFragments({ resource, position, progress, isActive }: MiningFragmentsProps) {
  const particlePoolRef = useRef(new ParticlePool(80)); // Increased for more dramatic effect
  const lastSpawnTimeRef = useRef(0);
  const lastProgressRef = useRef(progress);
  const frameCountRef = useRef(0);
  const impactPointRef = useRef(new THREE.Vector3());
  const [particles, setParticles] = useState<Particle[]>([]);
  const { equipment } = useEquipment();
  const { clock } = useThree();
  
  // Get mining efficiency modifiers
  const miningEfficiency = useMemo(() => {
    const drill = equipment.find(item => item.type === 'drill');
    const extractor = equipment.find(item => item.type === 'extractor');
    const drillPerformance = drill?.performanceLevel || 1;
    const extractorPerformance = extractor?.performanceLevel || 1;
    return (drillPerformance + extractorPerformance) / 2;
  }, [equipment]);
  
  // Get particle behavior based on resource type
  const particleBehavior = useMemo(() => {
    return getResourceParticleBehavior(resource.type);
  }, [resource.type]);
  
  // Get base color from rarity
  const baseColor = useMemo(() => getRarityColor(resource.rarity), [resource.rarity]);
  
  // Terrain height function (simplified, should match your terrain)
  const terrainHeightAt = (x: number, z: number): number => {
    return Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2 +
           Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
  };
  
  // Spawn particles with frame throttling for better performance
  useFrame((state, delta) => {
    const pool = particlePoolRef.current;
    const currentTime = clock.getElapsedTime();
    
    // Throttle updates - only process every 2 frames for better performance
    frameCountRef.current++;
    const shouldUpdate = frameCountRef.current % 2 === 0;
    
    if (!isActive) {
      pool.clear();
      setParticles([]);
      return;
    }
    
    // Skip particle spawning on throttled frames, but always update physics
    if (!shouldUpdate) {
      // Still update physics for smooth motion
      pool.update(delta, terrainHeightAt);
      setParticles([...pool.getActiveParticles()]);
      return;
    }
    
    // Detect progress milestones for burst spawning
    const progressDelta = progress - lastProgressRef.current;
    const isMilestone = progressDelta > 0.05 || (progress > 0.25 && lastProgressRef.current <= 0.25) ||
                        (progress > 0.5 && lastProgressRef.current <= 0.5) ||
                        (progress > 0.75 && lastProgressRef.current <= 0.75) ||
                        (progress >= 1.0 && lastProgressRef.current < 1.0);
    
    if (isMilestone) {
      lastProgressRef.current = progress;
      
      // Set impact point for explosion physics
      impactPointRef.current.set(
        position[0] + (Math.random() - 0.5) * 0.3,
        position[1] + Math.random() * 0.2,
        position[2] + (Math.random() - 0.5) * 0.3
      );
      
      // Burst spawn particles on milestone
      const burstMultiplier = progress >= 1.0 ? 2.5 : progress >= 0.75 ? 1.8 : progress >= 0.5 ? 1.5 : 1.2;
      
      // Spawn fragments with explosion physics
      const fragmentCount = Math.floor(particleBehavior.fragmentCount * burstMultiplier * 0.5);
      for (let i = 0; i < Math.min(fragmentCount, 15); i++) {
        const spawnOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          Math.random() * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        const spawnPos = impactPointRef.current.clone().add(spawnOffset);
        
        // Calculate outward explosion direction from impact point
        const direction = spawnPos.clone().sub(impactPointRef.current).normalize();
        
        // Add upward and outward explosion force (5-15 units/s as per requirements)
        const explosionForce = particleBehavior.explosionForce + Math.random() * 5;
        const upwardForce = 3 + Math.random() * 4;
        
        const velocity = new THREE.Vector3(
          direction.x * explosionForce,
          upwardForce,
          direction.z * explosionForce
        );
        
        // Fragment color matches resource with slight variation
        const fragmentColor = baseColor.clone();
        fragmentColor.offsetHSL(
          Math.random() * particleBehavior.colorVariation - particleBehavior.colorVariation / 2,
          0,
          Math.random() * 0.2 - 0.1
        );
        
        // Size variation for fragments (mix of large chunks and small debris)
        const sizeCategories = [0.05, 0.1, 0.15, 0.25, 0.35]; // Small to large
        const size = sizeCategories[Math.floor(Math.random() * sizeCategories.length)];
        
        // Lifetime 5-10 seconds as per requirements
        const lifetime = 5 + Math.random() * 5;
        
        pool.spawn(
          ParticleType.FRAGMENT,
          spawnPos,
          velocity,
          fragmentColor,
          size,
          lifetime
        );
      }
      
      // Spawn sparks at impact point
      if (particleBehavior.sparkCount > 0) {
        const sparkCount = Math.floor(particleBehavior.sparkCount * burstMultiplier * 0.4);
        for (let i = 0; i < Math.min(sparkCount, 10); i++) {
          const angle = Math.random() * Math.PI * 2;
          const pitch = (Math.random() - 0.5) * Math.PI * 0.3;
          const speed = particleBehavior.sparkSpeed * (0.8 + Math.random() * 0.4);
          
          const velocity = new THREE.Vector3(
            Math.cos(angle) * Math.cos(pitch) * speed,
            Math.abs(Math.sin(pitch)) * speed + 2,
            Math.sin(angle) * Math.cos(pitch) * speed
          );
          
          // Sparks with bright glow
          const sparkColor = baseColor.clone();
          sparkColor.offsetHSL(0, 0.2, 0.3);
          
          pool.spawn(
            ParticleType.SPARK,
            impactPointRef.current.clone(),
            velocity,
            sparkColor,
            0.02 + Math.random() * 0.05,
            1 + Math.random() * 2
          );
        }
      }
      
      // Spawn dust cloud at impact
      if (particleBehavior.dustCount > 0) {
        const dustCount = Math.floor(particleBehavior.dustCount * 0.5);
        for (let i = 0; i < Math.min(dustCount, 8); i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 3;
          
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.random() * 2 + 1,
            Math.sin(angle) * speed
          );
          
          const dustColor = baseColor.clone();
          dustColor.lerp(new THREE.Color(0x8b7355), 0.6);
          
          pool.spawn(
            ParticleType.DUST,
            impactPointRef.current.clone(),
            velocity,
            dustColor,
            0.4 + Math.random() * 0.6,
            3 + Math.random() * 4
          );
        }
      }
    }
    
    // Regular continuous spawning for active mining
    const baseSpawnRate = 0.1; // Faster spawn rate for continuous effect
    const spawnInterval = baseSpawnRate;
    
    if (currentTime - lastSpawnTimeRef.current > spawnInterval && isActive && progress > 0 && progress < 1) {
      lastSpawnTimeRef.current = currentTime;
      
      // Continuous smaller particles while mining
      if (Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 3;
        
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          2 + Math.random() * 2,
          Math.sin(angle) * speed
        );
        
        pool.spawn(
          ParticleType.FRAGMENT,
          new THREE.Vector3(
            position[0] + (Math.random() - 0.5) * 0.5,
            position[1] + Math.random() * 0.3,
            position[2] + (Math.random() - 0.5) * 0.5
          ),
          velocity,
          baseColor.clone(),
          0.05 + Math.random() * 0.1,
          3 + Math.random() * 3
        );
      }
      
    }
    
    // Update particles
    pool.update(delta, terrainHeightAt);
    setParticles([...pool.getActiveParticles()]);
  });
  
  return (
    <group>
      <FragmentParticles particles={particles} color={baseColor} />
      <SparkParticles particles={particles} color={baseColor} />
      <DustParticles particles={particles} color={baseColor} />
      <DropletParticles particles={particles} color={baseColor} />
    </group>
  );
}