import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Starfield } from "./Starfield";
import { CameraController } from "./CameraController";
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
      {/* Lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight
        position={[0, 0, 0]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={1000}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
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
    </group>
  );
}
