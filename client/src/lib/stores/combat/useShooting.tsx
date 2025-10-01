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
  reportEnemyDestroyed: (enemyType?: string, enemyFaction?: string) => void;
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
  },
  
  reportEnemyDestroyed: (enemyType: string = 'pirate', enemyFaction?: string) => {
    // Report combat trigger progress for missions
    try {
      import('../economy/useObjectiveTriggers').then(({ useObjectiveTriggers }) => {
        const triggers = useObjectiveTriggers.getState();
        triggers.reportProgress('combat', { 
          enemyType, 
          enemyFaction,
          count: 1 
        });
        triggers.reportCombatProgress(enemyType, enemyFaction, 1);
        console.log(`[OBJECTIVE-TRIGGER] Reported enemy destroyed: ${enemyType || enemyFaction} for mission objectives`);
      });
    } catch (error) {
      console.error('[OBJECTIVE-TRIGGER] Error reporting enemy destruction:', error);
    }
  }
}));