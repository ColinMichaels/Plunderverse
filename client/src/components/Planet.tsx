import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { PlanetData } from "../lib/planetData";
import { useSolarSystem } from "../lib/stores/useSolarSystem";

interface PlanetProps {
  data: PlanetData;
  time: number;
}

export function Planet({ data, time }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { setSelectedPlanet, selectedPlanet } = useSolarSystem();
  const [hovered, setHovered] = useState(false);

  // Planet texture mapping - only for textures that exist
  const getTextureForPlanet = (planetName: string) => {
    const textureMap: { [key: string]: string } = {
      "Earth": "/textures/planets/2k_earth_daymap.jpg",
      "Mars": "/textures/planets/2k_mars.jpg",
      "Jupiter": "/textures/planets/2k_jupiter.jpg",
      "Saturn": "/textures/planets/2k_saturn.jpg",
      "Uranus": "/textures/planets/2k_uranus.jpg",
      "Neptune": "/textures/planets/2k_neptune.jpg"
    };
    return textureMap[planetName] || null;
  };

  const textureUrl = getTextureForPlanet(data.name);
  const planetTexture = textureUrl ? useTexture(textureUrl) : null;

  // Calculate orbital position
  useFrame(() => {
    if (groupRef.current) {
      const angle = time * data.orbitalSpeed;
      const x = Math.cos(angle) * data.distance;
      const z = Math.sin(angle) * data.distance;
      groupRef.current.position.set(x, 0, z);
    }

    // Rotate the planet
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed;
    }

    // Check distance to camera for auto-selection
    if (groupRef.current) {
      const distance = camera.position.distanceTo(groupRef.current.position);
      if (distance < data.size * 3 && selectedPlanet !== data.name) {
        setSelectedPlanet(data.name);
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
          roughness={0.8}
          metalness={0.1}
          emissive={isSelected || hovered ? data.color : "#000000"}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.1 : 0}
        />
      </Sphere>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[data.size * 1.2, data.size * 1.4, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Planet atmosphere glow for gas giants */}
      {(data.name === "Jupiter" || data.name === "Saturn" || data.name === "Uranus" || data.name === "Neptune") && (
        <Sphere args={[data.size * 1.1, 32, 32]}>
          <meshBasicMaterial
            color={data.color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Saturn's rings */}
      {data.name === "Saturn" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.size * 1.2, data.size * 2, 64]} />
          <meshStandardMaterial
            color="#D4AF37"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
