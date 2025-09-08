import { create } from "zustand";
import * as THREE from "three";

export interface Projectile {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  life: number;
}

interface ShootingState {
  projectiles: Projectile[];
  
  // Actions
  addProjectile: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  updateProjectiles: (delta: number) => void;
  removeProjectile: (id: string) => void;
}

export const useShooting = create<ShootingState>((set, get) => ({
  projectiles: [],
  
  addProjectile: (position, direction) => {
    try {
      if (!position || !direction) {
        console.error("Invalid position or direction for projectile");
        return;
      }
      
      const newProjectile: Projectile = {
        id: Math.random().toString(36).substr(2, 9),
        position: position.clone(),
        direction: direction.clone().normalize(),
        speed: 100,
        life: 5.0 // 5 seconds
      };
      
      set(state => ({
        projectiles: [...state.projectiles, newProjectile]
      }));
      
      console.log("Laser projectile created!");
    } catch (error) {
      console.error("Error in addProjectile:", error);
    }
  },
  
  updateProjectiles: (delta) => {
    set(state => ({
      projectiles: state.projectiles
        .map(projectile => ({
          ...projectile,
          position: projectile.position.clone().add(
            projectile.direction.clone().multiplyScalar(projectile.speed * delta)
          ),
          life: projectile.life - delta
        }))
        .filter(projectile => projectile.life > 0)
    }));
  },
  
  removeProjectile: (id) => {
    set(state => ({
      projectiles: state.projectiles.filter(p => p.id !== id)
    }));
  }
}));