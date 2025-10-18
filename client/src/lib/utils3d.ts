import * as THREE from "three";
import { planets, PlanetData } from "./planetData";

// Utility functions for 3D calculations

export function calculateOrbitalPosition(
  distance: number,
  angle: number,
  inclination = 0
): THREE.Vector3 {
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  const y = Math.sin(inclination) * distance * 0.1; // Small orbital inclination
  
  return new THREE.Vector3(x, y, z);
}

export function getDistanceBetweenPoints(
  point1: THREE.Vector3,
  point2: THREE.Vector3
): number {
  return point1.distanceTo(point2);
}

export function normalizeVector(vector: THREE.Vector3): THREE.Vector3 {
  return vector.clone().normalize();
}

export function createStarPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const distance = radius + Math.random() * radius;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = distance * Math.cos(phi);
  }
  
  return positions;
}

export function interpolatePosition(
  current: THREE.Vector3,
  target: THREE.Vector3,
  alpha: number
): THREE.Vector3 {
  return current.clone().lerp(target, alpha);
}

export function calculateOrbitPosition(distance: number, speed: number, time: number): THREE.Vector3 {
  const angle = speed * time;
  return new THREE.Vector3(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance
  );
}

/**
 * Calculate the 3D position of a planet at a given time
 */
export function calculatePlanetPosition(planet: PlanetData, time: number): THREE.Vector3 {
  return calculateOrbitPosition(planet.distance, planet.orbitalSpeed, time);
}

/**
 * Calculate the apparent position of all planets as seen from a given planet's surface
 * Returns array of objects with planet data and their sky position
 */
export function calculateVisiblePlanets(currentPlanetName: string, time: number): Array<{
  planet: PlanetData;
  skyPosition: THREE.Vector3;
  apparentSize: number;
  distance: number;
}> {
  const currentPlanet = planets.find(p => p.name === currentPlanetName);
  if (!currentPlanet) return [];

  const currentPosition = calculatePlanetPosition(currentPlanet, time);
  const visiblePlanets: Array<{
    planet: PlanetData;
    skyPosition: THREE.Vector3;
    apparentSize: number;
    distance: number;
  }> = [];

  // Add the Sun as a visible object
  const sunDistance = currentPosition.length();
  const sunDirection = currentPosition.clone().negate().normalize();
  const sunSkyPosition = sunDirection.clone().multiplyScalar(400); // Project to sky sphere
  
  // Sun apparent size based on distance (Earth = 1.0 reference)
  const sunApparentSize = Math.max(8, 15 * (30 / sunDistance)); // Scale by distance from Earth's distance
  
  visiblePlanets.push({
    planet: { name: "Sun", size: 15, color: "#FDB813" } as PlanetData,
    skyPosition: sunSkyPosition,
    apparentSize: sunApparentSize,
    distance: sunDistance
  });

  planets.forEach(planet => {
    if (planet.name === currentPlanetName) return; // Skip current planet

    const planetPosition = calculatePlanetPosition(planet, time);
    const relativePosition = planetPosition.clone().sub(currentPosition);
    const distance = relativePosition.length();
    
    // Only show planets that are far enough away to be visible as points
    if (distance > 5) {
      const direction = relativePosition.normalize();
      const skyPosition = direction.clone().multiplyScalar(400); // Project to sky sphere
      
      // Calculate apparent size based on actual planet size and distance
      // Use logarithmic scaling to make all planets visible but proportional
      const apparentSize = Math.max(0.8, Math.log(planet.size + 1) * (50 / Math.sqrt(distance)));
      
      visiblePlanets.push({
        planet,
        skyPosition,
        apparentSize,
        distance
      });
    }
  });

  return visiblePlanets;
}

/**
 * Generate atmospheric gradient colors based on planet type and height
 */
export function getAtmosphericGradient(planetName: string): {
  horizonColor: string;
  zenithColor: string;
  atmosphereIntensity: number;
} {
  switch (planetName) {
    case "Earth":
      return {
        horizonColor: "#87CEEB", // Sky blue
        zenithColor: "#191970", // Midnight blue
        atmosphereIntensity: 0.8
      };
    case "Mars":
      return {
        horizonColor: "#CD5C5C", // Mars red
        zenithColor: "#2F1B14", // Dark reddish
        atmosphereIntensity: 0.6
      };
    case "Venus":
      return {
        horizonColor: "#FFA500", // Orange
        zenithColor: "#8B4513", // Saddle brown
        atmosphereIntensity: 0.9
      };
    case "Mercury":
      return {
        horizonColor: "#2F2F2F", // Dark gray
        zenithColor: "#000000", // Black
        atmosphereIntensity: 0.1
      };
    case "Jupiter":
      return {
        horizonColor: "#D8CA9D", // Tan
        zenithColor: "#8B7355", // Dark khaki
        atmosphereIntensity: 0.7
      };
    case "Saturn":
      return {
        horizonColor: "#FAD5A5", // Peach
        zenithColor: "#CD853F", // Peru
        atmosphereIntensity: 0.7
      };
    case "Uranus":
      return {
        horizonColor: "#4FD0E7", // Cyan
        zenithColor: "#2F4F4F", // Dark slate gray
        atmosphereIntensity: 0.5
      };
    case "Neptune":
      return {
        horizonColor: "#4B70DD", // Royal blue
        zenithColor: "#191970", // Midnight blue
        atmosphereIntensity: 0.6
      };
    default:
      return {
        horizonColor: "#1a1a2e", // Dark blue-gray
        zenithColor: "#000000", // Black
        atmosphereIntensity: 0.3
      };
  }
}
