import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Asteroid as AsteroidType } from "../../lib/stores/space/useAsteroids";
import { FBXAsteroid } from "./FBXAsteroid";

interface AsteroidProps {
  asteroid: AsteroidType;
}

export function Asteroid({ asteroid }: AsteroidProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Update position
      meshRef.current.position.copy(asteroid.position);

      // Apply rotation
      meshRef.current.rotation.x += asteroid.rotation.x;
      meshRef.current.rotation.y += asteroid.rotation.y;
      meshRef.current.rotation.z += asteroid.rotation.z;
    }
  });

  // Calculate damage color (red tint based on damage taken)
  const healthPercent = asteroid.health / asteroid.maxHealth;
  const damageRed = 1 - healthPercent;
  const damageColor = new THREE.Color(
    0.4 + damageRed * 0.6,
    0.3,
    0.2,
  ).getHexString();
  const emissiveColor = new THREE.Color(damageRed * 0.3, 0, 0).getHexString();

  return (
    <FBXAsteroid
      ref={meshRef}
      scale={asteroid.size * 0.3} // Scale down to make small rock-like asteroids (couple feet size)
      color={`#${damageColor}`}
      roughness={0.9}
      metalness={0.1}
      emissive={`#${emissiveColor}`}
      emissiveIntensity={damageRed * 0.5}
      castShadow
      receiveShadow
    />
  );
}
