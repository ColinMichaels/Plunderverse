import {useFrame} from "@react-three/fiber";
import {useEffect, useRef} from "react";
import * as THREE from "three";
import {Bloom, EffectComposer} from "@react-three/postprocessing";
import {Sun} from "./Sun";
import {Planet} from "./Planet";
import {Moon} from "./Moon";
import {Starfield} from "./Starfield";
import {CameraController} from "../navigation/CameraController";
import {ShootingSystem} from "../combat/ShootingSystem";
import {EnemyField} from "../combat/EnemyField";
import {planets} from "@/lib/planetData.ts";
import {useDebugTools, useSolarSystem} from "@/lib/stores";
import {HolographicParrot} from "../parrot/HolographicParrot";

export function SolarSystem() {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime, initializeUniverseTime, updateUniverseTime, getUniverseTime } = useSolarSystem();
  const timeScale = useDebugTools((state) => state.timeScale);

  // Initialize universe time and cleanup resources on unmount
  useEffect(() => {
    console.log("[SolarSystem] 🌌 Component MOUNTED at", new Date().toISOString());
    console.log("[SolarSystem] Mounting details:", {
      systemRef: systemRef.current,
      time,
      universeTime: getUniverseTime(),
      timestamp: Date.now()
    });
    console.log("[Bloom] Sun glow effect loaded for space scene");
    
    // Initialize universe time if not already initialized
    initializeUniverseTime();
    
    // Check if we're properly mounted after a small delay
    setTimeout(() => {
      console.log("[SolarSystem] 🌌 Component still mounted after 100ms, systemRef:", {
        hasRef: !!systemRef.current,
        refValue: systemRef.current
      });
    }, 100);
    
    return () => {
      console.log("[SolarSystem] 🌌 Component UNMOUNTING at", new Date().toISOString());
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
        {/* Ultra-minimal ambient light - only for barely visible outline on dark side */}
        <ambientLight intensity={0.005} />

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

        {/* Holographic Parrot AI Companion */}
        <HolographicParrot position={[5, 3, 10]} />

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
