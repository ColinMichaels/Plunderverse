import { create } from "zustand";
import * as THREE from "three";

export interface Projectile {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  life: number;
  damage: number;
  ownerId: string;
  ownerType: 'player' | 'enemy';
}

interface ShootingState {
  projectiles: Projectile[];

  // Actions
  addProjectile: (
    position: THREE.Vector3, 
    direction: THREE.Vector3,
    speed?: number,
    damage?: number,
    ownerId?: string,
    ownerType?: 'player' | 'enemy'
  ) => void;
  updateProjectiles: (delta: number) => void;
  removeProjectile: (id: string) => void;
  reportEnemyDestroyed: (enemyType?: string, enemyFaction?: string) => void;
}

export const useShooting = create<ShootingState>((set, get) => ({
  projectiles: [],

  addProjectile: (
    position, 
    direction, 
    speed = 50,
    damage = 10,
    ownerId = 'player',
    ownerType = 'player'
  ) => {
    try {
      if (!position || !direction) {
        console.error("Invalid position or direction for projectile");
        return;
      }

      // Apply crew gunner bonuses to player projectiles
      let damageMultiplier = 1.0;
      let accuracyBonus = 0;
      if (ownerType === 'player') {
        try {
          const crewState = (window as any).useCrewManagement?.getState?.();
          if (crewState?.currentBonuses) {
            if (crewState.currentBonuses.combatDamage) {
              damageMultiplier = 1 + crewState.currentBonuses.combatDamage;
              console.log(`[SHOOTING] Applying gunner damage bonus: +${(crewState.currentBonuses.combatDamage * 100).toFixed(0)}% damage`);
            }
            if (crewState.currentBonuses.accuracy) {
              accuracyBonus = crewState.currentBonuses.accuracy;
              // Apply accuracy as a slight adjustment to direction (less spread)
              const accuracyFactor = 1 - accuracyBonus * 0.5; // Less spread with higher accuracy
              direction.x += (Math.random() - 0.5) * 0.1 * accuracyFactor;
              direction.y += (Math.random() - 0.5) * 0.1 * accuracyFactor;
              direction.z += (Math.random() - 0.5) * 0.1 * accuracyFactor;
            }
          }
        } catch (e) {
          // Crew management might not be initialized yet
        }
      }

      const newProjectile: Projectile = {
        id: Math.random().toString(36).substr(2, 9),
        position: position.clone(),
        direction: direction.clone().normalize(),
        speed,
        life: 5.0, // 5 seconds
        damage: damage * damageMultiplier,
        ownerId,
        ownerType,
      };

      set((state) => ({
        projectiles: [...state.projectiles, newProjectile],
      }));
    } catch (error) {
      console.error("Error in addProjectile:", error);
    }
  },

  updateProjectiles: (delta) => {
    set((state) => ({
      projectiles: state.projectiles
        .map((projectile) => ({
          ...projectile,
          position: projectile.position
            .clone()
            .add(
              projectile.direction
                .clone()
                .multiplyScalar(projectile.speed * delta),
            ),
          life: projectile.life - delta,
        }))
        .filter((projectile) => projectile.life > 0),
    }));
  },

  removeProjectile: (id) => {
    set((state) => ({
      projectiles: state.projectiles.filter((p) => p.id !== id),
    }));
  },

  reportEnemyDestroyed: (
    enemyType: string = "pirate",
    enemyFaction?: string,
  ) => {
    // Report combat trigger progress for missions
    try {
      import("../economy/useObjectiveTriggers").then(
        ({ useObjectiveTriggers }) => {
          const triggers = useObjectiveTriggers.getState();
          triggers.reportProgress("combat", {
            enemyType,
            enemyFaction,
            count: 1,
          });
          triggers.reportCombatProgress(enemyType, enemyFaction, 1);
          console.log(
            `[OBJECTIVE-TRIGGER] Reported enemy destroyed: ${enemyType || enemyFaction} for mission objectives`,
          );
        },
      );
    } catch (error) {
      console.error(
        "[OBJECTIVE-TRIGGER] Error reporting enemy destruction:",
        error,
      );
    }
  },
}));
