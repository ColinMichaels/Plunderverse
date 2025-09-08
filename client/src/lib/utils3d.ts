import * as THREE from "three";

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
