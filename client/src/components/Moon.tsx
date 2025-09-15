import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { planets } from "../lib/planetData";

export function Moon() {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { setSelectedPlanet, selectedPlanet, setDistanceToTarget } = useSolarSystem();
  const [hovered, setHovered] = useState(false);

  // Find Earth to orbit around
  const earth = planets.find(p => p.name === "Earth");
  if (!earth) return null;

  // Moon texture
  const moonTexture = useTexture("/textures/planets/2k_moon.jpg");

  // Moon properties (realistic scale relative to Earth)
  const moonSize = 0.3; // About 1/4 of Earth's size
  const moonDistance = 4; // Distance from Earth
  const orbitalSpeed = 0.08; // Slower than planets
  const rotationSpeed = 0.001;

  // Calculate orbital position around Earth
  useFrame(({ clock }) => {
    if (groupRef.current && earth) {
      const time = clock.getElapsedTime();
      
      // Calculate Earth's current position
      const earthAngle = time * earth.orbitalSpeed;
      const earthX = Math.cos(earthAngle) * earth.distance;
      const earthZ = Math.sin(earthAngle) * earth.distance;
      
      // Calculate Moon's orbit around Earth
      const moonAngle = time * orbitalSpeed;
      const moonX = earthX + Math.cos(moonAngle) * moonDistance;
      const moonZ = earthZ + Math.sin(moonAngle) * moonDistance;
      
      groupRef.current.position.set(moonX, 0, moonZ);
    }

    // Rotate the moon (tidally locked - same rotation as orbital period)
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }

    // Check distance to camera for auto-selection
    if (groupRef.current) {
      const distance = camera.position.distanceTo(groupRef.current.position);
      
      // Auto-select nearby moon
      if (distance < moonSize * 3 && selectedPlanet !== "Moon") {
        setSelectedPlanet("Moon");
      }
      
      // Update real-time distance if this is the selected celestial body
      if (selectedPlanet === "Moon") {
        setDistanceToTarget(distance);
      }
    }
  });

  const handleClick = () => {
    if (groupRef.current) {
      setSelectedPlanet("Moon");
      console.log("Clicked on Moon");
    }
  };

  const isSelected = selectedPlanet === "Moon";

  return (
    <group ref={groupRef}>
      <Sphere
        ref={meshRef}
        args={[moonSize, 32, 32]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          map={moonTexture}
          emissive={isSelected ? "#ffffff" : hovered ? "#666666" : "#000000"}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.1 : 0}
        />
      </Sphere>

      {/* Moon selection indicator */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[moonSize * 1.5, moonSize * 1.7, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Orbit path visualization */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[moonDistance - 0.02, moonDistance + 0.02, 64]} />
        <meshBasicMaterial
          color="#444444"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}