import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Moon } from "./Moon";
import { Starfield } from "./Starfield";
import { CameraController } from "../navigation/CameraController";
import { ShootingSystem } from "../combat/ShootingSystem";
import { EnemyField } from "../combat/EnemyField";
import { planets } from "../../lib/planetData";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useDebugTools } from "../../lib/stores/debug/useDebugTools";
import { resourceManager } from "../../lib/utils/ResourceManager";

export function SolarSystem() {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime, initializeUniverseTime, updateUniverseTime, getUniverseTime } = useSolarSystem();
  const timeScale = useDebugTools((state) => state.timeScale);

  // Initialize universe time and cleanup resources on unmount
  useEffect(() => {
    console.log("[SolarSystem] Component mounted, initializing universe time");
    console.log("[Bloom] Sun glow effect loaded for space scene");
    
    // Initialize universe time if not already initialized
    initializeUniverseTime();
    
    return () => {
      console.log("[SolarSystem] Component unmounting, cleaning up space-scene resources and stores");
      
      // Clean up space-related stores (but preserve universe time)
      useSolarSystem.getState().cleanup();
      
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
    <>
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
        
        
        {/* Enemy ships */}
        <EnemyField />

        {/* Camera controller */}
        <CameraController />

        {/* Shooting system */}
        <ShootingSystem />
      </group>

      {/* Post-processing effects for sun glow */}
      <EffectComposer>
        <Bloom
          intensity={2.5}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          radius={0.95}
          levels={8}
          mipmapBlur={true}
        />
      </EffectComposer>
    </>
  );
}
