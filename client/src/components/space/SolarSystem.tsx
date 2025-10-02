import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Moon } from "./Moon";
import { Starfield } from "./Starfield";
import { AsteroidField } from "./AsteroidField";
import { CameraController } from "../navigation/CameraController";
import { ShootingSystem } from "../combat/ShootingSystem";
import { planets } from "../../lib/planetData";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useDebugTools } from "../../lib/stores/debug/useDebugTools";
import { resourceManager } from "../../lib/utils/ResourceManager";

export function SolarSystem() {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime } = useSolarSystem();
  const timeScale = useDebugTools((state) => state.timeScale);

  // Cleanup resources on unmount
  useEffect(() => {
    console.log("[SolarSystem] Component mounted, space scene resources will be tagged");
    
    return () => {
      console.log("[SolarSystem] Component unmounting, cleaning up space-scene resources");
      // Note: Individual components handle their own resource registration and cleanup
      // This is just for logging the lifecycle
    };
  }, []);

  // Update orbital mechanics
  useFrame((state, delta) => {
    setTime(time + delta * 0.1 * timeScale);
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
        <Planet key={planetData.name} data={planetData} time={time} />
      ))}

      {/* Earth's Moon */}
      <Moon />

      {/* Camera controller */}
      <CameraController />

      {/* Shooting system */}
      <ShootingSystem />

      {/* Asteroid field */}
      <AsteroidField />
    </group>
  );
}
