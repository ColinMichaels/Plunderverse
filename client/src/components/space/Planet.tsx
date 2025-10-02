import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { PlanetData } from "../../lib/planetData";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useDebugWireframe } from "../debug/DebugWireframeWrapper";
import { resourceManager } from "../../lib/utils/ResourceManager";

interface PlanetProps {
  data: PlanetData;
  time: number; // Keep for compatibility but use universe time internally
}

export function Planet({ data, time }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { setSelectedPlanet, selectedPlanet, setDistanceToTarget, getUniverseTime } =
    useSolarSystem();
  const [hovered, setHovered] = useState(false);
  const showWireframes = useDebugWireframe();

  // Planet texture mapping - only for textures that exist
  const getTextureForPlanet = (planetName: string) => {
    const textureMap: { [key: string]: string } = {
      Mercury: "/textures/planets/2k_mercury.jpg",
      Venus: "/textures/planets/2k_venus_surface.jpg",
      Earth: "/textures/planets/2k_earth_daymap.jpg",
      Mars: "/textures/planets/2k_mars.jpg",
      Jupiter: "/textures/planets/2k_jupiter.jpg",
      Saturn: "/textures/planets/2k_saturn.jpg",
      Uranus: "/textures/planets/2k_uranus.jpg",
      Neptune: "/textures/planets/2k_neptune.jpg",
      Ceres: "/textures/planets/2k_ceres_fictional.jpg",
    };
    return textureMap[planetName] || null;
  };

  const textureUrl = getTextureForPlanet(data.name);
  const planetTexture = textureUrl ? useTexture(textureUrl) : null;

  // Register resources with ResourceManager
  useEffect(() => {
    console.log(`[Planet ${data.name}] Registering resources with ResourceManager`);
    
    // Register planet texture if it exists
    if (planetTexture) {
      resourceManager.registerTexture(`planet-texture-${data.name}`, planetTexture, ['space-scene', 'planets', data.name]);
    }
    
    // Cleanup will happen automatically when materials/geometries are disposed by Three.js
    return () => {
      console.log(`[Planet ${data.name}] Cleaning up resources`);
      // Dispose specific planet resources
      if (planetTexture) {
        resourceManager.disposeResource(`planet-texture-${data.name}`);
      }
    };
  }, [data.name, planetTexture]);

  // Enhanced material properties based on planet type
  const getPlanetMaterialProperties = (planetName: string) => {
    const materialMap: { [key: string]: { roughness: number; metalness: number; emissiveIntensity: number; atmosphericGlow: boolean } } = {
      Mercury: { roughness: 0.95, metalness: 0.05, emissiveIntensity: 0.02, atmosphericGlow: false }, // Very rough, rocky
      Venus: { roughness: 0.3, metalness: 0.1, emissiveIntensity: 0.15, atmosphericGlow: true }, // Smooth due to thick atmosphere
      Earth: { roughness: 0.7, metalness: 0.1, emissiveIntensity: 0.05, atmosphericGlow: true }, // Moderate roughness
      Mars: { roughness: 0.9, metalness: 0.05, emissiveIntensity: 0.03, atmosphericGlow: false }, // Very rough, dusty
      Jupiter: { roughness: 0.2, metalness: 0.0, emissiveIntensity: 0.08, atmosphericGlow: true }, // Smooth gas giant
      Saturn: { roughness: 0.25, metalness: 0.0, emissiveIntensity: 0.06, atmosphericGlow: true }, // Smooth gas giant
      Uranus: { roughness: 0.3, metalness: 0.0, emissiveIntensity: 0.04, atmosphericGlow: true }, // Ice giant
      Neptune: { roughness: 0.3, metalness: 0.0, emissiveIntensity: 0.06, atmosphericGlow: true }, // Ice giant
      Ceres: { roughness: 0.95, metalness: 0.02, emissiveIntensity: 0.01, atmosphericGlow: false }, // Very rough asteroid
    };
    return materialMap[planetName] || { roughness: 0.8, metalness: 0.1, emissiveIntensity: 0.05, atmosphericGlow: false };
  };

  const materialProps = getPlanetMaterialProperties(data.name);

  // Material refs for direct property updates and distance-based atmospheric effects
  const lightIntensity = useRef(1.0);
  const atmosphereRef = useRef<THREE.MeshBasicMaterial>(null);
  const atmosphereOuterRef = useRef<THREE.MeshBasicMaterial>(null);
  
  // Proximity-based scaling state
  const [scaleMultiplier, setScaleMultiplier] = useState(1.0);
  const targetScaleRef = useRef(1.0);
  const currentScaleRef = useRef(1.0);

  // Calculate orbital position and sun-based lighting
  useFrame(() => {
    if (groupRef.current) {
      // Use universe time for consistent orbital positions
      const universeTime = getUniverseTime();
      const angle = universeTime * data.orbitalSpeed;
      const x = Math.cos(angle) * data.distance;
      const z = Math.sin(angle) * data.distance;
      groupRef.current.position.set(x, 0, z);

      // Calculate distance-based atmospheric intensity for enhanced realism
      const planetPosition = new THREE.Vector3(x, 0, z);
      const distanceFromSun = planetPosition.length();
      const earthDistance = 75; // Reference distance (Earth's distance)
      const baseIntensity = Math.pow(earthDistance / distanceFromSun, 2);
      
      // Clamp intensity to reasonable values for atmospheric effects
      const clampedIntensity = Math.max(0.1, Math.min(4.0, baseIntensity));
      lightIntensity.current = clampedIntensity;

      // Update atmospheric material properties directly for performance
      if (atmosphereRef.current) {
        const baseOpacity = data.name === "Venus" ? 0.15 : data.name === "Earth" ? 0.08 : 0.06;
        atmosphereRef.current.opacity = baseOpacity * Math.sqrt(clampedIntensity);
      }
      if (atmosphereOuterRef.current) {
        atmosphereOuterRef.current.opacity = 0.03 * Math.sqrt(clampedIntensity);
      }
    }

    // Rotate the planet
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed;
    }

    // Check distance to camera for auto-selection and update real-time distance
    if (groupRef.current) {
      const distance = camera.position.distanceTo(groupRef.current.position);

      // Auto-select nearby planets
      if (distance < data.size * 3 && selectedPlanet !== data.name) {
        setSelectedPlanet(data.name);
      }

      // Update real-time distance if this is the selected planet
      if (selectedPlanet === data.name) {
        setDistanceToTarget(distance);
      }
      
      // Proximity-based planet scaling - scale up when camera is within 50 units
      const scalingDistance = 50;
      const minScale = 1.0;
      const maxScale = 1.2; // 20% larger when very close
      
      if (distance <= scalingDistance) {
        // Calculate scale based on distance (closer = larger)
        const t = THREE.MathUtils.clamp(1 - (distance / scalingDistance), 0, 1);
        // Use smooth interpolation for gradual scaling
        targetScaleRef.current = THREE.MathUtils.lerp(minScale, maxScale, t * t); // Squared for smoother curve
      } else {
        targetScaleRef.current = minScale;
      }
      
      // Smooth lerp to avoid pop-in effects
      currentScaleRef.current = THREE.MathUtils.lerp(
        currentScaleRef.current,
        targetScaleRef.current,
        0.05 // Slow interpolation for smooth transitions
      );
      
      // Apply the scale to the planet and its components
      if (Math.abs(currentScaleRef.current - scaleMultiplier) > 0.001) {
        setScaleMultiplier(currentScaleRef.current);
      }
    }
  });

  const handleClick = () => {
    if (groupRef.current) {
      setSelectedPlanet(data.name);
      console.log(`Clicked on ${data.name}`);
    }
  };

  const isSelected = selectedPlanet === data.name;

  return (
    <group ref={groupRef}>
      {/* Orbital path visualization - removed for more natural look */}

      {/* Planet */}
      <Sphere
        ref={meshRef}
        args={[data.size * scaleMultiplier, 32, 32]}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={planetTexture ? "#ffffff" : data.color}
          map={planetTexture}
          roughness={materialProps.roughness}
          metalness={materialProps.metalness}
          emissive={isSelected || hovered ? data.color : "#000000"}
          emissiveIntensity={isSelected ? 0.12 : hovered ? 0.06 : 0}
          wireframe={showWireframes}
        />
      </Sphere>

      {/* Selection ring - reduced opacity */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[data.size * 1.2 * scaleMultiplier, data.size * 1.4 * scaleMultiplier, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>
      )}

      {/* Enhanced atmospheric glow for planets with atmospheres */}
      {materialProps.atmosphericGlow && (
        <>
          {/* Primary atmospheric layer */}
          <Sphere args={[data.size * 1.08 * scaleMultiplier, 32, 32]}>
            <meshBasicMaterial
              color={data.color}
              transparent
              opacity={data.name === "Venus" ? 0.15 : data.name === "Earth" ? 0.08 : 0.06}
              ref={atmosphereRef}
              side={THREE.BackSide}
            />
          </Sphere>
          {/* Outer atmospheric layer for gas giants */}
          {(data.name === "Jupiter" || data.name === "Saturn" || data.name === "Uranus" || data.name === "Neptune") && (
            <Sphere args={[data.size * 1.15 * scaleMultiplier, 32, 32]}>
              <meshBasicMaterial
                color={data.color}
                transparent
                opacity={0.03}
                ref={atmosphereOuterRef}
                side={THREE.BackSide}
              />
            </Sphere>
          )}
        </>
      )}

      {/* Enhanced Saturn's rings with realistic lighting - scale proportionally */}
      {data.name === "Saturn" && (
        <>
          {/* Main ring structure */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[data.size * 1.15 * scaleMultiplier, data.size * 1.8 * scaleMultiplier, 64]} />
            <meshStandardMaterial
              color="#D4AF37"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
          {/* Outer ring layer */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[data.size * 1.9 * scaleMultiplier, data.size * 2.2 * scaleMultiplier, 64]} />
            <meshStandardMaterial
              color="#C4A037"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
