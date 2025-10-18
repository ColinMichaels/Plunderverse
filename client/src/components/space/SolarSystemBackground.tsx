import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Starfield } from "./Starfield";
import { EnhancedStarfield } from "./EnhancedStarfield";
import { planets } from "../../lib/planetData";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";

// Cinematic camera controller that orbits around Earth
export function CinematicCamera() {
  const angleRef = useRef(0);
  const radiusRef = useRef(30); // Distance from Earth
  const verticalAngleRef = useRef(0);
  
  // Find Earth's data
  const earthData = planets.find(p => p.name === "Earth");
  
  useFrame((state, delta) => {
    if (!earthData) return;
    
    // Get Earth's current position
    const time = state.clock.elapsedTime * 0.01; // Slow time for smooth orbit
    const earthAngle = time * earthData.orbitalSpeed;
    const earthX = Math.cos(earthAngle) * earthData.distance;
    const earthZ = Math.sin(earthAngle) * earthData.distance;
    
    // Update orbit angle
    angleRef.current += delta * 0.15; // Slow rotation around Earth
    verticalAngleRef.current = Math.sin(state.clock.elapsedTime * 0.1) * 0.2; // Subtle vertical movement
    
    // Calculate camera position relative to Earth
    const cameraX = earthX + Math.cos(angleRef.current) * radiusRef.current;
    const cameraY = 10 + Math.sin(verticalAngleRef.current) * 5; // Slight elevation with oscillation
    const cameraZ = earthZ + Math.sin(angleRef.current) * radiusRef.current;
    
    // Smoothly update camera position
    state.camera.position.lerp(
      new THREE.Vector3(cameraX, cameraY, cameraZ),
      0.05 // Smooth interpolation
    );
    
    // Always look at Earth
    state.camera.lookAt(earthX, 0, earthZ);
    
    // Subtle zoom effect
    radiusRef.current = 30 + Math.sin(state.clock.elapsedTime * 0.05) * 5;
  });
  
  return null;
}

// Simplified solar system for background display only
export function SolarSystemBackground() {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime, initializeUniverseTime, updateUniverseTime } = useSolarSystem();

  // Initialize universe time
  useEffect(() => {
    console.log("[SolarSystemBackground] Initializing cinematic view");
    initializeUniverseTime();
    
    return () => {
      console.log("[SolarSystemBackground] Cleaning up cinematic view");
    };
  }, []);

  // Update orbital mechanics
  useFrame((state, delta) => {
    // Slow time progression for cinematic effect
    setTime(time + delta * 0.05);
    updateUniverseTime(delta * 0.5); // Slower universe time for visual effect
  });

  return (
    <>
      <group ref={systemRef}>
        {/* Very minimal ambient lighting */}
        <ambientLight intensity={0.02} />
        
        {/* Enhanced starfield background with many more stars */}
        <EnhancedStarfield 
          count={15000}
          depth={2500}
          minRadius={400}
          enableAnimation={true}
        />
        
        {/* Sun at the center */}
        <Sun />
        
        {/* Planets - render all for cinematic view */}
        {planets.map((planetData) => (
          <Planet key={planetData.name} data={planetData} time={time} />
        ))}
      </group>
      
      {/* Cinematic camera controller */}
      <CinematicCamera />
    </>
  );
}