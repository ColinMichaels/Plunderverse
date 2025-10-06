import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Moon } from "./Moon";
import { Starfield } from "./Starfield";
import { AsteroidField } from "./AsteroidField";
import { planets } from "../../lib/planetData";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";

// Cinematic camera controller that orbits around Earth
function CinematicCamera() {
  const angleRef = useRef(0);
  const radiusRef = useRef(35); // Slightly further for better view
  const verticalAngleRef = useRef(0);
  
  // Find Earth's data
  const earthData = planets.find(p => p.name === "Earth");
  
  useFrame((state, delta) => {
    if (!earthData) return;
    
    // Get Earth's current position
    const time = state.clock.elapsedTime * 0.008; // Very slow for cinematic effect
    const earthAngle = time * earthData.orbitalSpeed;
    const earthX = Math.cos(earthAngle) * earthData.distance;
    const earthZ = Math.sin(earthAngle) * earthData.distance;
    
    // Update orbit angle
    angleRef.current += delta * 0.12; // Slow rotation around Earth
    verticalAngleRef.current = Math.sin(state.clock.elapsedTime * 0.08) * 0.25; // Subtle vertical movement
    
    // Calculate camera position relative to Earth
    const cameraX = earthX + Math.cos(angleRef.current) * radiusRef.current;
    const cameraY = 12 + Math.sin(verticalAngleRef.current) * 7; // Higher elevation with more oscillation
    const cameraZ = earthZ + Math.sin(angleRef.current) * radiusRef.current;
    
    // Smoothly update camera position
    state.camera.position.lerp(
      new THREE.Vector3(cameraX, cameraY, cameraZ),
      0.04 // Smoother interpolation
    );
    
    // Look slightly ahead of Earth for more dynamic view
    const lookAheadX = earthX + Math.cos(earthAngle + 0.1) * 2;
    const lookAheadZ = earthZ + Math.sin(earthAngle + 0.1) * 2;
    state.camera.lookAt(lookAheadX, 0, lookAheadZ);
    
    // Subtle zoom effect
    radiusRef.current = 35 + Math.sin(state.clock.elapsedTime * 0.04) * 6;
  });
  
  return null;
}

// Full solar system optimized for splash screen with preloading
export function SplashSolarSystem({ useFullComponents = false }: { useFullComponents?: boolean }) {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime, initializeUniverseTime, updateUniverseTime } = useSolarSystem();

  // Initialize universe time
  useEffect(() => {
    console.log(`[SplashSolarSystem] Initializing ${useFullComponents ? 'full' : 'simplified'} cinematic view`);
    initializeUniverseTime();
    
    // If using full components, log that we're preloading
    if (useFullComponents) {
      console.log("[SplashSolarSystem] Preloading full solar system for game experience");
    }
    
    return () => {
      console.log("[SplashSolarSystem] Cleaning up cinematic view");
    };
  }, [useFullComponents]);

  // Update orbital mechanics
  useFrame((state, delta) => {
    // Very slow time progression for cinematic effect
    setTime(time + delta * 0.04);
    updateUniverseTime(delta * 0.4); // Slower universe time for visual effect
  });

  return (
    <>
      <group ref={systemRef}>
        {/* Very minimal ambient lighting */}
        <ambientLight intensity={0.025} />
        
        {/* Standard starfield for cleaner, simpler star generation */}
        <Starfield />
        
        {/* Sun at the center - main light source */}
        <Sun />
        
        {/* All planets for cinematic view */}
        {planets.map((planetData) => (
          <Planet key={planetData.name} data={planetData} time={time} />
        ))}
        
        {/* Earth's Moon */}
        <Moon />
        
        {/* Optionally include asteroids for preloading */}
        {useFullComponents && (
          <AsteroidField />
        )}
      </group>
      
      {/* Cinematic camera controller */}
      <CinematicCamera />
    </>
  );
}