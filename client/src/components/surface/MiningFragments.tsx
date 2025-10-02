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

  constructor(maxParticles: number = 50) {  // Reduced from 200 for performance
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

    // Set physics properties based on particle type
    switch (type) {
      case ParticleType.SPARK:
        this.bounce = 0.3;
        this.friction = 0.95;
        this.gravity = -5;
        this.maxTrailLength = 8;
        break;
      case ParticleType.DUST:
        this.bounce = 0;
        this.friction = 0.8;
        this.gravity = -2;
        break;
      case ParticleType.DROPLET:
        this.bounce = 0.2;
        this.friction = 0.9;
        this.gravity = -12;
        break;
      case ParticleType.FRAGMENT:
      default:
        this.bounce = 0.6;
        this.friction = 0.85;
        this.gravity = -9.8;
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
    
    // Ground collision
    const groundHeight = terrainHeightAt(this.position.x, this.position.z) + this.size * 0.5;
    if (this.position.y <= groundHeight) {
      this.position.y = groundHeight;
      this.velocity.y = Math.abs(this.velocity.y) * this.bounce;
      this.velocity.multiplyScalar(this.friction);
      
      // Add some randomness to bounce direction
      if (this.type === ParticleType.FRAGMENT) {
        this.velocity.x += (Math.random() - 0.5) * 0.5;
        this.velocity.z += (Math.random() - 0.5) * 0.5;
      }
    }
    
    // Apply air resistance
    if (this.type === ParticleType.DUST) {
      this.velocity.multiplyScalar(0.99);
    }
    
    // Update rotation
    this.rotation.x += this.rotationSpeed.x * deltaTime;
    this.rotation.y += this.rotationSpeed.y * deltaTime;
    this.rotation.z += this.rotationSpeed.z * deltaTime;
    
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

// Get particle behavior based on resource type
const getResourceParticleBehavior = (resourceType: string): {
  particleTypes: ParticleType[];
  sparkCount: number;
  dustCount: number;
  fragmentCount: number;
  dropletCount: number;
  colorVariation: number;
  sparkSpeed: number;
  fragmentSpeed: number;
} => {
  // Metals: Sparks and metallic shards
  if (resourceType.includes("Iron") || resourceType.includes("Platinum") || resourceType.includes("Metal")) {
    return {
      particleTypes: [ParticleType.SPARK, ParticleType.FRAGMENT],
      sparkCount: 8,
      dustCount: 2,
      fragmentCount: 5,
      dropletCount: 0,
      colorVariation: 0.1,
      sparkSpeed: 8,
      fragmentSpeed: 4,
    };
  }
  
  // Crystals: Glowing fragments with light trails
  if (resourceType.includes("Crystal") || resourceType.includes("Diamond") || resourceType.includes("Gem")) {
    return {
      particleTypes: [ParticleType.SPARK, ParticleType.FRAGMENT],
      sparkCount: 12,
      dustCount: 3,
      fragmentCount: 8,
      dropletCount: 0,
      colorVariation: 0.3,
      sparkSpeed: 10,
      fragmentSpeed: 3,
    };
  }
  
  // Liquids: Splash and droplet effects
  if (resourceType.includes("Water") || resourceType.includes("Ice") || resourceType.includes("Oil")) {
    return {
      particleTypes: [ParticleType.DROPLET, ParticleType.DUST],
      sparkCount: 0,
      dustCount: 5,
      fragmentCount: 0,
      dropletCount: 15,
      colorVariation: 0.2,
      sparkSpeed: 0,
      fragmentSpeed: 0,
    };
  }
  
  // Gas: Mostly dust particles
  if (resourceType.includes("Gas") || resourceType.includes("Methane")) {
    return {
      particleTypes: [ParticleType.DUST],
      sparkCount: 0,
      dustCount: 20,
      fragmentCount: 0,
      dropletCount: 0,
      colorVariation: 0.4,
      sparkSpeed: 0,
      fragmentSpeed: 0,
    };
  }
  
  // Default minerals: Rock chunks and dust
  return {
    particleTypes: [ParticleType.FRAGMENT, ParticleType.DUST],
    sparkCount: 2,
    dustCount: 8,
    fragmentCount: 6,
    dropletCount: 0,
    colorVariation: 0.15,
    sparkSpeed: 4,
    fragmentSpeed: 3,
  };
};

// Instanced mesh for fragments
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
      
      // Apply color with variation
      tempColor.copy(particle.color);
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, fragments.length]} castShadow>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        metalness={0.3}
        vertexColors
      />
    </instancedMesh>
  );
}

// Points geometry for sparks
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
      c.multiplyScalar(intensity * 2); // Make sparks brighter
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    });
    return col;
  }, [sparks]);
  
  const sizes = useMemo(() => {
    const s = new Float32Array(sparks.length);
    sparks.forEach((particle, i) => {
      s[i] = particle.getScale() * 5; // Larger size for visibility
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
        size={0.1}
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
        vertexColors
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
        vertexColors
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
  const particlePoolRef = useRef(new ParticlePool(100)); // Reduced to 100 particles for performance
  const lastSpawnTimeRef = useRef(0);
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
  
  // Spawn particles
  useFrame((state, delta) => {
    const pool = particlePoolRef.current;
    const currentTime = clock.getElapsedTime();
    
    if (!isActive) {
      pool.clear();
      setParticles([]);
      return;
    }
    
    // Calculate spawn rate based on progress and mining efficiency (optimized for performance)
    const baseSpawnRate = 0.2; // Increased interval for less frequent spawning
    const progressMultiplier = 1 + progress * 1.5; // Reduced multiplier
    const efficiencyMultiplier = 0.5 + miningEfficiency * 0.3;
    const spawnInterval = baseSpawnRate / (progressMultiplier * efficiencyMultiplier);
    
    // Spawn new particles
    if (currentTime - lastSpawnTimeRef.current > spawnInterval) {
      lastSpawnTimeRef.current = currentTime;
      
      const spawnPos = new THREE.Vector3(
        position[0] + (Math.random() - 0.5) * 0.5,
        position[1] + Math.random() * 0.5,
        position[2] + (Math.random() - 0.5) * 0.5
      );
      
      // Spawn sparks (reduced probability and count)
      if (particleBehavior.sparkCount > 0 && Math.random() < 0.4) {
        const sparkCount = Math.max(1, Math.floor(particleBehavior.sparkCount * 0.3 * (0.5 + progress * 0.5)));
        for (let i = 0; i < sparkCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const pitch = (Math.random() - 0.5) * Math.PI * 0.5;
          const speed = particleBehavior.sparkSpeed * (0.5 + Math.random());
          
          const velocity = new THREE.Vector3(
            Math.cos(angle) * Math.cos(pitch) * speed,
            Math.sin(pitch) * speed + 3,
            Math.sin(angle) * Math.cos(pitch) * speed
          );
          
          const sparkColor = baseColor.clone();
          sparkColor.offsetHSL(0, 0, Math.random() * 0.3 - 0.15);
          
          pool.spawn(
            ParticleType.SPARK,
            spawnPos.clone(),
            velocity,
            sparkColor,
            0.05 + Math.random() * 0.05,
            0.5 + Math.random() * 0.5
          );
        }
      }
      
      // Spawn fragments (reduced probability and count)
      if (particleBehavior.fragmentCount > 0 && Math.random() < 0.3) {
        const fragmentCount = Math.max(1, Math.floor(particleBehavior.fragmentCount * 0.4 * (0.3 + progress * 0.7)));
        for (let i = 0; i < fragmentCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = particleBehavior.fragmentSpeed * (0.5 + Math.random());
          
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            2 + Math.random() * 3,
            Math.sin(angle) * speed
          );
          
          const fragmentColor = baseColor.clone();
          fragmentColor.offsetHSL(
            Math.random() * particleBehavior.colorVariation - particleBehavior.colorVariation / 2,
            0,
            Math.random() * 0.2 - 0.1
          );
          
          pool.spawn(
            ParticleType.FRAGMENT,
            spawnPos.clone(),
            velocity,
            fragmentColor,
            0.1 + Math.random() * 0.2,
            1 + Math.random() * 2
          );
        }
      }
      
      // Spawn dust (reduced count for performance)
      if (particleBehavior.dustCount > 0 && Math.random() < 0.5) {
        const dustCount = Math.max(1, Math.floor(particleBehavior.dustCount * 0.3 * (0.5 + progress * 0.5)));
        for (let i = 0; i < dustCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 2;
          
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.random() * 2,
            Math.sin(angle) * speed
          );
          
          const dustColor = baseColor.clone();
          dustColor.lerp(new THREE.Color(0x8b7355), 0.5); // Mix with brown
          
          pool.spawn(
            ParticleType.DUST,
            spawnPos.clone(),
            velocity,
            dustColor,
            0.3 + Math.random() * 0.4,
            2 + Math.random() * 3
          );
        }
      }
      
      // Spawn droplets for liquids
      if (particleBehavior.dropletCount > 0 && Math.random() < 0.8) {
        const dropletCount = Math.floor(particleBehavior.dropletCount * (0.5 + progress * 0.5));
        for (let i = 0; i < dropletCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            3 + Math.random() * 4,
            Math.sin(angle) * speed
          );
          
          const dropletColor = baseColor.clone();
          dropletColor.offsetHSL(0, 0.2, Math.random() * 0.2 - 0.1);
          
          pool.spawn(
            ParticleType.DROPLET,
            spawnPos.clone(),
            velocity,
            dropletColor,
            0.05 + Math.random() * 0.1,
            0.5 + Math.random() * 1.5
          );
        }
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