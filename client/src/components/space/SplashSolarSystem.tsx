import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { Sun } from "./Sun";
import { Planet } from "./Planet";
import { Moon } from "./Moon";
import { Starfield } from "./Starfield";
import { AsteroidField } from "./AsteroidField";
import { planets } from "../../lib/planetData";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";

// Camera shot types
enum CameraShotType {
  PLANET_FLYBY = 'PLANET_FLYBY',
  ORBITAL_CRUISE = 'ORBITAL_CRUISE',
  DRAMATIC_APPROACH = 'DRAMATIC_APPROACH',
  SYSTEM_OVERVIEW = 'SYSTEM_OVERVIEW',
  SUN_SKIM = 'SUN_SKIM',
  ASTEROID_WEAVE = 'ASTEROID_WEAVE',
  PLANET_TO_PLANET = 'PLANET_TO_PLANET',
  CINEMATIC_PULLBACK = 'CINEMATIC_PULLBACK'
}

interface CameraSequence {
  type: CameraShotType;
  targetPlanet?: string;
  duration: number;
  easing?: (t: number) => number;
}

// Easing functions for smooth camera movements
const easings = {
  linear: (t: number) => t,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
};

// Simple camera controller that orbits around Earth
function SimpleOrbitCamera() {
  const angleRef = useRef(0);
  const radiusRef = useRef(35);
  const verticalAngleRef = useRef(0);
  
  const earthData = planets.find(p => p.name === "Earth");
  
  useFrame((state, delta) => {
    if (!earthData) return;
    
    const time = state.clock.elapsedTime * 0.008;
    const earthAngle = time * earthData.orbitalSpeed;
    const earthX = Math.cos(earthAngle) * earthData.distance;
    const earthZ = Math.sin(earthAngle) * earthData.distance;
    
    angleRef.current += delta * 0.12;
    verticalAngleRef.current = Math.sin(state.clock.elapsedTime * 0.08) * 0.25;
    
    const cameraX = earthX + Math.cos(angleRef.current) * radiusRef.current;
    const cameraY = 12 + Math.sin(verticalAngleRef.current) * 7;
    const cameraZ = earthZ + Math.sin(angleRef.current) * radiusRef.current;
    
    state.camera.position.lerp(
      new THREE.Vector3(cameraX, cameraY, cameraZ),
      0.04
    );
    
    const lookAheadX = earthX + Math.cos(earthAngle + 0.1) * 2;
    const lookAheadZ = earthZ + Math.sin(earthAngle + 0.1) * 2;
    state.camera.lookAt(lookAheadX, 0, lookAheadZ);
    
    radiusRef.current = 35 + Math.sin(state.clock.elapsedTime * 0.04) * 6;
  });
  
  return null;
}

// Advanced cinematic camera with multiple shot types
function AdvancedCinematicCamera() {
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const sequenceProgressRef = useRef(0);
  const sequenceStartTimeRef = useRef<number | null>(null);
  const cameraPathRef = useRef<THREE.Vector3[]>([]);
  const lookAtPathRef = useRef<THREE.Vector3[]>([]);
  const transitionProgressRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const lastCameraPositionRef = useRef(new THREE.Vector3());
  const lastLookAtRef = useRef(new THREE.Vector3());
  
  // Define cinematic sequences
  const cinematicSequences: CameraSequence[] = useMemo(() => [
    // Epic Mars flyby
    { type: CameraShotType.PLANET_FLYBY, targetPlanet: 'Mars', duration: 15, easing: easings.easeInOutCubic },
    // Cruise around Jupiter
    { type: CameraShotType.ORBITAL_CRUISE, targetPlanet: 'Jupiter', duration: 18, easing: easings.easeInOutSine },
    // Dramatic approach to Saturn with rings
    { type: CameraShotType.DRAMATIC_APPROACH, targetPlanet: 'Saturn', duration: 12, easing: easings.easeOutExpo },
    // Overview of inner solar system
    { type: CameraShotType.SYSTEM_OVERVIEW, duration: 10, easing: easings.easeInOutQuad },
    // Close sun skim
    { type: CameraShotType.SUN_SKIM, duration: 8, easing: easings.easeInOutCubic },
    // Venus to Earth transition
    { type: CameraShotType.PLANET_TO_PLANET, targetPlanet: 'Venus', duration: 14, easing: easings.easeInOutSine },
    // Neptune distant view
    { type: CameraShotType.PLANET_FLYBY, targetPlanet: 'Neptune', duration: 16, easing: easings.easeInOutCubic },
    // Mercury fast pass
    { type: CameraShotType.PLANET_FLYBY, targetPlanet: 'Mercury', duration: 10, easing: easings.easeInOutQuad },
    // Earth orbital cruise
    { type: CameraShotType.ORBITAL_CRUISE, targetPlanet: 'Earth', duration: 15, easing: easings.easeInOutSine },
    // Cinematic pullback showing entire system
    { type: CameraShotType.CINEMATIC_PULLBACK, duration: 20, easing: easings.easeInOutCubic },
  ], []);
  
  const currentSequence = cinematicSequences[currentSequenceIndex];
  
  // Helper function to generate smooth curve points using Catmull-Rom splines
  const generateSplinePath = (points: THREE.Vector3[], segments = 50): THREE.Vector3[] => {
    if (points.length < 2) return points;
    
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const pathPoints: THREE.Vector3[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pathPoints.push(curve.getPoint(t));
    }
    
    return pathPoints;
  };
  
  // Generate camera path for current sequence
  const generateCameraPath = (sequence: CameraSequence, elapsedTime: number) => {
    const points: THREE.Vector3[] = [];
    const lookAtPoints: THREE.Vector3[] = [];
    
    switch (sequence.type) {
      case CameraShotType.PLANET_FLYBY: {
        const planet = planets.find(p => p.name === sequence.targetPlanet);
        if (planet) {
          const angle = elapsedTime * 0.01 * planet.orbitalSpeed;
          const planetX = Math.cos(angle) * planet.distance;
          const planetZ = Math.sin(angle) * planet.distance;
          
          // Create a dramatic flyby path
          const approachDistance = planet.size * 8;
          const flybyRadius = planet.size * 4;
          
          // Approach from below and behind
          points.push(new THREE.Vector3(
            planetX - approachDistance,
            -planet.size * 3,
            planetZ - approachDistance
          ));
          
          // Sweep up and around
          for (let i = 0; i <= 6; i++) {
            const t = i / 6;
            const flybyAngle = -Math.PI/2 + Math.PI * t;
            points.push(new THREE.Vector3(
              planetX + Math.cos(flybyAngle) * flybyRadius,
              -planet.size * 2 + planet.size * 4 * Math.sin(t * Math.PI),
              planetZ + Math.sin(flybyAngle) * flybyRadius
            ));
          }
          
          // Exit dramatically upward
          points.push(new THREE.Vector3(
            planetX + approachDistance,
            planet.size * 4,
            planetZ + approachDistance
          ));
          
          // Always look at the planet
          for (let i = 0; i < points.length; i++) {
            lookAtPoints.push(new THREE.Vector3(planetX, 0, planetZ));
          }
        }
        break;
      }
      
      case CameraShotType.ORBITAL_CRUISE: {
        const planet = planets.find(p => p.name === sequence.targetPlanet);
        if (planet) {
          const planetAngle = elapsedTime * 0.01 * planet.orbitalSpeed;
          const planetX = Math.cos(planetAngle) * planet.distance;
          const planetZ = Math.sin(planetAngle) * planet.distance;
          
          // Smooth orbital cruise
          const cruiseRadius = planet.size * 6;
          const cruiseHeight = planet.size * 2;
          
          for (let i = 0; i <= 12; i++) {
            const t = i / 12;
            const orbitAngle = t * Math.PI * 2;
            const heightVariation = Math.sin(orbitAngle * 2) * planet.size;
            
            points.push(new THREE.Vector3(
              planetX + Math.cos(orbitAngle) * cruiseRadius,
              cruiseHeight + heightVariation,
              planetZ + Math.sin(orbitAngle) * cruiseRadius
            ));
            
            // Look slightly ahead of the planet
            const lookAheadOffset = 0.15;
            lookAtPoints.push(new THREE.Vector3(
              planetX + Math.cos(orbitAngle + lookAheadOffset) * planet.size,
              0,
              planetZ + Math.sin(orbitAngle + lookAheadOffset) * planet.size
            ));
          }
        }
        break;
      }
      
      case CameraShotType.DRAMATIC_APPROACH: {
        const planet = planets.find(p => p.name === sequence.targetPlanet);
        if (planet) {
          const angle = elapsedTime * 0.01 * planet.orbitalSpeed;
          const planetX = Math.cos(angle) * planet.distance;
          const planetZ = Math.sin(angle) * planet.distance;
          
          // Start far away and zoom in dramatically
          const startDistance = planet.size * 20;
          const endDistance = planet.size * 3;
          
          for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            const eased = easings.easeOutExpo(t);
            const distance = startDistance - (startDistance - endDistance) * eased;
            const spiralAngle = t * Math.PI * 0.5;
            
            points.push(new THREE.Vector3(
              planetX + Math.cos(spiralAngle) * distance,
              planet.size * (1 - eased) * 2,
              planetZ + Math.sin(spiralAngle) * distance
            ));
            
            lookAtPoints.push(new THREE.Vector3(planetX, 0, planetZ));
          }
        }
        break;
      }
      
      case CameraShotType.SYSTEM_OVERVIEW: {
        // Sweeping view of the solar system
        const radius = 100;
        const height = 50;
        
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const angle = t * Math.PI * 1.5;
          const currentHeight = height + Math.sin(t * Math.PI) * 30;
          
          points.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            currentHeight,
            Math.sin(angle) * radius
          ));
          
          // Look towards the center with slight offset
          const lookOffset = Math.sin(t * Math.PI * 2) * 20;
          lookAtPoints.push(new THREE.Vector3(lookOffset, 0, lookOffset));
        }
        break;
      }
      
      case CameraShotType.SUN_SKIM: {
        // Dramatic close pass by the sun
        const skimRadius = 12;
        
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const angle = -Math.PI/3 + (Math.PI * 2/3) * t;
          const distance = skimRadius + Math.sin(t * Math.PI) * 5;
          
          points.push(new THREE.Vector3(
            Math.cos(angle) * distance,
            Math.sin(t * Math.PI) * 8,
            Math.sin(angle) * distance
          ));
          
          // Look at sun center
          lookAtPoints.push(new THREE.Vector3(0, 0, 0));
        }
        break;
      }
      
      case CameraShotType.PLANET_TO_PLANET: {
        // Smooth transition from one planet to another
        const fromPlanet = planets.find(p => p.name === sequence.targetPlanet);
        const toPlanet = planets.find(p => p.name === 'Earth'); // Target Earth from Venus
        
        if (fromPlanet && toPlanet) {
          const angle1 = elapsedTime * 0.01 * fromPlanet.orbitalSpeed;
          const angle2 = elapsedTime * 0.01 * toPlanet.orbitalSpeed;
          
          const from = new THREE.Vector3(
            Math.cos(angle1) * fromPlanet.distance,
            0,
            Math.sin(angle1) * fromPlanet.distance
          );
          
          const to = new THREE.Vector3(
            Math.cos(angle2) * toPlanet.distance,
            0,
            Math.sin(angle2) * toPlanet.distance
          );
          
          // Create curved path between planets
          const midpoint = from.clone().add(to).multiplyScalar(0.5);
          midpoint.y = 20; // Arc upward
          
          // Start position
          const startOffset = from.clone().add(new THREE.Vector3(0, fromPlanet.size * 3, fromPlanet.size * 3));
          points.push(startOffset);
          
          // Control points for smooth curve
          const control1 = from.clone().lerp(midpoint, 0.3);
          control1.y = 15;
          points.push(control1);
          
          points.push(midpoint);
          
          const control2 = midpoint.clone().lerp(to, 0.7);
          control2.y = 15;
          points.push(control2);
          
          // End position
          const endOffset = to.clone().add(new THREE.Vector3(0, toPlanet.size * 3, -toPlanet.size * 3));
          points.push(endOffset);
          
          // Look at points transition smoothly
          for (let i = 0; i < points.length; i++) {
            const t = i / (points.length - 1);
            lookAtPoints.push(from.clone().lerp(to, t));
          }
        }
        break;
      }
      
      case CameraShotType.CINEMATIC_PULLBACK: {
        // Epic pullback revealing entire solar system
        const startRadius = 20;
        const endRadius = 150;
        
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const eased = easings.easeInOutCubic(t);
          const radius = startRadius + (endRadius - startRadius) * eased;
          const angle = Math.PI/4 + t * Math.PI/2;
          const height = 10 + eased * 60;
          
          points.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
          ));
          
          // Always look at center
          lookAtPoints.push(new THREE.Vector3(0, 0, 0));
        }
        break;
      }
    }
    
    // Generate smooth spline paths
    if (points.length > 1) {
      return {
        cameraPath: generateSplinePath(points, 100),
        lookAtPath: generateSplinePath(lookAtPoints, 100)
      };
    }
    
    return { cameraPath: points, lookAtPath: lookAtPoints };
  };
  
  useFrame((state, delta) => {
    // Initialize sequence start time
    if (sequenceStartTimeRef.current === null) {
      sequenceStartTimeRef.current = state.clock.elapsedTime;
      const { cameraPath, lookAtPath } = generateCameraPath(currentSequence, state.clock.elapsedTime);
      cameraPathRef.current = cameraPath;
      lookAtPathRef.current = lookAtPath;
      console.log(`[CinematicCamera] Starting sequence: ${currentSequence.type} targeting ${currentSequence.targetPlanet || 'System'}`);
    }
    
    const sequenceElapsed = state.clock.elapsedTime - sequenceStartTimeRef.current;
    const sequenceProgress = Math.min(sequenceElapsed / currentSequence.duration, 1);
    
    // Apply easing to progress
    const easedProgress = currentSequence.easing ? currentSequence.easing(sequenceProgress) : sequenceProgress;
    sequenceProgressRef.current = easedProgress;
    
    // Handle sequence transitions
    if (sequenceProgress >= 1 && !isTransitioningRef.current) {
      isTransitioningRef.current = true;
      
      // Store last position for smooth transition
      lastCameraPositionRef.current = state.camera.position.clone();
      lastLookAtRef.current = new THREE.Vector3();
      state.camera.getWorldDirection(lastLookAtRef.current);
      lastLookAtRef.current.add(state.camera.position);
      
      // Move to next sequence
      setTimeout(() => {
        const nextIndex = (currentSequenceIndex + 1) % cinematicSequences.length;
        setCurrentSequenceIndex(nextIndex);
        sequenceStartTimeRef.current = null;
        transitionProgressRef.current = 0;
        isTransitioningRef.current = false;
      }, 100);
    }
    
    // Update camera position along path
    if (cameraPathRef.current.length > 1 && lookAtPathRef.current.length > 1) {
      const pathIndex = Math.min(
        Math.floor(easedProgress * (cameraPathRef.current.length - 1)),
        cameraPathRef.current.length - 1
      );
      
      const targetPosition = cameraPathRef.current[pathIndex];
      const targetLookAt = lookAtPathRef.current[pathIndex];
      
      if (targetPosition && targetLookAt) {
        // Smooth camera position
        state.camera.position.lerp(targetPosition, 0.05);
        
        // Smooth look at
        const currentLookAt = new THREE.Vector3();
        state.camera.getWorldDirection(currentLookAt);
        currentLookAt.add(state.camera.position);
        currentLookAt.lerp(targetLookAt, 0.05);
        state.camera.lookAt(currentLookAt);
      }
    }
  });
  
  return null;
}

// Main cinematic camera controller with mode switching
function CinematicCamera({ mode = 'cinematic' }: { mode?: 'simple' | 'cinematic' }) {
  if (mode === 'simple') {
    return <SimpleOrbitCamera />;
  }
  return <AdvancedCinematicCamera />;
}

// Full solar system optimized for splash screen with preloading
export function SplashSolarSystem({ 
  useFullComponents = false, 
  cameraMode = 'cinematic' 
}: { 
  useFullComponents?: boolean;
  cameraMode?: 'simple' | 'cinematic';
}) {
  const systemRef = useRef<THREE.Group>(null);
  const { time, setTime, initializeUniverseTime, updateUniverseTime } = useSolarSystem();

  // Initialize universe time
  useEffect(() => {
    console.log(`[SplashSolarSystem] Initializing ${useFullComponents ? 'full' : 'simplified'} view with ${cameraMode} camera`);
    initializeUniverseTime();
    
    // If using full components, log that we're preloading
    if (useFullComponents) {
      console.log("[SplashSolarSystem] Preloading full solar system for game experience");
    }
    
    return () => {
      console.log("[SplashSolarSystem] Cleaning up cinematic view");
    };
  }, [useFullComponents, cameraMode]);

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
      
      {/* Cinematic camera controller with mode selection */}
      <CinematicCamera mode={cameraMode} />
    </>
  );
}