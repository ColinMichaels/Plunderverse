import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { ResourceData } from "../../lib/planetData";
import { useSurfaceCollision } from "../../lib/stores/surface/useSurfaceCollision";

// Vertex shader for progressive deformation
const vertexShader = `
uniform float uProgress;
uniform float uTime;
uniform float uCrackIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vCrackAmount;

// Simple noise function
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  
  return mix(mix(mix(hash(i + vec3(0, 0, 0)), 
                     hash(i + vec3(1, 0, 0)), f.x),
                 mix(hash(i + vec3(0, 1, 0)), 
                     hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), 
                     hash(i + vec3(1, 0, 1)), f.x),
                 mix(hash(i + vec3(0, 1, 1)), 
                     hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

void main() {
  vUv = uv;
  vNormal = normal;
  vPosition = position;
  
  vec3 pos = position;
  
  // Generate crack pattern
  float crackNoise = noise(position * 3.0 + vec3(uTime * 0.05));
  crackNoise += noise(position * 6.0) * 0.5;
  crackNoise += noise(position * 12.0) * 0.25;
  
  // Create crack mask based on progress
  float crackThreshold = uProgress * 1.5;
  float crackMask = smoothstep(1.0 - crackThreshold, 1.0 - crackThreshold + 0.3, crackNoise);
  vCrackAmount = crackMask;
  
  // Progressive deformation stages
  if (uProgress > 0.0) {
    // 0-25%: Small vibration
    if (uProgress < 0.25) {
      float vibration = sin(uTime * 20.0) * 0.02 * uProgress * 4.0;
      pos += normal * vibration;
    }
    // 25-50%: Cracks and displacement
    else if (uProgress < 0.5) {
      float displacement = crackMask * uCrackIntensity * 0.2;
      pos += normal * displacement;
      float wobble = sin(uTime * 10.0 + position.y * 5.0) * 0.03;
      pos.x += wobble * (uProgress - 0.25) * 4.0;
    }
    // 50-75%: Major fractures
    else if (uProgress < 0.75) {
      float collapseAmount = (uProgress - 0.5) * 4.0;
      vec3 toCenter = -position * 0.3 * collapseAmount;
      pos += toCenter;
      float displacement = crackMask * uCrackIntensity * 0.4;
      pos += normal * displacement;
      float wobble = sin(uTime * 15.0 + position.y * 5.0) * 0.05;
      pos.x += wobble;
      pos.z += cos(uTime * 12.0) * 0.04 * collapseAmount;
    }
    // 75-100%: Final collapse
    else {
      float finalCollapse = (uProgress - 0.75) * 4.0;
      vec3 toCenter = -position * 0.5 * finalCollapse;
      pos += toCenter;
      float fragmentNoise = noise(position * 10.0);
      vec3 fragmentDir = normalize(position + vec3(fragmentNoise));
      pos += fragmentDir * crackMask * 0.3 * finalCollapse;
      float shake = sin(uTime * 30.0) * 0.1 * finalCollapse;
      pos += vec3(shake, shake * 0.5, shake * 0.7);
    }
  }
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// Fragment shader for color changes
const fragmentShader = `
uniform float uProgress;
uniform vec3 uColor;
uniform vec3 uEmissiveColor;
uniform float uEmissiveIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vCrackAmount;

void main() {
  vec3 baseColor = uColor;
  
  // Darken and desaturate based on progress
  float darkness = 1.0 - uProgress * 0.5;
  float desaturation = uProgress * 0.7;
  
  // Desaturate the color
  float gray = dot(baseColor, vec3(0.299, 0.587, 0.114));
  vec3 desaturatedColor = mix(baseColor, vec3(gray), desaturation);
  
  // Apply darkness
  vec3 finalColor = desaturatedColor * darkness;
  
  // Add crack darkness
  if (vCrackAmount > 0.1) {
    finalColor *= (1.0 - vCrackAmount * 0.7);
    // Add slight red/orange glow to cracks
    vec3 crackGlow = vec3(1.0, 0.3, 0.1) * vCrackAmount * 0.3;
    finalColor += crackGlow * uProgress;
  }
  
  // Add emissive glow
  vec3 emissive = uEmissiveColor * uEmissiveIntensity * (1.0 - uProgress * 0.8);
  finalColor += emissive;
  
  // Stage-based color effects
  if (uProgress > 0.75) {
    finalColor = mix(finalColor, vec3(0.8, 0.2, 0.1), (uProgress - 0.75) * 2.0);
  } else if (uProgress > 0.5) {
    finalColor = mix(finalColor, vec3(0.9, 0.5, 0.2), (uProgress - 0.5) * 1.5);
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Create custom shader material
const CrackMaterial = shaderMaterial(
  {
    uProgress: 0,
    uTime: 0,
    uCrackIntensity: 1,
    uCrackCenter: new THREE.Vector3(0, 0, 0),
    uColor: new THREE.Color("#ffffff"),
    uEmissiveColor: new THREE.Color("#000000"),
    uEmissiveIntensity: 0,
  },
  vertexShader,
  fragmentShader
);

// Extend THREE namespace to include the custom material
extend({ CrackMaterial });

// Debris particle component
function DebrisParticle({
  position,
  velocity,
  color,
  scale,
}: {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  scale: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentPos] = useState(() => position.clone());
  const [currentVel] = useState(() => velocity.clone());
  const [lifetime, setLifetime] = useState(1);
  const gravity = new THREE.Vector3(0, -9.8, 0);

  useFrame((state, delta) => {
    if (meshRef.current && lifetime > 0) {
      // Apply physics
      currentVel.addScaledVector(gravity, delta);
      currentPos.addScaledVector(currentVel, delta);
      
      // Ground collision
      if (currentPos.y <= 0.1) {
        currentPos.y = 0.1;
        currentVel.y = Math.abs(currentVel.y) * 0.5; // Bounce with energy loss
        currentVel.multiplyScalar(0.8); // Friction
      }
      
      meshRef.current.position.copy(currentPos);
      meshRef.current.rotation.x += delta * 2;
      meshRef.current.rotation.y += delta * 3;
      
      // Fade out
      const newLifetime = lifetime - delta * 0.5;
      setLifetime(newLifetime);
      meshRef.current.scale.setScalar(scale * newLifetime);
      
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.opacity = newLifetime;
      }
    }
  });

  if (lifetime <= 0) return null;

  return (
    <mesh ref={meshRef} position={currentPos} castShadow>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        metalness={0.2}
        transparent
        opacity={lifetime}
      />
    </mesh>
  );
}

// Debris system component
function DebrisSystem({
  isActive,
  progress,
  position,
  color,
}: {
  isActive: boolean;
  progress: number;
  position: [number, number, number];
  color: string;
}) {
  const [particles, setParticles] = useState<Array<{
    id: string;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    scale: number;
  }>>([]);
  const lastSpawnTime = useRef(0);
  const particleIdCounter = useRef(0);

  useFrame((state) => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    const now = state.clock.elapsedTime;
    
    // Spawn rate based on progress stage
    let spawnInterval = 1.0;
    if (progress > 0.75) {
      spawnInterval = 0.1; // Very frequent in final stage
    } else if (progress > 0.5) {
      spawnInterval = 0.3;
    } else if (progress > 0.25) {
      spawnInterval = 0.5;
    } else {
      return; // No debris in first stage
    }

    if (now - lastSpawnTime.current > spawnInterval) {
      lastSpawnTime.current = now;
      
      // Spawn new debris particles
      const numParticles = progress > 0.75 ? 3 : progress > 0.5 ? 2 : 1;
      const newParticles: Array<{
        id: string;
        position: THREE.Vector3;
        velocity: THREE.Vector3;
        scale: number;
      }> = [];
      
      for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const force = 2 + Math.random() * 3;
        const velocity = new THREE.Vector3(
          Math.cos(angle) * force,
          3 + Math.random() * 2,
          Math.sin(angle) * force
        );
        
        const particlePos = new THREE.Vector3(
          position[0] + (Math.random() - 0.5) * 0.5,
          position[1] + Math.random() * 0.5,
          position[2] + (Math.random() - 0.5) * 0.5
        );
        
        newParticles.push({
          id: `debris-${particleIdCounter.current++}`,
          position: particlePos,
          velocity,
          scale: 0.5 + Math.random() * 0.5,
        });
      }
      
      setParticles(prev => [...prev, ...newParticles].slice(-20)); // Keep max 20 particles
    }
  });

  return (
    <>
      {particles.map(particle => (
        <DebrisParticle
          key={particle.id}
          position={particle.position}
          velocity={particle.velocity}
          color={color}
          scale={particle.scale}
        />
      ))}
    </>
  );
}

interface ResourceNodeProps {
  resource: ResourceData;
  position: [number, number, number];
  onInteract: () => void;
  progress?: number;
  nodeId: string;
}

export function ResourceNode({
  resource,
  position,
  onInteract,
  progress = 0,
  nodeId,
}: ResourceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const { registerCollisionObject, unregisterCollisionObject } = useSurfaceCollision();
  const [previousNodeId, setPreviousNodeId] = useState(nodeId);
  const [wobbleIntensity, setWobbleIntensity] = useState(0);
  const { clock } = useThree();

  // Reset deformation when switching nodes
  useEffect(() => {
    if (nodeId !== previousNodeId) {
      setPreviousNodeId(nodeId);
      setWobbleIntensity(0);
      if (materialRef.current) {
        materialRef.current.uProgress = 0;
      }
    }
  }, [nodeId, previousNodeId]);

  // Update wobble intensity based on progress
  useEffect(() => {
    if (progress > 0.75) {
      setWobbleIntensity(0.15);
    } else if (progress > 0.5) {
      setWobbleIntensity(0.08);
    } else if (progress > 0.25) {
      setWobbleIntensity(0.04);
    } else if (progress > 0) {
      setWobbleIntensity(0.02);
    } else {
      setWobbleIntensity(0);
    }
  }, [progress]);

  // Register collision object
  useEffect(() => {
    const collisionObj = {
      id: nodeId,
      position: new THREE.Vector3(position[0], position[1], position[2]),
      radius: 1.5,
      type: "resource" as const,
    };
    registerCollisionObject(collisionObj);

    return () => {
      unregisterCollisionObject(nodeId);
    };
  }, [nodeId, position[0], position[1], position[2]]);

  // Get color based on rarity
  const getResourceColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "#10B981";
      case "uncommon":
        return "#3B82F6";
      case "rare":
        return "#8B5CF6";
      case "legendary":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  // Determine geometry based on resource type
  const { geometry, useShader } = useMemo(() => {
    const type = resource.type;

    // Water-based resources: flat cylinder
    if (type.includes("Water") || type.includes("Ice")) {
      return {
        geometry: <cylinderGeometry args={[2, 2, 0.3, 16]} />,
        useShader: false, // Water doesn't crack, it just evaporates
      };
    }

    // Crystal/Gem resources: dodecahedron
    if (type.includes("Crystal") || type.includes("Diamond") || type.includes("Gem")) {
      return {
        geometry: <dodecahedronGeometry args={[1.5, 2]} />, // More subdivisions for better deformation
        useShader: true,
      };
    }

    // Gas resources: sphere
    if (type.includes("Gas") || type.includes("Methane")) {
      return {
        geometry: <sphereGeometry args={[1.5, 32, 32]} />, // High subdivision for smooth deformation
        useShader: false, // Gas dissipates rather than cracks
      };
    }

    // Ore/Rock/Metal resources: box
    if (type.includes("Ore") || type.includes("Iron") || type.includes("Rock") || type.includes("Platinum")) {
      return {
        geometry: <boxGeometry args={[2, 2, 2, 4, 4, 4]} />, // Subdivided for deformation
        useShader: true,
      };
    }

    // Default: octahedron
    return {
      geometry: <octahedronGeometry args={[1.5, 2]} />, // More subdivisions
      useShader: true,
    };
  }, [resource.type]);

  // Calculate scale based on mining progress
  const baseScale = 1 - progress * 0.3; // Scale down to 70% of original size
  const hoverScale = hovered ? 1.1 : 1;
  const finalScale = baseScale * hoverScale;

  // Animation frame updates
  useFrame((state) => {
    if (meshRef.current) {
      const isWater = resource.type.includes("Water") || resource.type.includes("Ice");
      
      // Base position with floating animation
      if (!isWater) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2 * (1 - progress);
      } else {
        meshRef.current.position.y = position[1];
      }
      
      // Add wobble based on damage
      if (wobbleIntensity > 0) {
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * wobbleIntensity;
        meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 8) * wobbleIntensity;
      }
      
      // Rotation when hovered
      if (hovered && progress < 0.5) {
        meshRef.current.rotation.y += 0.02;
      }
    }

    // Update shader uniforms
    if (materialRef.current && useShader) {
      materialRef.current.uTime = clock.elapsedTime;
      materialRef.current.uProgress = progress;
      materialRef.current.uCrackIntensity = 1 + progress * 2;
    }
  });

  const resourceColor = getResourceColor(resource.rarity);
  const emissiveIntensity = hovered ? 0.5 : 0.1;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={onInteract}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={finalScale}
        castShadow
        receiveShadow
      >
        {geometry}
        {useShader ? (
          // @ts-ignore - Custom material
          <crackMaterial
            ref={materialRef}
            uColor={new THREE.Color(resourceColor)}
            uEmissiveColor={new THREE.Color(resourceColor)}
            uEmissiveIntensity={emissiveIntensity * (1 - progress * 0.8)}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={resourceColor}
            emissive={resourceColor}
            emissiveIntensity={emissiveIntensity * (1 - progress * 0.8)}
            roughness={0.2 + progress * 0.6}
            metalness={0.8 - progress * 0.5}
            transparent={resource.type.includes("Gas")}
            opacity={resource.type.includes("Gas") ? 0.6 * (1 - progress * 0.5) : 1}
          />
        )}
      </mesh>
      
      {/* Debris system for solid resources */}
      {!resource.type.includes("Water") && !resource.type.includes("Gas") && (
        <DebrisSystem
          isActive={progress > 0.25}
          progress={progress}
          position={position}
          color={resourceColor}
        />
      )}
    </group>
  );
}