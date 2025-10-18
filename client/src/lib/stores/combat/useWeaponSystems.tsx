import { create } from 'zustand';
import * as THREE from 'three';
import { useEnemies, Enemy } from './useEnemies';
import { toast } from 'sonner';

export type WeaponType = 'laser' | 'torpedo' | 'missile';

export interface LockedTarget {
  enemyId: string;
  lockProgress: number; // 0 to 1
  lockDuration: number; // Time required to lock
  position: THREE.Vector3;
}

export interface HomingProjectile {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  life: number;
  damage: number;
  ownerId: string;
  ownerType: 'player' | 'enemy';
  isHoming: boolean;
  targetId?: string;
  homingStrength?: number; // How aggressively it tracks (0-1)
}

interface WeaponSystemState {
  // Current weapon selection
  selectedWeapon: WeaponType;
  
  // Lock-on system
  currentTarget: LockedTarget | null;
  isLocking: boolean;
  
  // Weapon cooldowns (in seconds)
  laserCooldown: number;
  torpedoCooldown: number;
  missileCooldown: number;
  
  // Weapon stats
  weaponStats: {
    laser: { damage: number; speed: number; cooldown: number };
    torpedo: { damage: number; speed: number; cooldown: number; lockTime: number };
    missile: { damage: number; speed: number; cooldown: number; lockTime: number };
  };
  
  // Homing projectiles
  homingProjectiles: HomingProjectile[];
  
  // Actions
  setSelectedWeapon: (weapon: WeaponType) => void;
  startLocking: (cameraPosition: THREE.Vector3, cameraDirection: THREE.Vector3) => void;
  updateLocking: (delta: number, cameraPosition: THREE.Vector3, cameraDirection: THREE.Vector3) => void;
  cancelLocking: () => void;
  fireTorpedo: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  fireMissile: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  updateCooldowns: (delta: number) => void;
  updateHomingProjectiles: (delta: number) => void;
  removeHomingProjectile: (id: string) => void;
  canFireWeapon: (weapon: WeaponType) => boolean;
}

export const useWeaponSystems = create<WeaponSystemState>((set, get) => ({
  selectedWeapon: 'laser',
  currentTarget: null,
  isLocking: false,
  laserCooldown: 0,
  torpedoCooldown: 0,
  missileCooldown: 0,
  
  weaponStats: {
    laser: { damage: 10, speed: 60, cooldown: 0.2 },
    torpedo: { damage: 40, speed: 40, cooldown: 10, lockTime: 3 },
    missile: { damage: 100, speed: 30, cooldown: 20, lockTime: 5 }
  },
  
  homingProjectiles: [],
  
  setSelectedWeapon: (weapon) => {
    set({ selectedWeapon: weapon });
    console.log(`[WEAPONS] Switched to ${weapon}`);
  },
  
  startLocking: (cameraPosition, cameraDirection) => {
    const enemies = useEnemies.getState().enemies;
    if (enemies.length === 0) {
      toast.error('No targets available');
      return;
    }
    
    // Find closest enemy in front of camera
    let closestEnemy: Enemy | null = null;
    let closestDistance = Infinity;
    
    enemies.forEach(enemy => {
      if (enemy.isDying) return;
      
      const toEnemy = enemy.position.clone().sub(cameraPosition);
      const distance = toEnemy.length();
      const angle = toEnemy.normalize().dot(cameraDirection);
      
      // Must be in front (angle > 0.7 = ~45 degree cone)
      if (angle > 0.7 && distance < closestDistance) {
        closestEnemy = enemy;
        closestDistance = distance;
      }
    });
    
    if (!closestEnemy || closestEnemy.isDying) {
      toast.error('No target in range');
      return;
    }
    
    const { selectedWeapon, weaponStats } = get();
    const lockDuration = selectedWeapon === 'torpedo' 
      ? weaponStats.torpedo.lockTime 
      : weaponStats.missile.lockTime;
    
    set({
      isLocking: true,
      currentTarget: {
        enemyId: closestEnemy.id,
        lockProgress: 0,
        lockDuration,
        position: closestEnemy.position.clone()
      }
    });
    
    console.log(`[WEAPONS] Started locking onto enemy ${closestEnemy.id}`);
  },
  
  updateLocking: (delta, cameraPosition, cameraDirection) => {
    const { currentTarget, isLocking } = get();
    if (!isLocking || !currentTarget) return;
    
    // Check if target still exists
    const enemies = useEnemies.getState().enemies;
    const targetEnemy = enemies.find(e => e.id === currentTarget.enemyId);
    
    if (!targetEnemy || targetEnemy.isDying) {
      set({ isLocking: false, currentTarget: null });
      toast.error('Target lost');
      return;
    }
    
    // Update target position
    currentTarget.position.copy(targetEnemy.position);
    
    // Check if still in view cone
    const toEnemy = targetEnemy.position.clone().sub(cameraPosition);
    const angle = toEnemy.normalize().dot(cameraDirection);
    
    if (angle < 0.7) {
      set({ isLocking: false, currentTarget: null });
      toast.error('Target out of range');
      return;
    }
    
    // Update lock progress
    currentTarget.lockProgress = Math.min(1, currentTarget.lockProgress + delta / currentTarget.lockDuration);
    
    if (currentTarget.lockProgress >= 1) {
      toast.success('Lock acquired!');
    }
    
    set({ currentTarget: { ...currentTarget } });
  },
  
  cancelLocking: () => {
    set({ isLocking: false, currentTarget: null });
  },
  
  fireTorpedo: (position, direction) => {
    const { currentTarget, torpedoCooldown, weaponStats } = get();
    
    if (torpedoCooldown > 0) {
      toast.error('Torpedo reloading...');
      return;
    }
    
    if (!currentTarget || currentTarget.lockProgress < 1) {
      toast.error('No lock - use T to lock on');
      return;
    }
    
    const projectile: HomingProjectile = {
      id: Math.random().toString(36).substr(2, 9),
      position: position.clone(),
      direction: direction.clone().normalize(),
      speed: weaponStats.torpedo.speed,
      life: 8,
      damage: weaponStats.torpedo.damage,
      ownerId: 'player',
      ownerType: 'player',
      isHoming: true,
      targetId: currentTarget.enemyId,
      homingStrength: 0.6
    };
    
    set(state => ({
      homingProjectiles: [...state.homingProjectiles, projectile],
      torpedoCooldown: weaponStats.torpedo.cooldown,
      isLocking: false,
      currentTarget: null
    }));
    
    toast.success('Torpedo fired!');
    console.log(`[WEAPONS] Fired torpedo at ${currentTarget.enemyId}`);
  },
  
  fireMissile: (position, direction) => {
    const { currentTarget, missileCooldown, weaponStats } = get();
    
    if (missileCooldown > 0) {
      toast.error('Missile reloading...');
      return;
    }
    
    if (!currentTarget || currentTarget.lockProgress < 1) {
      toast.error('No lock - use M to lock on');
      return;
    }
    
    const projectile: HomingProjectile = {
      id: Math.random().toString(36).substr(2, 9),
      position: position.clone(),
      direction: direction.clone().normalize(),
      speed: weaponStats.missile.speed,
      life: 10,
      damage: weaponStats.missile.damage,
      ownerId: 'player',
      ownerType: 'player',
      isHoming: true,
      targetId: currentTarget.enemyId,
      homingStrength: 0.8
    };
    
    set(state => ({
      homingProjectiles: [...state.homingProjectiles, projectile],
      missileCooldown: weaponStats.missile.cooldown,
      isLocking: false,
      currentTarget: null
    }));
    
    toast.success('Missile fired!');
    console.log(`[WEAPONS] Fired missile at ${currentTarget.enemyId}`);
  },
  
  updateCooldowns: (delta) => {
    set(state => ({
      laserCooldown: Math.max(0, state.laserCooldown - delta),
      torpedoCooldown: Math.max(0, state.torpedoCooldown - delta),
      missileCooldown: Math.max(0, state.missileCooldown - delta)
    }));
  },
  
  updateHomingProjectiles: (delta) => {
    const enemies = useEnemies.getState().enemies;
    
    set(state => ({
      homingProjectiles: state.homingProjectiles
        .map(projectile => {
          // Update position
          const newPosition = projectile.position.clone().add(
            projectile.direction.clone().multiplyScalar(projectile.speed * delta)
          );
          
          // Homing logic
          if (projectile.isHoming && projectile.targetId) {
            const target = enemies.find(e => e.id === projectile.targetId && !e.isDying);
            
            if (target) {
              const toTarget = target.position.clone().sub(newPosition);
              const targetDirection = toTarget.normalize();
              
              // Blend current direction with target direction
              const newDirection = projectile.direction
                .clone()
                .lerp(targetDirection, projectile.homingStrength || 0.5)
                .normalize();
              
              return {
                ...projectile,
                position: newPosition,
                direction: newDirection,
                life: projectile.life - delta
              };
            }
          }
          
          // No target or not homing - just move straight
          return {
            ...projectile,
            position: newPosition,
            life: projectile.life - delta
          };
        })
        .filter(projectile => projectile.life > 0)
    }));
  },
  
  removeHomingProjectile: (id) => {
    set(state => ({
      homingProjectiles: state.homingProjectiles.filter(p => p.id !== id)
    }));
  },
  
  canFireWeapon: (weapon) => {
    const state = get();
    switch (weapon) {
      case 'laser':
        return state.laserCooldown <= 0;
      case 'torpedo':
        return state.torpedoCooldown <= 0;
      case 'missile':
        return state.missileCooldown <= 0;
      default:
        return false;
    }
  }
}));
