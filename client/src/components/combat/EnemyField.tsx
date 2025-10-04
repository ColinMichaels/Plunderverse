import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { useEnemies } from "../../lib/stores/combat/useEnemies";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useShooting } from "../../lib/stores/combat/useShooting";
import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useAutopilot } from "../../lib/stores/navigation/useAutopilot";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { useHints } from "../../lib/stores/ui/useHints";
import { Enemy } from "./Enemy";
import { ExplosionEffect } from "./ExplosionEffect";
import * as THREE from "three";

export function EnemyField() {
  const { 
    enemies, 
    updateEnemies, 
    spawnBasedOnHeat,
    damageEnemy,
    clearEnemies 
  } = useEnemies();
  const { cameraPosition } = useSolarSystem();
  const { projectiles, removeProjectile } = useShooting();
  const { takeDamage } = useShipStatus();
  const { isActive: isAutopilotActive } = useAutopilot();
  const { playHit } = useAudio();
  const { showHint, hasSeenHint } = useHints();
  
  const lastSpawnCheck = useRef(0);
  const previousAutopilotState = useRef(false);
  const explosions = useRef<Array<{ id: string, position: THREE.Vector3, time: number }>>([]);
  const combatTutorialShown = useRef(false);
  
  useEffect(() => {
    // Show combat tutorial on first load
    if (!combatTutorialShown.current && !hasSeenHint('combat-tutorial')) {
      setTimeout(() => {
        showHint('combat-tutorial');
        console.log("[EnemyField] Showing combat tutorial - 30 second grace period active");
      }, 1000); // Show after 1 second to ensure game is loaded
      combatTutorialShown.current = true;
    }
    
    // Clear enemies when autopilot activates
    if (isAutopilotActive && !previousAutopilotState.current) {
      clearEnemies();
      console.log("[EnemyField] Autopilot activated - clearing enemies");
    }
    previousAutopilotState.current = isAutopilotActive;
  }, [isAutopilotActive, clearEnemies, showHint, hasSeenHint]);
  
  useFrame((state, delta) => {
    // Update enemy AI
    updateEnemies(delta, cameraPosition);
    
    // Spawn enemies based on heat (check every 5 seconds)
    const now = Date.now();
    if (!isAutopilotActive && now - lastSpawnCheck.current > 5000) {
      spawnBasedOnHeat(cameraPosition);
      lastSpawnCheck.current = now;
    }
    
    // Check collisions between projectiles and targets
    projectiles.forEach(projectile => {
      // Player projectiles hitting enemies
      if (projectile.ownerType === 'player') {
        enemies.forEach(enemy => {
          if (enemy.isDying) return;
          
          const distance = projectile.position.distanceTo(enemy.position);
          if (distance < enemy.scale + 0.5) {
            // Hit enemy
            damageEnemy(enemy.id, projectile.damage);
            removeProjectile(projectile.id);
            playHit();
            
            // Add explosion if enemy died
            if (enemy.hull <= 0) {
              explosions.current.push({
                id: Math.random().toString(36).substr(2, 9),
                position: enemy.position.clone(),
                time: 0
              });
            }
            
            console.log(`[EnemyField] Player hit enemy for ${projectile.damage} damage`);
          }
        });
      }
      // Enemy projectiles hitting player
      else if (projectile.ownerType === 'enemy') {
        const distanceToPlayer = projectile.position.distanceTo(cameraPosition);
        if (distanceToPlayer < 1.5) {
          // Hit player
          takeDamage(projectile.damage, `Enemy ${projectile.ownerId}`);
          removeProjectile(projectile.id);
          playHit();
          console.log(`[EnemyField] Enemy hit player for ${projectile.damage} damage`);
        }
      }
    });
    
    // Check collisions between enemies and player ship
    enemies.forEach(enemy => {
      if (enemy.isDying) return;
      
      const distance = cameraPosition.distanceTo(enemy.position);
      if (distance < enemy.scale + 1.5) {
        // Collision damage
        takeDamage(20, "Collision with enemy ship");
        damageEnemy(enemy.id, 30);
        
        // Push enemy away
        const pushDirection = enemy.position.clone().sub(cameraPosition).normalize();
        enemy.position.add(pushDirection.multiplyScalar(5));
      }
    });
    
    // Update explosions
    explosions.current = explosions.current.filter(explosion => {
      explosion.time += delta;
      return explosion.time < 2; // Remove after 2 seconds
    });
  });
  
  return (
    <group>
      {enemies.map(enemy => (
        <Enemy 
          key={enemy.id} 
          enemy={enemy}
          onHit={(id) => console.log(`Enemy ${id} hit`)}
        />
      ))}
      
      {explosions.current.map(explosion => (
        <ExplosionEffect
          key={explosion.id}
          position={explosion.position}
          scale={1.5}
          duration={2}
        />
      ))}
    </group>
  );
}