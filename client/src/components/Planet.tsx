import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { PlanetData } from "../lib/planetData";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useDebugWireframe } from "./DebugWireframeWrapper";

interface PlanetProps {
  data: PlanetData;
  time: number;
}

export function Planet({ data, time }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { setSelectedPlanet, selectedPlanet, setDistanceToTarget } =
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

  // Calculate orbital position and sun-based lighting
  useFrame(() => {
    if (groupRef.current) {
      const angle = time * data.orbitalSpeed;
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
      {/* Orbital path visualization */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[data.distance - 0.1, data.distance + 0.1, 64]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.3} />
      </mesh>

      {/* Planet */}
      <Sphere
        ref={meshRef}
        args={[data.size, 32, 32]}
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
          <ringGeometry args={[data.size * 1.2, data.size * 1.4, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>
      )}

      {/* Enhanced atmospheric glow for planets with atmospheres */}
      {materialProps.atmosphericGlow && (
        <>
          {/* Primary atmospheric layer */}
          <Sphere args={[data.size * 1.08, 32, 32]}>
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
            <Sphere args={[data.size * 1.15, 32, 32]}>
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

      {/* Enhanced Saturn's rings with realistic lighting */}
      {data.name === "Saturn" && (
        <>
          {/* Main ring structure */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[data.size * 1.15, data.size * 1.8, 64]} />
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
            <ringGeometry args={[data.size * 1.9, data.size * 2.2, 64]} />
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
