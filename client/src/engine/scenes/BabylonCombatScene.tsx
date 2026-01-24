import { useEffect, useRef, useCallback } from 'react';
import { useEngine, useEngineUpdate } from '../hooks/useEngine';
import { Color } from '../utils/math';
import { useEnemies, Enemy } from '@/lib/stores/combat/useEnemies';
import { useShooting, Projectile } from '@/lib/stores/combat/useShooting';
import { useWeaponSystems } from '@/lib/stores/combat/useWeaponSystems';
import { useSolarSystem } from '@/lib/stores/space/useSolarSystem';
import { useShipStatus } from '@/lib/stores/ship/useShipStatus';
import { useAutopilot } from '@/lib/stores/navigation/useAutopilot';
import { useAudio } from '@/lib/stores/ui/useAudio';

interface ExplosionData {
  id: string;
  position: { x: number; y: number; z: number };
  startTime: number;
  duration: number;
  scale: number;
}

export function BabylonCombatScene() {
  const { engine, isInitialized } = useEngine();
  const { enemies, updateEnemies, damageEnemy, clearEnemies } = useEnemies();
  const { projectiles, updateProjectiles, removeProjectile } = useShooting();
  const { homingProjectiles, removeHomingProjectile } = useWeaponSystems();
  const { cameraPosition } = useSolarSystem();
  const { takeDamage } = useShipStatus();
  const { isActive: isAutopilotActive } = useAutopilot();
  const { playHit } = useAudio();
  
  const trackedEnemyIds = useRef<Set<string>>(new Set());
  const trackedProjectileIds = useRef<Set<string>>(new Set());
  const explosions = useRef<ExplosionData[]>([]);
  const explosionIdCounter = useRef(0);

  useEffect(() => {
    if (!engine || !isInitialized) return;
    console.log('[BabylonCombatScene] Initializing combat scene overlay');

    return () => {
      console.log('[BabylonCombatScene] Cleaning up combat scene');
      trackedEnemyIds.current.forEach(id => {
        engine.removeNode(`enemy-${id}`);
        engine.removeNode(`enemy-shield-${id}`);
      });
      trackedEnemyIds.current.clear();
      
      trackedProjectileIds.current.forEach(id => {
        engine.removeNode(`projectile-${id}`);
      });
      trackedProjectileIds.current.clear();
      
      explosions.current.forEach(exp => {
        engine.removeNode(`explosion-${exp.id}`);
      });
      explosions.current = [];
    };
  }, [engine, isInitialized]);

  const createExplosion = useCallback((position: { x: number; y: number; z: number }, scale: number = 1) => {
    if (!engine) return;
    
    const id = `${explosionIdCounter.current++}`;
    const explosion: ExplosionData = {
      id,
      position,
      startTime: Date.now() / 1000,
      duration: 0.5,
      scale
    };
    explosions.current.push(explosion);
    
    engine.createMesh({
      id: `explosion-${id}`,
      type: 'sphere',
      transform: {
        position,
        scale: { x: scale, y: scale, z: scale }
      },
      color: { r: 1, g: 1, b: 0 },
      emissive: { r: 1, g: 0.5, b: 0 },
      opacity: 1
    });
  }, [engine]);

  useEngineUpdate('combat-update', useCallback((deltaTime, elapsedTime) => {
    if (!engine) return;

    const playerPos = { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z };
    const playerPosVec = { x: playerPos.x, y: playerPos.y, z: playerPos.z } as any;
    
    updateEnemies(deltaTime, playerPosVec);
    updateProjectiles(deltaTime);
    
    const currentEnemyIds = new Set(enemies.map(e => e.id));
    trackedEnemyIds.current.forEach(id => {
      if (!currentEnemyIds.has(id)) {
        engine.removeNode(`enemy-${id}`);
        engine.removeNode(`enemy-shield-${id}`);
        trackedEnemyIds.current.delete(id);
      }
    });

    enemies.forEach(enemy => {
      const enemyId = enemy.id;
      const pos = { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z };
      const colorRgb = hexToRgb(enemy.color);
      
      if (!trackedEnemyIds.current.has(enemyId)) {
        engine.createMesh({
          id: `enemy-${enemyId}`,
          type: 'box',
          transform: {
            position: pos,
            scale: { x: enemy.scale, y: enemy.scale * 0.5, z: enemy.scale * 1.5 }
          },
          color: colorRgb,
          emissive: enemy.isDying ? { r: 1, g: 0.3, b: 0 } : { r: colorRgb.r * 0.3, g: colorRgb.g * 0.3, b: colorRgb.b * 0.3 }
        });
        
        if (enemy.shield > 0) {
          engine.createMesh({
            id: `enemy-shield-${enemyId}`,
            type: 'sphere',
            transform: {
              position: pos,
              scale: { x: enemy.scale * 1.5, y: enemy.scale * 1.5, z: enemy.scale * 1.5 }
            },
            color: { r: 0.2, g: 0.5, b: 1 },
            emissive: { r: 0.1, g: 0.3, b: 0.8 },
            opacity: 0.3
          });
        }
        
        trackedEnemyIds.current.add(enemyId);
      } else {
        engine.setNodeTransform(`enemy-${enemyId}`, {
          position: pos,
          rotation: { x: enemy.rotation.x, y: enemy.rotation.y, z: enemy.rotation.z }
        });
        
        if (enemy.shield > 0) {
          engine.setNodeTransform(`enemy-shield-${enemyId}`, {
            position: pos
          });
        } else {
          engine.removeNode(`enemy-shield-${enemyId}`);
        }
        
        if (enemy.isDying) {
          createExplosion(pos, enemy.scale);
        }
      }
    });

    const allProjectiles = [...projectiles, ...homingProjectiles];
    const currentProjectileIds = new Set(allProjectiles.map(p => p.id));
    
    trackedProjectileIds.current.forEach(id => {
      if (!currentProjectileIds.has(id)) {
        engine.removeNode(`projectile-${id}`);
        trackedProjectileIds.current.delete(id);
      }
    });

    allProjectiles.forEach(projectile => {
      const projId = projectile.id;
      const pos = { x: projectile.position.x, y: projectile.position.y, z: projectile.position.z };
      const isPlayerProjectile = projectile.ownerType === 'player';
      const color = isPlayerProjectile 
        ? { r: 1, g: 1, b: 0 } 
        : { r: 1, g: 0.2, b: 0.2 };
      
      if (!trackedProjectileIds.current.has(projId)) {
        engine.createMesh({
          id: `projectile-${projId}`,
          type: 'sphere',
          transform: {
            position: pos,
            scale: { x: 0.3, y: 0.3, z: 0.3 }
          },
          color,
          emissive: color
        });
        trackedProjectileIds.current.add(projId);
      } else {
        engine.setNodeTransform(`projectile-${projId}`, {
          position: pos
        });
      }

      if (isPlayerProjectile) {
        enemies.forEach(enemy => {
          const dx = projectile.position.x - enemy.position.x;
          const dy = projectile.position.y - enemy.position.y;
          const dz = projectile.position.z - enemy.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < enemy.scale + 1) {
            damageEnemy(enemy.id, projectile.damage);
            if ((projectile as any).isHoming) {
              removeHomingProjectile(projId);
            } else {
              removeProjectile(projId);
            }
            playHit();
            createExplosion(pos, 0.5);
          }
        });
      } else {
        const dx = projectile.position.x - playerPos.x;
        const dy = projectile.position.y - playerPos.y;
        const dz = projectile.position.z - playerPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 2) {
          takeDamage(projectile.damage, 'enemy');
          removeProjectile(projId);
        }
      }
    });

    const now = Date.now() / 1000;
    explosions.current = explosions.current.filter(exp => {
      const elapsed = now - exp.startTime;
      const progress = elapsed / exp.duration;
      
      if (progress >= 1) {
        engine.removeNode(`explosion-${exp.id}`);
        return false;
      }
      
      const currentScale = exp.scale * (1 + progress * 2);
      engine.setNodeTransform(`explosion-${exp.id}`, {
        scale: { x: currentScale, y: currentScale, z: currentScale }
      });
      
      return true;
    });

  }, [engine, enemies, projectiles, homingProjectiles, cameraPosition, damageEnemy, removeProjectile, removeHomingProjectile, takeDamage, playHit, createExplosion, updateEnemies, updateProjectiles]), [engine, enemies, projectiles, homingProjectiles, cameraPosition]);

  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    };
  }
  return { r: 0.5, g: 0.5, b: 0.5 };
}

export default BabylonCombatScene;
