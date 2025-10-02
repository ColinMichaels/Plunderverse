import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { ResourceData } from "../../lib/planetData";
import { useSurfaceCollision } from "../../lib/stores/surface/useSurfaceCollision";
import { MiningFragments } from "./MiningFragments";
import { ResourceParticleAura } from "./ResourceParticleAura";
import { useSurfacePlayer } from "../../lib/stores/surface/useSurfacePlayer";
import { useSettings } from "../../lib/stores/ui/useSettings";
import { rimLightVertexShader, rimLightFragmentShader } from "../../shaders/rimLight";

// Enhanced rim light material for glow effects
const RimLightMaterial = shaderMaterial(
  {
    uColor: new THREE.Color("#ffffff"),
    uRimColor: new THREE.Color("#ffffff"),
    uRimPower: 2.0,
    uRimIntensity: 1.0,
    uTime: 0,
    uPulseSpeed: 1.0,
    uPulseIntensity: 0.5,
    uEmissiveIntensity: 0.5,
    uProximityIntensity: 0,
  },
  rimLightVertexShader,
  rimLightFragmentShader
);

extend({ RimLightMaterial });

// Crack deformation vertex shader
const crackVertexShader = `
uniform float uProgress;
uniform float uTime;
uniform float uCrackIntensity;
uniform float uFloatAmount;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vCrackAmount;
varying vec3 vViewPosition;

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
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  
  vec3 pos = position;
  
  // Add floating animation for rare/legendary
  float floatOffset = sin(uTime * 2.0) * uFloatAmount * 0.2;
  pos.y += floatOffset;
  
  // Generate crack pattern
  float crackNoise = noise(position * 3.0 + vec3(uTime * 0.05));
  crackNoise += noise(position * 6.0) * 0.5;
  crackNoise += noise(position * 12.0) * 0.25;
  
  float crackThreshold = uProgress * 1.5;
  float crackMask = smoothstep(1.0 - crackThreshold, 1.0 - crackThreshold + 0.3, crackNoise);
  vCrackAmount = crackMask;
  
  // Progressive deformation based on mining progress
  if (uProgress > 0.0) {
    if (uProgress < 0.25) {
      float vibration = sin(uTime * 20.0) * 0.02 * uProgress * 4.0;
      pos += normal * vibration;
    }
    else if (uProgress < 0.5) {
      float displacement = crackMask * uCrackIntensity * 0.2;
      pos += normal * displacement;
      float wobble = sin(uTime * 10.0 + position.y * 5.0) * 0.03;
      pos.x += wobble * (uProgress - 0.25) * 4.0;
    }
    else if (uProgress < 0.75) {
      float collapseAmount = (uProgress - 0.5) * 4.0;
      vec3 toCenter = -position * 0.3 * collapseAmount;
      pos += toCenter;
      float displacement = crackMask * uCrackIntensity * 0.4;
      pos += normal * displacement;
    }
    else {
      float finalCollapse = (uProgress - 0.75) * 4.0;
      vec3 toCenter = -position * 0.5 * finalCollapse;
      pos += toCenter;
      float fragmentNoise = noise(position * 10.0);
      vec3 fragmentDir = normalize(position + vec3(fragmentNoise));
      pos += fragmentDir * crackMask * 0.3 * finalCollapse;
    }
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Enhanced fragment shader with rim lighting
const enhancedFragmentShader = `
uniform float uProgress;
uniform vec3 uColor;
uniform vec3 uEmissiveColor;
uniform float uEmissiveIntensity;
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimIntensity;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseIntensity;
uniform float uProximityIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vCrackAmount;
varying vec3 vViewPosition;

void main() {
  vec3 baseColor = uColor;
  
  // Calculate rim lighting
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
  rim = pow(rim, uRimPower);
  
  // Pulsing effect
  float pulse = 0.5 + 0.5 * sin(uTime * uPulseSpeed);
  float glowIntensity = uRimIntensity * (1.0 + pulse * uPulseIntensity);
  
  // Apply proximity boost
  glowIntensity *= (1.0 + uProximityIntensity);
  
  // Darken and desaturate based on mining progress
  float darkness = 1.0 - uProgress * 0.5;
  float desaturation = uProgress * 0.7;
  
  float gray = dot(baseColor, vec3(0.299, 0.587, 0.114));
  vec3 desaturatedColor = mix(baseColor, vec3(gray), desaturation);
  vec3 finalColor = desaturatedColor * darkness;
  
  // Add crack darkness
  if (vCrackAmount > 0.1) {
    finalColor *= (1.0 - vCrackAmount * 0.7);
    vec3 crackGlow = vec3(1.0, 0.3, 0.1) * vCrackAmount * 0.3;
    finalColor += crackGlow * uProgress;
  }
  
  // Add rim glow
  vec3 rimGlow = uRimColor * rim * glowIntensity;
  
  // Add emissive glow with pulse
  vec3 emissive = uEmissiveColor * uEmissiveIntensity * (1.0 + pulse * 0.3) * (1.0 - uProgress * 0.8);
  
  finalColor += rimGlow + emissive;
  
  // Extra glow for legendary items
  if (uEmissiveIntensity > 0.8) {
    float extraGlow = rim * rim * glowIntensity * 0.5;
    finalColor += uRimColor * extraGlow;
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Create enhanced material with rim lighting
const EnhancedCrackMaterial = shaderMaterial(
  {
    uProgress: 0,
    uTime: 0,
    uCrackIntensity: 1,
    uFloatAmount: 0,
    uColor: new THREE.Color("#ffffff"),
    uEmissiveColor: new THREE.Color("#000000"),
    uEmissiveIntensity: 0,
    uRimColor: new THREE.Color("#ffffff"),
    uRimPower: 2.0,
    uRimIntensity: 1.0,
    uPulseSpeed: 1.0,
    uPulseIntensity: 0.5,
    uProximityIntensity: 0,
  },
  crackVertexShader,
  enhancedFragmentShader
);

extend({ EnhancedCrackMaterial });

interface ResourceNodeProps {
  resource: ResourceData;
  position: [number, number, number];
  onInteract: () => void;
  progress?: number;
  nodeId: string;
}

// Get glow configuration based on rarity
function getGlowConfig(rarity: string) {
  switch (rarity) {
    case "common":
      return {
        color: "#10B981",
        rimColor: "#10B981",
        emissiveIntensity: 0.05,
        rimIntensity: 0.2,
        pulseSpeed: 0.5,
        pulseIntensity: 0.1,
        lightIntensity: 0,
        lightDistance: 0,
        floatAmount: 0,
      };
    case "uncommon":
      return {
        color: "#3B82F6",
        rimColor: "#60A5FA",
        emissiveIntensity: 0.3,
        rimIntensity: 0.5,
        pulseSpeed: 1.0,
        pulseIntensity: 0.3,
        lightIntensity: 0,
        lightDistance: 0,
        floatAmount: 0.2,
      };
    case "rare":
      return {
        color: "#8B5CF6",
        rimColor: "#A78BFA",
        emissiveIntensity: 0.6,
        rimIntensity: 1.0,
        pulseSpeed: 2.0,
        pulseIntensity: 0.5,
        lightIntensity: 0.5,
        lightDistance: 10,
        floatAmount: 0.5,
      };
    case "legendary":
      return {
        color: "#F59E0B",
        rimColor: "#FCD34D",
        emissiveIntensity: 1.0,
        rimIntensity: 1.5,
        pulseSpeed: 3.0,
        pulseIntensity: 0.7,
        lightIntensity: 1.0,
        lightDistance: 15,
        floatAmount: 1.0,
      };
    default:
      return {
        color: "#6B7280",
        rimColor: "#9CA3AF",
        emissiveIntensity: 0,
        rimIntensity: 0.1,
        pulseSpeed: 0.5,
        pulseIntensity: 0,
        lightIntensity: 0,
        lightDistance: 0,
        floatAmount: 0,
      };
  }
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
  const lightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const { registerCollisionObject, unregisterCollisionObject } = useSurfaceCollision();
  const [previousNodeId, setPreviousNodeId] = useState(nodeId);
  const [wobbleIntensity, setWobbleIntensity] = useState(0);
  const { clock } = useThree();
  const playerPosition = useSurfacePlayer((state) => state.position);
  const { enableDynamicLights, graphicsQuality, enableParticles } = useSettings();
  
  // Calculate proximity to player
  const proximityIntensity = useMemo(() => {
    const distance = playerPosition.distanceTo(new THREE.Vector3(...position));
    const maxDistance = 15;
    const minDistance = 3;
    
    if (distance > maxDistance) return 0;
    if (distance < minDistance) return 1;
    
    return 1 - (distance - minDistance) / (maxDistance - minDistance);
  }, [playerPosition, position]);

  // Get glow configuration
  const glowConfig = useMemo(() => getGlowConfig(resource.rarity), [resource.rarity]);

  // LOD - reduce effects at distance
  const lodDistance = useMemo(() => {
    const distance = playerPosition.distanceTo(new THREE.Vector3(...position));
    if (graphicsQuality === 'low') return distance > 20;
    if (graphicsQuality === 'medium') return distance > 30;
    return distance > 50; // high quality
  }, [playerPosition, position, graphicsQuality]);

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
  }, [nodeId, position, registerCollisionObject, unregisterCollisionObject]);

  // Determine geometry based on resource type
  const { geometry, useShader } = useMemo(() => {
    const type = resource.type;

    if (type.includes("Water") || type.includes("Ice")) {
      return {
        geometry: <cylinderGeometry args={[2, 2, 0.3, 16]} />,
        useShader: false,
      };
    }

    if (type.includes("Crystal") || type.includes("Diamond") || type.includes("Gem")) {
      return {
        geometry: <dodecahedronGeometry args={[1.5, 2]} />,
        useShader: true,
      };
    }

    if (type.includes("Gas") || type.includes("Methane")) {
      return {
        geometry: <sphereGeometry args={[1.5, 32, 32]} />,
        useShader: false,
      };
    }

    if (type.includes("Ore") || type.includes("Iron") || type.includes("Rock") || type.includes("Platinum")) {
      return {
        geometry: <boxGeometry args={[2, 2, 2, 4, 4, 4]} />,
        useShader: true,
      };
    }

    return {
      geometry: <octahedronGeometry args={[1.5, 2]} />,
      useShader: true,
    };
  }, [resource.type]);

  // Calculate scale based on mining progress
  const baseScale = 1 - progress * 0.3;
  const hoverScale = hovered ? 1.1 : 1;
  const finalScale = baseScale * hoverScale;

  // Animation frame updates
  useFrame((state) => {
    if (meshRef.current) {
      const isWater = resource.type.includes("Water") || resource.type.includes("Ice");
      
      // Base position with floating animation for rare/legendary
      if (!isWater && glowConfig.floatAmount > 0 && !lodDistance) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * glowConfig.floatAmount * 0.2 * (1 - progress);
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
      materialRef.current.uFloatAmount = glowConfig.floatAmount;
      materialRef.current.uProximityIntensity = proximityIntensity * 0.5;
    }

    // Update light intensity based on proximity
    if (lightRef.current && enableDynamicLights) {
      lightRef.current.intensity = glowConfig.lightIntensity * (0.5 + proximityIntensity * 0.5) * (1 - progress);
    }
  });

  const emissiveIntensity = (hovered ? glowConfig.emissiveIntensity * 1.5 : glowConfig.emissiveIntensity) * (!lodDistance ? 1 : 0.3);
  const showLight = enableDynamicLights && glowConfig.lightIntensity > 0 && !lodDistance && (resource.rarity === 'rare' || resource.rarity === 'legendary');

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={onInteract}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={finalScale}
        castShadow={!lodDistance}
        receiveShadow={!lodDistance}
      >
        {geometry}
        {useShader ? (
          // @ts-ignore - Custom material
          <enhancedCrackMaterial
            ref={materialRef}
            uColor={new THREE.Color(glowConfig.color)}
            uEmissiveColor={new THREE.Color(glowConfig.color)}
            uEmissiveIntensity={emissiveIntensity}
            uRimColor={new THREE.Color(glowConfig.rimColor)}
            uRimPower={2.0}
            uRimIntensity={glowConfig.rimIntensity * (!lodDistance ? 1 : 0.2)}
            uPulseSpeed={glowConfig.pulseSpeed}
            uPulseIntensity={glowConfig.pulseIntensity}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={glowConfig.color}
            emissive={glowConfig.color}
            emissiveIntensity={emissiveIntensity * (1 - progress * 0.8)}
            roughness={0.2 + progress * 0.6}
            metalness={0.8 - progress * 0.5}
            transparent={resource.type.includes("Gas")}
            opacity={resource.type.includes("Gas") ? 0.6 * (1 - progress * 0.5) : 1}
          />
        )}
      </mesh>
      
      {/* Dynamic point light for rare and legendary resources */}
      {showLight && (
        <pointLight
          ref={lightRef}
          position={[position[0], position[1] + 2, position[2]]}
          color={glowConfig.color}
          intensity={glowConfig.lightIntensity}
          distance={glowConfig.lightDistance}
          decay={2}
        />
      )}
      
      {/* Particle aura for legendary resources */}
      <ResourceParticleAura
        position={position}
        color={glowConfig.color}
        rarity={resource.rarity}
        isActive={!lodDistance && progress < 0.5}
      />
      
      {/* Mining particle effects */}
      <MiningFragments
        resource={resource}
        position={position}
        progress={progress}
        isActive={progress > 0}
      />
    </group>
  );
}