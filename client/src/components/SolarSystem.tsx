import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Starfield } from "./Starfield";
import { CameraController } from "./CameraController";
import { ShootingSystem } from "./ShootingSystem";
import { AsteroidField } from "./AsteroidField";
import { planets } from "../lib/planetData";
import { useSolarSystem } from "../lib/stores/useSolarSystem";

export function SolarSystem() {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime } = useSolarSystem();

  // Update orbital mechanics
  useFrame((state, delta) => {
    setTime(time + delta * 0.1); // Slow down time for better visualization
  });

  return (
    <group ref={systemRef}>
      {/* Minimal ambient lighting - sun is primary light source */}
      <ambientLight intensity={0.05} />
      
      {/* Starfield background */}
      <Starfield />
      
      {/* Sun at the center */}
      <Sun />
      
      {/* Planets */}
      {planets.map((planetData: any, index: number) => (
        <Planet
          key={planetData.name}
          data={planetData}
          time={time}
        />
      ))}
      
      {/* Camera controller */}
      <CameraController />
      
      {/* Shooting system */}
      <ShootingSystem />
      
      {/* Asteroid field */}
      <AsteroidField />
    </group>
  );
}
