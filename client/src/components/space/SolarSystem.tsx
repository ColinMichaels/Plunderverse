import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Moon } from "./Moon";
import { Starfield } from "./Starfield";
import { AsteroidField } from "./AsteroidField";
import { preloadAsteroidModels } from "./FBXAsteroid";
import { CameraController } from "../navigation/CameraController";
import { ShootingSystem } from "../combat/ShootingSystem";
import { planets } from "../../lib/planetData";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useAsteroids } from "../../lib/stores/space/useAsteroids";
import { useDebugTools } from "../../lib/stores/debug/useDebugTools";
import { resourceManager } from "../../lib/utils/ResourceManager";

export function SolarSystem() {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime, initializeUniverseTime, updateUniverseTime, getUniverseTime } = useSolarSystem();
  const timeScale = useDebugTools((state) => state.timeScale);

  // Initialize universe time and cleanup resources on unmount
  useEffect(() => {
    console.log("[SolarSystem] Component mounted, initializing universe time");
    
    // Initialize universe time if not already initialized
    initializeUniverseTime();
    
    // Pre-load all asteroid models to prevent stuttering on first spawn
    preloadAsteroidModels();
    
    return () => {
      console.log("[SolarSystem] Component unmounting, cleaning up space-scene resources and stores");
      
      // Clean up space-related stores (but preserve universe time)
      useSolarSystem.getState().cleanup();
      useAsteroids.getState().cleanup();
      
      console.log("[SolarSystem] Store cleanup complete");
    };
  }, []);

  // Update orbital mechanics and universe time
  useFrame((state, delta) => {
    // Update local time for animations
    setTime(time + delta * 0.1 * timeScale);
    
    // Update persistent universe time
    updateUniverseTime(delta);
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
