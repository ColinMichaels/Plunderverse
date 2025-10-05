import { create } from 'zustand';
import * as THREE from 'three';
import { toast } from 'sonner';
import { useHeatSystem } from '../player/useHeatSystem';
import { usePlayer } from '../player/usePlayer';
import { useShooting } from './useShooting';
import { useLandedState } from '../surface/useLandedState';
import { useSolarSystem } from '../space/useSolarSystem';

export type FactionType = 'corporations' | 'outlaws' | 'military' | 'bountyHunter';
export type AIBehavior = 'patrol' | 'aggressive' | 'defensive' | 'fleeing' | 'orbiting' | 'pursuing';

export interface WeaponType {
  damage: number;
  fireRate: number; // shots per second
  range: number;
  speed: number;
}

const WEAPON_TYPES: Record<string, WeaponType> = {
  laser: { damage: 10, fireRate: 2, range: 100, speed: 60 },
  plasma: { damage: 20, fireRate: 1, range: 80, speed: 50 },
  missile: { damage: 40, fireRate: 0.3, range: 150, speed: 40 },
  rapidfire: { damage: 5, fireRate: 5, range: 60, speed: 70 }
};

export interface Enemy {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  
  // Combat stats
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  weapon: WeaponType;
  lastFiredTime: number;
  
  // AI state
  behavior: AIBehavior;
  targetPosition: THREE.Vector3 | null;
  patrolPoints?: THREE.Vector3[];
  currentPatrolIndex?: number;
  detectionRange: number;
  attackRange: number;
  
  // Identity
  faction: FactionType;
  shipType: 'fighter' | 'patrol' | 'bomber' | 'elite';
  level: number;
  
  // Rewards
  creditReward: number;
  reputationReward: Record<string, number>;
  lootTable?: string[];
  
  // Visual/animation
  scale: number;
  color: string;
  isDying: boolean;
  deathTime?: number;
}

interface EnemiesState {
  enemies: Enemy[];
  maxEnemies: number;
  spawnCooldown: number;
  lastSpawnTime: number;
  totalEnemiesDestroyed: number;
  gameStartTime: number;
  gracePeriodDuration: number; // 30 seconds grace period
  
  // Enemy management
  spawnEnemy: (position: THREE.Vector3, faction?: FactionType, shipType?: Enemy['shipType']) => void;
  updateEnemies: (delta: number, playerPosition: THREE.Vector3) => void;
  damageEnemy: (id: string, damage: number) => void;
  removeEnemy: (id: string) => void;
  clearEnemies: () => void;
  
  // Spawning logic
  shouldSpawnEnemy: () => boolean;
  spawnBasedOnHeat: (playerPosition: THREE.Vector3) => void;
  spawnPatrol: (playerPosition: THREE.Vector3, faction: FactionType) => void;
  spawnBountyHunter: (playerPosition: THREE.Vector3) => void;
  
  // Combat rewards
  processEnemyRewards: (enemy: Enemy) => void;
}

export const useEnemies = create<EnemiesState>((set, get) => ({
  enemies: [],
  maxEnemies: 1, // LIMIT TO 1 ENEMY MAXIMUM
  spawnCooldown: 20000, // 20 seconds cooldown between spawns
  lastSpawnTime: 0,
  totalEnemiesDestroyed: 0,
  gameStartTime: Date.now(),
  gracePeriodDuration: 30000, // 30 seconds grace period
  
  spawnEnemy: (position, faction = 'outlaws', shipType = 'fighter') => {
    const state = get();
    if (state.enemies.length >= state.maxEnemies) return;
    
    // Calculate stats based on ship type
    let stats = { hull: 50, shield: 20, weapon: WEAPON_TYPES.laser, credits: 100, scale: 1 };
    let detectionRange = 50;
    let attackRange = 30;
    let color = '#ff4444';
    
    switch (shipType) {
      case 'fighter':
        stats = { hull: 40, shield: 20, weapon: WEAPON_TYPES.laser, credits: 100, scale: 0.8 };
        detectionRange = 60;
        attackRange = 40;
        break;
      case 'patrol':
        stats = { hull: 60, shield: 40, weapon: WEAPON_TYPES.plasma, credits: 200, scale: 1.0 };
        detectionRange = 80;
        attackRange = 50;
        break;
      case 'bomber':
        stats = { hull: 80, shield: 30, weapon: WEAPON_TYPES.missile, credits: 300, scale: 1.2 };
        detectionRange = 70;
        attackRange = 60;
        break;
      case 'elite':
        stats = { hull: 100, shield: 60, weapon: WEAPON_TYPES.rapidfire, credits: 500, scale: 1.1 };
        detectionRange = 100;
        attackRange = 70;
        break;
    }
    
    // Set faction colors
    switch (faction) {
      case 'corporations':
        color = '#4488ff';
        break;
      case 'military':
        color = '#44ff44';
        break;
      case 'bountyHunter':
        color = '#ff8844';
        break;
      case 'outlaws':
      default:
        color = '#ff4444';
        break;
    }
    
    // Create patrol points for patrol behavior
    const patrolPoints = [
      position.clone(),
      position.clone().add(new THREE.Vector3(30, 0, 0)),
      position.clone().add(new THREE.Vector3(30, 0, 30)),
      position.clone().add(new THREE.Vector3(0, 0, 30))
    ];
    
    const newEnemy: Enemy = {
      id: Math.random().toString(36).substr(2, 9),
      position: position.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
      
      hull: stats.hull,
      maxHull: stats.hull,
      shield: stats.shield,
      maxShield: stats.shield,
      weapon: stats.weapon,
      lastFiredTime: 0,
      
      behavior: 'patrol',
      targetPosition: null,
      patrolPoints,
      currentPatrolIndex: 0,
      detectionRange,
      attackRange,
      
      faction,
      shipType,
      level: 1,
      
      creditReward: stats.credits,
      reputationReward: {
        [faction]: -10,
        ...(faction === 'outlaws' ? { corporations: 5 } : {}),
        ...(faction === 'corporations' ? { outlaws: 5 } : {})
      },
      lootTable: ['fuel_cell', 'scrap_metal'],
      
      scale: stats.scale,
      color,
      isDying: false
    };
    
    set(state => ({
      enemies: [...state.enemies, newEnemy],
      lastSpawnTime: Date.now()
    }));
    
    console.log(`[DEBUG-ENEMY-SPAWN] Spawned ${shipType} ${faction} enemy:`, {
      id: newEnemy.id,
      position: position.toArray(),
      hull: newEnemy.hull,
      shield: newEnemy.shield,
      weapon: newEnemy.weapon,
      totalEnemies: state.enemies.length + 1
    });
  },
  
  updateEnemies: (delta, playerPosition) => {
    const state = get();
    const shooting = useShooting.getState();
    
    set(state => ({
      enemies: state.enemies.map(enemy => {
        // Skip dying enemies
        if (enemy.isDying) {
          enemy.deathTime = (enemy.deathTime || 0) + delta;
          if (enemy.deathTime > 2) {
            // Remove after death animation
            return null as any;
          }
          return enemy;
        }
        
        // Shield regeneration
        if (enemy.shield < enemy.maxShield) {
          enemy.shield = Math.min(enemy.maxShield, enemy.shield + delta * 2);
        }
        
        // Calculate distance to player
        const distanceToPlayer = enemy.position.distanceTo(playerPosition);
        
        // AI Behavior Logic
        const speed = 20; // Base movement speed
        let targetVelocity = new THREE.Vector3();
        
        // Apply crew hacker bonus to reduce enemy detection range
        let effectiveDetectionRange = enemy.detectionRange;
        try {
          const crewState = (window as any).useCrewManagement?.getState?.();
          if (crewState?.currentBonuses?.intelGathering) {
            effectiveDetectionRange *= (1 - crewState.currentBonuses.intelGathering * 0.5); // 50% of intel bonus reduces detection
            console.log(`[ENEMY] Hacker stealth reducing detection by ${(crewState.currentBonuses.intelGathering * 50).toFixed(0)}%`);
          }
        } catch (e) {
          // Crew management might not be initialized yet
        }
        
        // Detection and behavior switching
        if (distanceToPlayer < effectiveDetectionRange) {
          // Player detected - determine behavior based on faction and health
          const healthPercent = enemy.hull / enemy.maxHull;
          
          if (healthPercent < 0.3 && enemy.behavior !== 'fleeing') {
            enemy.behavior = 'fleeing';
          } else if (distanceToPlayer < enemy.attackRange) {
            // Enhanced faction reputation checking
            const player = usePlayer.getState();
            let shouldAttack = false;
            let behaviorType: AIBehavior = 'defensive';
            
            // Faction-specific behavior based on reputation
            switch (enemy.faction) {
              case 'corporations':
                // Corporation patrols ignore players with positive reputation
                const corpRep = player.reputation.corporations || 0;
                if (corpRep >= 20) {
                  // Friendly - won't attack
                  behaviorType = 'patrol';
                  console.log(`[ENEMY] Corporation patrol ignoring player (rep: ${corpRep})`);
                } else if (corpRep <= -20 || player.heat > 50) {
                  // Hostile if bad reputation OR high heat
                  shouldAttack = true;
                  behaviorType = 'aggressive';
                  console.log(`[ENEMY] Corporation patrol attacking (rep: ${corpRep}, heat: ${player.heat})`);
                } else {
                  // Neutral - defensive stance
                  behaviorType = 'defensive';
                }
                break;
                
              case 'outlaws':
                // Outlaw pirates are friendly to players with high outlaw reputation
                const outlawRep = player.reputation.outlaws || 0;
                if (outlawRep >= 50) {
                  // Allied - won't attack
                  behaviorType = 'patrol';
                  console.log(`[ENEMY] Outlaw pirates allied with player (rep: ${outlawRep})`);
                } else if (outlawRep >= 20) {
                  // Friendly - defensive only
                  behaviorType = 'defensive';
                } else if (player.reputation.corporations > 50) {
                  // Hostile to corporation-aligned players
                  shouldAttack = true;
                  behaviorType = 'aggressive';
                  console.log(`[ENEMY] Outlaws attacking corporation ally (corp rep: ${player.reputation.corporations})`);
                } else if (outlawRep < -20) {
                  // Hostile if bad reputation with outlaws
                  shouldAttack = true;
                  behaviorType = 'aggressive';
                } else {
                  // Neutral - might attack for loot
                  shouldAttack = Math.random() < 0.3; // 30% chance
                  behaviorType = shouldAttack ? 'aggressive' : 'orbiting';
                }
                break;
                
              case 'military':
                // Military forces escalate based on heat AND corporation reputation
                const milHeat = player.heat;
                const milCorpRep = player.reputation.corporations || 0;
                
                if (milHeat > 75) {
                  // Extreme threat - always attack
                  shouldAttack = true;
                  behaviorType = 'aggressive';
                  console.log(`[ENEMY] Military engaging high-threat target (heat: ${milHeat})`);
                } else if (milHeat > 50 && milCorpRep < 0) {
                  // High heat + bad corp rep = attack
                  shouldAttack = true;
                  behaviorType = 'aggressive';
                } else if (milCorpRep >= 50) {
                  // Good standing with corporations - just observe
                  behaviorType = 'patrol';
                } else if (milHeat > 25) {
                  // Moderate heat - defensive/warning
                  behaviorType = 'defensive';
                } else {
                  // Low threat - patrol
                  behaviorType = 'patrol';
                }
                break;
                
              case 'bountyHunter':
                // Bounty hunters always attack if player has heat
                if (player.heat > 30) {
                  shouldAttack = true;
                  behaviorType = 'aggressive';
                  console.log(`[ENEMY] Bounty hunter pursuing target (heat: ${player.heat})`);
                } else {
                  // No bounty - ignore
                  behaviorType = 'patrol';
                }
                break;
                
              default:
                // Independent traders - neutral unless provoked
                const indRep = player.reputation.independents || 0;
                if (indRep < -50) {
                  // Very bad reputation - will defend themselves
                  shouldAttack = true;
                  behaviorType = 'defensive';
                } else {
                  // Neutral - avoid conflict
                  behaviorType = 'patrol';
                }
                break;
            }
            
            enemy.behavior = behaviorType;
          } else {
            enemy.behavior = 'pursuing';
          }
          
          enemy.targetPosition = playerPosition.clone();
        } else {
          // No player detected, return to patrol
          if (enemy.behavior !== 'patrol') {
            enemy.behavior = 'patrol';
          }
        }
        
        // Execute behavior
        switch (enemy.behavior) {
          case 'patrol':
            // Move between patrol points
            if (enemy.patrolPoints && enemy.patrolPoints.length > 0) {
              const targetPoint = enemy.patrolPoints[enemy.currentPatrolIndex || 0];
              const toTarget = targetPoint.clone().sub(enemy.position);
              
              if (toTarget.length() < 5) {
                // Reached patrol point, move to next
                enemy.currentPatrolIndex = ((enemy.currentPatrolIndex || 0) + 1) % enemy.patrolPoints.length;
              } else {
                targetVelocity = toTarget.normalize().multiplyScalar(speed * 0.5);
              }
            }
            break;
            
          case 'aggressive':
            // Move directly toward player
            if (enemy.targetPosition) {
              const toPlayer = enemy.targetPosition.clone().sub(enemy.position);
              if (toPlayer.length() > enemy.attackRange * 0.7) {
                targetVelocity = toPlayer.normalize().multiplyScalar(speed);
              }
              
              // Face the player
              enemy.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
            }
            break;
            
          case 'defensive':
            // Maintain distance, circle around
            if (enemy.targetPosition) {
              const toPlayer = enemy.targetPosition.clone().sub(enemy.position);
              const distance = toPlayer.length();
              
              if (distance < enemy.attackRange * 0.5) {
                // Too close, back away
                targetVelocity = toPlayer.normalize().multiplyScalar(-speed * 0.7);
              } else if (distance > enemy.attackRange * 0.9) {
                // Too far, move closer
                targetVelocity = toPlayer.normalize().multiplyScalar(speed * 0.5);
              } else {
                // Circle strafe
                const angle = Math.atan2(toPlayer.z, toPlayer.x);
                const strafeAngle = angle + Math.PI / 2;
                targetVelocity = new THREE.Vector3(
                  Math.cos(strafeAngle) * speed * 0.6,
                  0,
                  Math.sin(strafeAngle) * speed * 0.6
                );
              }
            }
            break;
            
          case 'fleeing':
            // Move away from player
            if (enemy.targetPosition) {
              const awayFromPlayer = enemy.position.clone().sub(enemy.targetPosition).normalize();
              targetVelocity = awayFromPlayer.multiplyScalar(speed * 1.2);
            }
            break;
            
          case 'orbiting':
            // Circle around the player at medium range
            if (enemy.targetPosition) {
              const toPlayer = enemy.targetPosition.clone().sub(enemy.position);
              const distance = toPlayer.length();
              const angle = Math.atan2(toPlayer.z, toPlayer.x);
              const orbitAngle = angle + Math.PI / 2 + (Date.now() * 0.001);
              
              const idealDistance = enemy.attackRange * 0.7;
              const distanceCorrection = (idealDistance - distance) * 0.1;
              
              targetVelocity = new THREE.Vector3(
                Math.cos(orbitAngle) * speed * 0.7 + toPlayer.normalize().x * distanceCorrection,
                0,
                Math.sin(orbitAngle) * speed * 0.7 + toPlayer.normalize().z * distanceCorrection
              );
            }
            break;
            
          case 'pursuing':
            // Move toward player to get in range
            if (enemy.targetPosition) {
              const toPlayer = enemy.targetPosition.clone().sub(enemy.position);
              targetVelocity = toPlayer.normalize().multiplyScalar(speed * 0.8);
              enemy.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
            }
            break;
        }
        
        // Apply velocity damping for smooth movement
        enemy.velocity.lerp(targetVelocity, delta * 2);
        
        // Update position
        const movement = enemy.velocity.clone().multiplyScalar(delta);
        enemy.position.add(movement);
        
        // Shooting logic
        const canShoot = 
          enemy.behavior === 'aggressive' || 
          enemy.behavior === 'defensive' || 
          enemy.behavior === 'orbiting';
          
        if (canShoot && enemy.targetPosition && distanceToPlayer < enemy.attackRange) {
          const now = Date.now() / 1000;
          const timeSinceLastShot = now - enemy.lastFiredTime;
          
          if (timeSinceLastShot > 1 / enemy.weapon.fireRate) {
            // Calculate lead on target (predictive aiming)
            const playerVelocity = new THREE.Vector3(); // TODO: Get actual player velocity
            const timeToTarget = distanceToPlayer / enemy.weapon.speed;
            const predictedPosition = enemy.targetPosition.clone().add(
              playerVelocity.clone().multiplyScalar(timeToTarget)
            );
            
            const shootDirection = predictedPosition.clone()
              .sub(enemy.position)
              .normalize();
            
            // Add some inaccuracy based on enemy type and apply crew pilot evasion bonus
            let inaccuracy = enemy.shipType === 'elite' ? 0.02 : 0.05;
            
            // Apply crew pilot evasion bonus to make enemies less accurate
            try {
              const crewState = (window as any).useCrewManagement?.getState?.();
              if (crewState?.currentBonuses?.evasion) {
                inaccuracy *= (1 + crewState.currentBonuses.evasion); // More evasion = less accurate enemies
                console.log(`[ENEMY] Pilot evasion making shots ${(crewState.currentBonuses.evasion * 100).toFixed(0)}% less accurate`);
              }
            } catch (e) {
              // Crew management might not be initialized yet
            }
            
            shootDirection.x += (Math.random() - 0.5) * inaccuracy;
            shootDirection.z += (Math.random() - 0.5) * inaccuracy;
            
            shooting.addProjectile(
              enemy.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
              shootDirection,
              enemy.weapon.speed,
              enemy.weapon.damage,
              enemy.id,
              'enemy'
            );
            
            enemy.lastFiredTime = now;
          }
        }
        
        return enemy;
      }).filter(Boolean)
    }));
  },
  
  damageEnemy: (id, damage) => {
    const state = get();
    const enemy = state.enemies.find(e => e.id === id);
    if (!enemy || enemy.isDying) return;
    
    // Apply damage to shield first, then hull
    let remainingDamage = damage;
    if (enemy.shield > 0) {
      const shieldDamage = Math.min(enemy.shield, remainingDamage);
      enemy.shield -= shieldDamage;
      remainingDamage -= shieldDamage;
    }
    
    if (remainingDamage > 0) {
      enemy.hull -= remainingDamage;
    }
    
    // Check if enemy is destroyed
    if (enemy.hull <= 0) {
      enemy.isDying = true;
      enemy.deathTime = 0;
      
      // Process rewards
      state.processEnemyRewards(enemy);
      
      // Report to combat trigger for missions
      const shooting = useShooting.getState();
      shooting.reportEnemyDestroyed(enemy.shipType, enemy.faction);
      
      // Record enemy kill in player stats
      const player = usePlayer.getState();
      player.recordEnemyKill(enemy.faction, enemy.shipType);
      
      set(state => ({
        totalEnemiesDestroyed: state.totalEnemiesDestroyed + 1
      }));
      
      console.log(`[DEBUG-ENEMY-DESPAWN] Enemy destroyed:`, {
        id: enemy.id,
        faction: enemy.faction,
        shipType: enemy.shipType,
        finalHull: enemy.hull,
        totalDestroyed: state.totalEnemiesDestroyed + 1
      });
    }
  },
  
  removeEnemy: (id) => {
    console.log(`[DEBUG-ENEMY-DESPAWN] Removing enemy ${id} from game`);
    set(state => ({
      enemies: state.enemies.filter(e => e.id !== id)
    }));
  },
  
  clearEnemies: () => {
    set({ enemies: [] });
  },
  
  shouldSpawnEnemy: () => {
    const state = get();
    const heatSystem = useHeatSystem.getState();
    const player = usePlayer.getState();
    const solarSystem = useSolarSystem.getState();
    const landedState = useLandedState.getState();
    
    const now = Date.now();
    const timeSinceStart = now - state.gameStartTime;
    
    // Enforce grace period - no enemies for first 30 seconds
    if (timeSinceStart < state.gracePeriodDuration) {
      console.log(`[Enemies] Grace period active: ${Math.ceil((state.gracePeriodDuration - timeSinceStart) / 1000)}s remaining`);
      return false;
    }
    
    // Check spawn cooldown
    if (now - state.lastSpawnTime < state.spawnCooldown) return false;
    
    // Check max enemies
    if (state.enemies.length >= state.maxEnemies) return false;
    
    // Base spawn chance on heat level
    const spawnChance = heatSystem.wantedLevelInfo.encounterChance;
    
    // Also consider location danger level - check if near asteroids or on a dangerous planet
    const currentLocation = landedState.isLanded ? landedState.landedPlanet : solarSystem.selectedPlanet;
    const locationDanger = currentLocation?.toLowerCase().includes('asteroid') ? 0.2 : 0.1;
    
    return Math.random() < (spawnChance + locationDanger);
  },
  
  spawnBasedOnHeat: (playerPosition) => {
    const state = get();
    const heatSystem = useHeatSystem.getState();
    const player = usePlayer.getState();
    
    if (!state.shouldSpawnEnemy()) return;
    
    // Determine faction based on heat and location
    let faction: FactionType = 'outlaws';
    let shipType: Enemy['shipType'] = 'fighter';
    
    if (heatSystem.bountyHunterActive && Math.random() < 0.3) {
      faction = 'bountyHunter';
      shipType = 'elite';
    } else if (heatSystem.wantedLevel >= 3 && Math.random() < 0.5) {
      faction = 'military';
      shipType = 'patrol';
    } else if (heatSystem.wantedLevel >= 1 && Math.random() < 0.4) {
      faction = 'corporations';
      shipType = 'patrol';
    }
    
    // Spawn at a random position around the player
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 40;
    const spawnPosition = playerPosition.clone().add(
      new THREE.Vector3(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * distance
      )
    );
    
    state.spawnEnemy(spawnPosition, faction, shipType);
  },
  
  spawnPatrol: (playerPosition, faction) => {
    const state = get();
    
    // Spawn a patrol of 2-3 ships
    const patrolSize = 2 + Math.floor(Math.random() * 2);
    const basePosition = playerPosition.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        0,
        (Math.random() - 0.5) * 60
      )
    );
    
    for (let i = 0; i < patrolSize; i++) {
      const offset = new THREE.Vector3(
        i * 10 - (patrolSize - 1) * 5,
        0,
        (Math.random() - 0.5) * 10
      );
      state.spawnEnemy(basePosition.clone().add(offset), faction, 'patrol');
    }
    
    console.log(`[Enemies] Spawned ${faction} patrol of ${patrolSize} ships`);
  },
  
  spawnBountyHunter: (playerPosition) => {
    const state = get();
    
    // Spawn elite bounty hunter
    const spawnPosition = playerPosition.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80
      )
    );
    
    state.spawnEnemy(spawnPosition, 'bountyHunter', 'elite');
    console.log('[Enemies] Bounty hunter spawned!');
  },
  
  processEnemyRewards: (enemy) => {
    const player = usePlayer.getState();
    const heatSystem = useHeatSystem.getState();
    
    // Grant credits
    player.addCredits(enemy.creditReward);
    
    // Show combat victory notification
    let message = `⚔️ Enemy destroyed! +${enemy.creditReward} credits`;
    
    // Special notifications for bounty hunters or elite enemies
    if (enemy.faction === 'bountyHunter') {
      message = `💰 Bounty collected: ${enemy.creditReward} credits!`;
      toast.success(message, { 
        description: 'Elite bounty hunter eliminated',
        duration: 4000
      });
    } else if (enemy.shipType === 'elite') {
      message = `🎯 Elite target destroyed! +${enemy.creditReward} credits`;
      toast.success(message, { duration: 4000 });
    } else {
      // Standard enemy destroyed notification
      const factionName = enemy.faction.charAt(0).toUpperCase() + enemy.faction.slice(1);
      toast.success(message, { 
        description: `${factionName} ${enemy.shipType} eliminated`,
        duration: 3000
      });
    }
    
    // Update reputation with notifications
    Object.entries(enemy.reputationReward).forEach(([faction, amount]) => {
      // Type-cast faction to match PlayerState's updateReputation expected type
      if (faction === 'corporations' || faction === 'independents' || faction === 'outlaws') {
        player.updateReputation(faction as 'corporations' | 'independents' | 'outlaws', amount);
        
        // Show reputation change notifications
        if (Math.abs(amount) >= 5) {
          const factionDisplayName = faction.charAt(0).toUpperCase() + faction.slice(1);
          if (amount > 0) {
            toast.info(`📈 ${factionDisplayName} reputation +${amount}`, {
              duration: 2500
            });
          } else {
            toast.warning(`📉 ${factionDisplayName} reputation ${amount}`, {
              duration: 2500
            });
          }
        }
      }
    });
    
    // Update heat if it was law enforcement with warning
    if (enemy.faction === 'corporations' || enemy.faction === 'military') {
      heatSystem.applyHeat('assault', 1.5);
      
      // Show heat warning for attacking law enforcement
      const newWantedLevel = heatSystem.wantedLevel;
      if (newWantedLevel > 0) {
        toast.warning(`🚨 Heat level rising! (Level ${newWantedLevel})`, {
          description: 'Attacking law enforcement has consequences',
          duration: 4000
        });
      }
    }
    
    // TODO: Drop loot items when inventory system is ready
    if (enemy.lootTable && enemy.lootTable.length > 0) {
      const lootChance = 0.3;
      if (Math.random() < lootChance) {
        const loot = enemy.lootTable[Math.floor(Math.random() * enemy.lootTable.length)];
        console.log(`[Enemies] Enemy dropped: ${loot}`);
        // TODO: Add to inventory when system is ready
      }
    }
    
    console.log(`[Enemies] Rewards processed: ${enemy.creditReward} credits`);
  }
}));