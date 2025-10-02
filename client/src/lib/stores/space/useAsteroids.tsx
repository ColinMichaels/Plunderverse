import { create } from "zustand";
import * as THREE from "three";
import { useMissions } from "../economy/useMissions";
import { useCredits } from "../economy/useCredits";

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
  asteroidsDestroyed: number;
  pendingSpawns: Array<{ position: THREE.Vector3; timeToSpawn: number }>;
  
  // Actions
  addAsteroid: (position: THREE.Vector3) => void;
  updateAsteroids: (delta: number, playerPosition: THREE.Vector3) => void;
  damageAsteroid: (id: string, damage: number) => boolean; // returns true if destroyed
  removeAsteroid: (id: string) => void;
  clearAsteroids: () => void;
  spawnRandomAsteroid: (playerPosition: THREE.Vector3, staggerDelay?: number) => void;
  processPendingSpawns: (delta: number) => void;
  cleanup: () => void; // Clean up store state and timers
}

export const useAsteroids = create<AsteroidState>((set, get) => ({
  asteroids: [],
  asteroidsDestroyed: 0,
  pendingSpawns: [],
  
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
      size: 1 + Math.random() * 2, // 1-3 units radius (smaller asteroids)
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
          return distance < 800; // Keep asteroids within 800 units (since they spawn up to 600 away)
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
        asteroids: state.asteroids.filter(a => a.id !== id),
        asteroidsDestroyed: state.asteroidsDestroyed + 1
      }));
      
      // Track mission progress
      const missions = useMissions.getState();
      const credits = useCredits.getState();
      
      // Check for survival missions
      const survivalMissions = missions.missions.filter(m => m.type === 'survival' && !m.completed);
      survivalMissions.forEach(mission => {
        // Update progress based on asteroids destroyed
        const newProgress = Math.min(100, (get().asteroidsDestroyed / 10) * 100); // 10 asteroids = 100%
        missions.updateMissionProgress(mission.id, newProgress);
        
        // Complete mission if reached 100%
        if (newProgress >= 100) {
          missions.completeMission(mission.id);
          credits.earnCredits(mission.reward);
        }
      });
      
      // Check for bounty missions targeting asteroids
      const asteroidBounties = missions.bounties.filter(b => b.target === 'asteroids' && !b.completed);
      asteroidBounties.forEach(bounty => {
        const destroyedCount = get().asteroidsDestroyed;
        if (destroyedCount >= 5) { // Most bounties require 5 asteroids
          missions.completeBounty(bounty.id);
          credits.earnCredits(bounty.reward);
          console.log(`Bounty completed: ${bounty.title} (+${bounty.reward} credits)`);
        }
      });
      
      console.log(`Asteroid destroyed! Total destroyed: ${get().asteroidsDestroyed}`);
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
    set({ asteroids: [], pendingSpawns: [] });
  },
  
  spawnRandomAsteroid: (playerPosition, staggerDelay) => {
    // Spawn asteroid at random position around player
    const distance = 250 + Math.random() * 350; // 250-600 units away
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 200; // Random height variation
    
    const spawnPosition = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * distance,
      playerPosition.y + height,
      playerPosition.z + Math.sin(angle) * distance
    );
    
    // If staggerDelay is provided, add to pending spawns instead of immediate spawn
    if (staggerDelay !== undefined && staggerDelay > 0) {
      set(state => ({
        pendingSpawns: [...state.pendingSpawns, { position: spawnPosition, timeToSpawn: staggerDelay }]
      }));
      console.log(`Asteroid spawn queued with ${staggerDelay.toFixed(2)}s delay`);
    } else {
      // Immediate spawn
      get().addAsteroid(spawnPosition);
    }
  },
  
  processPendingSpawns: (delta) => {
    const state = get();
    const readyToSpawn: THREE.Vector3[] = [];
    const stillPending: Array<{ position: THREE.Vector3; timeToSpawn: number }> = [];
    
    // Process pending spawns
    state.pendingSpawns.forEach(spawn => {
      const newTime = spawn.timeToSpawn - delta;
      if (newTime <= 0) {
        readyToSpawn.push(spawn.position);
      } else {
        stillPending.push({ ...spawn, timeToSpawn: newTime });
      }
    });
    
    // Spawn ready asteroids
    readyToSpawn.forEach(position => {
      get().addAsteroid(position);
    });
    
    // Update pending spawns
    if (readyToSpawn.length > 0 || stillPending.length !== state.pendingSpawns.length) {
      set({ pendingSpawns: stillPending });
    }
  },
  
  cleanup: () => {
    console.log("[useAsteroids] Cleanup: Clearing all asteroids and resetting state");
    set({
      asteroids: [],
      asteroidsDestroyed: 0,
      pendingSpawns: []
    });
  }
}));