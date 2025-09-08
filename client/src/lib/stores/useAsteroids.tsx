import { create } from "zustand";
import * as THREE from "three";

export interface Asteroid {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Vector3;
  size: number;
  health: number;
  maxHealth: number;
}

interface AsteroidState {
  asteroids: Asteroid[];
  
  // Actions
  addAsteroid: (position: THREE.Vector3) => void;
  updateAsteroids: (delta: number, playerPosition: THREE.Vector3) => void;
  damageAsteroid: (id: string, damage: number) => boolean; // returns true if destroyed
  removeAsteroid: (id: string) => void;
  clearAsteroids: () => void;
  spawnRandomAsteroid: (playerPosition: THREE.Vector3) => void;
}

export const useAsteroids = create<AsteroidState>((set, get) => ({
  asteroids: [],
  
  addAsteroid: (position) => {
    const newAsteroid: Asteroid = {
      id: Math.random().toString(36).substr(2, 9),
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      rotation: new THREE.Vector3(
        Math.random() * 0.02,
        Math.random() * 0.02,
        Math.random() * 0.02
      ),
      size: 2 + Math.random() * 4, // 2-6 units radius
      health: 3,
      maxHealth: 3
    };
    
    set(state => ({
      asteroids: [...state.asteroids, newAsteroid]
    }));
    
    console.log("Asteroid spawned!");
  },
  
  updateAsteroids: (delta, playerPosition) => {
    set(state => ({
      asteroids: state.asteroids
        .map(asteroid => ({
          ...asteroid,
          position: asteroid.position.clone().add(
            asteroid.velocity.clone().multiplyScalar(delta)
          )
        }))
        .filter(asteroid => {
          // Remove asteroids that are too far from player (cleanup)
          const distance = asteroid.position.distanceTo(playerPosition);
          return distance < 500; // Keep asteroids within 500 units
        })
    }));
  },
  
  damageAsteroid: (id, damage) => {
    const state = get();
    const asteroid = state.asteroids.find(a => a.id === id);
    
    if (!asteroid) return false;
    
    const newHealth = asteroid.health - damage;
    
    if (newHealth <= 0) {
      // Destroy asteroid
      set(state => ({
        asteroids: state.asteroids.filter(a => a.id !== id)
      }));
      console.log("Asteroid destroyed!");
      return true;
    } else {
      // Damage asteroid
      set(state => ({
        asteroids: state.asteroids.map(a => 
          a.id === id ? { ...a, health: newHealth } : a
        )
      }));
      console.log(`Asteroid damaged! Health: ${newHealth}/${asteroid.maxHealth}`);
      return false;
    }
  },
  
  removeAsteroid: (id) => {
    set(state => ({
      asteroids: state.asteroids.filter(a => a.id !== id)
    }));
  },
  
  clearAsteroids: () => {
    set({ asteroids: [] });
  },
  
  spawnRandomAsteroid: (playerPosition) => {
    // Spawn asteroid at random position around player
    const distance = 100 + Math.random() * 200; // 100-300 units away
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 100; // Random height variation
    
    const spawnPosition = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * distance,
      playerPosition.y + height,
      playerPosition.z + Math.sin(angle) * distance
    );
    
    get().addAsteroid(spawnPosition);
  }
}));