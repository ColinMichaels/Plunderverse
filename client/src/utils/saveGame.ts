// Save Game State Serialization Helper
// Collects and restores state from all Zustand stores

import * as THREE from 'three';
import { usePlayer } from '../lib/stores/player/usePlayer';
import { useShipStatus } from '../lib/stores/ship/useShipStatus';
import { useEquipment } from '../lib/stores/ship/useEquipment';
import { useUpgrades } from '../lib/stores/ship/useUpgrades';
import { useCrewManagement } from '../lib/stores/ship/useCrewManagement';
import { useCreditsStore } from '../domain/economy/credits.store';
import { useInventoryStore } from '../domain/economy/inventory.store';
import { usePlunderverseEconomy } from '../lib/stores/economy/usePlunderverseEconomy';
import { usePlunderverseMissions } from '../lib/stores/economy/usePlunderverseMissions';
import { useTradeHistory } from '../lib/stores/economy/useTradeHistory';
import { useCrypto } from '../lib/stores/economy/useCrypto';
import { useSolarSystem } from '../lib/stores/space/useSolarSystem';
import { useDestroyedNodes } from '../lib/stores/surface/useDestroyedNodes';
import { useHeatSystem } from '../lib/stores/player/useHeatSystem';
import { useLandedState } from '../lib/stores/surface/useLandedState';
import { useRewards } from '../lib/stores/ui/useRewards';
import { useSettings } from '../lib/stores/ui/useSettings';
import { useGame } from '../lib/stores/ui/useGame';
import { gameApi, GameStateData } from '../services/gameApi';

// Save format version for compatibility checking
const SAVE_FORMAT_VERSION = '1.0.0';

// Helper to calculate play time
function calculatePlayTime(): number {
  // Get from solar system store if it tracks time
  const solarSystem = useSolarSystem.getState();
  // Use accumulatedTime which is already in seconds
  return Math.floor(solarSystem.accumulatedTime || 0);
}

// Helper to get current location
function getCurrentLocation(): string {
  const solarSystem = useSolarSystem.getState();
  return solarSystem.selectedPlanet || 'Space';
}

// Collect all game state from stores
export function collectGameState(): GameStateData {
  const player = usePlayer.getState();
  const shipStatus = useShipStatus.getState();
  const equipment = useEquipment.getState();
  const upgrades = useUpgrades.getState();
  const crew = useCrewManagement.getState();
  const credits = useCreditsStore.getState();
  const inventory = useInventoryStore.getState();
  const plunderverseEconomy = usePlunderverseEconomy.getState();
  const plunderverseMissions = usePlunderverseMissions.getState();
  const tradeHistory = useTradeHistory.getState();
  const crypto = useCrypto.getState();
  const solarSystem = useSolarSystem.getState();
  const destroyedNodes = useDestroyedNodes.getState();
  const heat = useHeatSystem.getState();
  const rewards = useRewards.getState();
  const settings = useSettings.getState();
  const landedState = useLandedState.getState();
  
  const playTime = calculatePlayTime();
  const location = getCurrentLocation();
  
  // Build the game state object
  const gameState: GameStateData = {
    version: SAVE_FORMAT_VERSION,
    timestamp: Date.now(),
    playTime: playTime || 0,
    credits: credits.credits || 1000,  // Default to 1000 if undefined
    location,
    shipStatus: {
      hull: shipStatus.hull || 100,
      shield: shipStatus.shield || 100,
      fuel: equipment.equipment.find(e => e.type === 'fuel')?.currentDurability || 100,
    },
    stores: {
      // Player stores - exclude functions
      player: {
        health: player.health,
        age: player.age,
        experience: player.experience,
        skillPoints: player.skillPoints,
        oxygenLevel: player.oxygenLevel,
        oxygenPercentage: player.oxygenPercentage,
        suit: player.suit,
        radiationLevel: player.radiationLevel,
        temperature: player.temperature,
        points: player.points,
        level: player.level,
        planetsVisited: player.planetsVisited,
        totalMiningOperations: player.totalMiningOperations,
        totalJumps: player.totalJumps,
        timeInSpace: player.timeInSpace,
        rank: player.rank,
        rankTitle: player.rankTitle,
        notoriety: player.notoriety,
        heat: player.heat,
        reputation: player.reputation,
        isAlive: player.isAlive,
        needsMedicalAttention: player.needsMedicalAttention,
        suitStatus: player.suitStatus,
      },
      
      // Credits
      credits: {
        credits: credits.credits || 1000,
      },
      
      // Inventory
      inventory: {
        items: inventory.items,
        capacity: inventory.capacity,
        used: inventory.used,
      },
      
      // Ship stores
      shipStatus: {
        shield: shipStatus.shield,
        hull: shipStatus.hull,
        isDestroyed: shipStatus.isDestroyed,
        isCritical: shipStatus.isCritical,
        isThrusting: shipStatus.isThrusting,
        isWarpMode: shipStatus.isWarpMode,
        lastDamageSource: shipStatus.lastDamageSource,
        upgrades: shipStatus.upgrades,
      },
      
      equipment: {
        equipment: equipment.equipment,
      },
      
      upgrades: {
        catalog: upgrades.catalog,
        ownedUpgrades: upgrades.ownedUpgrades,
        equippedUpgrades: upgrades.equippedUpgrades,
      },
      
      crew: {
        crewMembers: crew.crewMembers,
        maxCrewSize: crew.maxCrewSize,
        totalWages: crew.totalWages,
        loyaltyModifier: crew.loyaltyModifier,
      },
      
      // Economy stores
      plunderverseEconomy: {
        tuning: plunderverseEconomy.tuning,
        currentSeed: plunderverseEconomy.currentSeed,
        priceModifiers: Array.from(plunderverseEconomy.priceModifiers.entries()),
        demandModifiers: Array.from(plunderverseEconomy.demandModifiers.entries()),
        factionEconomies: Array.from(plunderverseEconomy.factionEconomies.entries()),
        heatDecayInterval: plunderverseEconomy.heatDecayInterval,
      },
      
      plunderverseMissions: {
        availableMissions: plunderverseMissions.availableMissions,
        activeMissions: plunderverseMissions.activeMissions,
        completedMissionIds: Array.from(plunderverseMissions.completedMissionIds),
        failedMissionIds: Array.from(plunderverseMissions.failedMissionIds),
        currentMissionId: plunderverseMissions.currentMissionId,
        currentObjectiveProgress: Array.from(plunderverseMissions.currentObjectiveProgress.entries()).map(
          ([missionId, objectives]) => ({
            missionId,
            objectives: Array.from(objectives.entries()),
          })
        ),
        lastGenerationTimestamp: plunderverseMissions.lastGenerationTimestamp,
        generationSeed: plunderverseMissions.generationSeed,
      },
      
      tradeHistory: {
        history: tradeHistory.history,
        analytics: tradeHistory.analytics,
      },
      
      crypto: crypto.isInitialized ? {
        isInitialized: crypto.isInitialized,
        walletAddress: crypto.walletAddress,
        balance: crypto.balance,
        currency: crypto.currency,
        marketPrice: crypto.marketPrice,
        transactions: crypto.transactions,
      } : undefined,
      
      // World state
      solarSystem: {
        accumulatedTime: solarSystem.accumulatedTime,
        universeStartTime: solarSystem.universeStartTime,
        timeScale: solarSystem.timeScale,
        selectedPlanet: solarSystem.selectedPlanet,
        shipPosition: {
          x: solarSystem.shipPosition.x,
          y: solarSystem.shipPosition.y,
          z: solarSystem.shipPosition.z,
        },
        shipRotation: {
          x: solarSystem.shipRotation.x,
          y: solarSystem.shipRotation.y,
          z: solarSystem.shipRotation.z,
        },
        shipVelocity: {
          x: solarSystem.shipVelocity.x,
          y: solarSystem.shipVelocity.y,
          z: solarSystem.shipVelocity.z,
        },
      },
      
      // Scene state (landed vs space)
      landedState: {
        isLanded: landedState.isLanded,
      },
      
      destroyedNodes: {
        destroyedNodeIds: destroyedNodes.destroyedNodeIds,
      },
      
      heat: {
        currentHeat: heat.currentHeat,
        wantedLevel: heat.wantedLevel,
        lastActionTimestamp: heat.lastActionTimestamp,
        decayRate: heat.decayRate,
        heatEvents: heat.heatEvents,
        totalBribesSpent: heat.totalBribesSpent,
        encounterHistory: heat.encounterHistory,
      },
      
      rewards: {
        landingRewards: rewards.landingRewards,
        visitedPlanets: rewards.visitedPlanets,
      },
      
      // Settings
      settings: {
        sensitivity: settings.sensitivity,
        invertY: settings.invertY,
        keybinds: settings.keybinds,
        graphicsQuality: settings.graphicsQuality,
        enableDynamicLights: settings.enableDynamicLights,
        enableParticles: settings.enableParticles,
        enableBloom: settings.enableBloom,
        miningEffectsIntensity: settings.miningEffectsIntensity,
        enableScreenShake: settings.enableScreenShake,
        enableVisualEffects: settings.enableVisualEffects,
      },
    },
    metadata: {
      saveName: `${location} - Day ${Math.floor(playTime / 86400)}`,
      playerLevel: player.level,
      rank: player.rankTitle,
      reputation: player.reputation,
    },
  };
  
  return gameState;
}

// Restore game state to all stores
export function restoreGameState(gameState: GameStateData | any): void {
  // Handle both full GameStateData and just the stores object
  const stores = gameState.stores || gameState;
  
  // Validate version compatibility only if version is present
  if (gameState.version && !isVersionCompatible(gameState.version)) {
    console.warn(`Save version ${gameState.version} may not be fully compatible with current version ${SAVE_FORMAT_VERSION}`);
  }
  
  // Restore player state
  if (stores.player) {
    const playerState = usePlayer.getState();
    Object.assign(playerState, stores.player);
  }
  
  // Restore credits
  if (stores.credits) {
    const creditsState = useCreditsStore.getState();
    creditsState.setCredits(stores.credits.credits || 1000);
  }
  
  // Restore inventory
  if (stores.inventory) {
    const inventoryState = useInventoryStore.getState();
    inventoryState.items = stores.inventory.items || [];
    inventoryState.capacity = stores.inventory.capacity || 100;
    inventoryState.used = stores.inventory.used || 0;
  }
  
  // Restore ship status
  if (stores.shipStatus) {
    const shipState = useShipStatus.getState();
    Object.assign(shipState, stores.shipStatus);
  }
  
  // Restore equipment
  if (stores.equipment) {
    const equipmentState = useEquipment.getState();
    equipmentState.equipment = stores.equipment.equipment || [];
  }
  
  // Restore upgrades
  if (stores.upgrades) {
    const upgradesState = useUpgrades.getState();
    upgradesState.catalog = stores.upgrades.catalog || [];
    upgradesState.ownedUpgrades = stores.upgrades.ownedUpgrades || [];
    upgradesState.equippedUpgrades = stores.upgrades.equippedUpgrades || [];
  }
  
  // Restore crew
  if (stores.crew) {
    const crewState = useCrewManagement.getState();
    crewState.crewMembers = stores.crew.crewMembers || [];
    crewState.maxCrewSize = stores.crew.maxCrewSize || 4;
    crewState.totalWages = stores.crew.totalWages || 0;
    crewState.loyaltyModifier = stores.crew.loyaltyModifier || 0;
  }
  
  // Restore economy
  if (stores.plunderverseEconomy) {
    const economyState = usePlunderverseEconomy.getState();
    economyState.tuning = stores.plunderverseEconomy.tuning;
    economyState.currentSeed = stores.plunderverseEconomy.currentSeed || '';
    
    // Safely restore Maps - handle both array and object formats
    try {
      economyState.priceModifiers = Array.isArray(stores.plunderverseEconomy.priceModifiers) 
        ? new Map(stores.plunderverseEconomy.priceModifiers) 
        : new Map();
      economyState.demandModifiers = Array.isArray(stores.plunderverseEconomy.demandModifiers)
        ? new Map(stores.plunderverseEconomy.demandModifiers)
        : new Map();
      economyState.factionEconomies = Array.isArray(stores.plunderverseEconomy.factionEconomies)
        ? new Map(stores.plunderverseEconomy.factionEconomies)
        : new Map();
    } catch (error) {
      console.warn('[SaveGame] Failed to restore economy maps, using defaults:', error);
      economyState.priceModifiers = new Map();
      economyState.demandModifiers = new Map();
      economyState.factionEconomies = new Map();
    }
    
    economyState.heatDecayInterval = stores.plunderverseEconomy.heatDecayInterval || 60000;
  }
  
  // Restore missions
  if (stores.plunderverseMissions) {
    const missionsState = usePlunderverseMissions.getState();
    missionsState.availableMissions = stores.plunderverseMissions.availableMissions || [];
    missionsState.activeMissions = stores.plunderverseMissions.activeMissions || [];
    missionsState.missions = stores.plunderverseMissions.missions || [];
    missionsState.failedMissions = stores.plunderverseMissions.failedMissions || 0;
    missionsState.maxActiveMissions = stores.plunderverseMissions.maxActiveMissions || 3;
    
    // Safely restore Sets
    try {
      missionsState.completedMissionIds = Array.isArray(stores.plunderverseMissions.completedMissionIds)
        ? new Set(stores.plunderverseMissions.completedMissionIds)
        : new Set();
      missionsState.failedMissionIds = Array.isArray(stores.plunderverseMissions.failedMissionIds)
        ? new Set(stores.plunderverseMissions.failedMissionIds)
        : new Set();
    } catch (error) {
      console.warn('[SaveGame] Failed to restore mission sets, using defaults:', error);
      missionsState.completedMissionIds = new Set();
      missionsState.failedMissionIds = new Set();
    }
    
    missionsState.currentMissionId = stores.plunderverseMissions.currentMissionId;
    
    // Restore objective progress
    const progressMap = new Map<string, Map<string, number>>();
    try {
      if (Array.isArray(stores.plunderverseMissions.currentObjectiveProgress)) {
        stores.plunderverseMissions.currentObjectiveProgress.forEach((entry: any) => {
          if (entry && entry.missionId && Array.isArray(entry.objectives)) {
            progressMap.set(entry.missionId, new Map(entry.objectives));
          }
        });
      }
    } catch (error) {
      console.warn('[SaveGame] Failed to restore objective progress:', error);
    }
    missionsState.currentObjectiveProgress = progressMap;
    
    missionsState.lastGenerationTimestamp = stores.plunderverseMissions.lastGenerationTimestamp || 0;
    missionsState.generationSeed = stores.plunderverseMissions.generationSeed || '';
  }
  
  // Restore trade history
  if (stores.tradeHistory) {
    const tradeState = useTradeHistory.getState();
    tradeState.history = stores.tradeHistory.history || [];
    tradeState.analytics = stores.tradeHistory.analytics || {
      totalTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      bestTrade: null,
      worstTrade: null,
      averageProfit: 0,
      profitableTradesCount: 0,
      unprofitableTradesCount: 0,
    };
  }
  
  // Restore crypto (if initialized)
  if (stores.crypto && stores.crypto.isInitialized) {
    const cryptoState = useCrypto.getState();
    cryptoState.isInitialized = stores.crypto.isInitialized;
    cryptoState.walletAddress = stores.crypto.walletAddress;
    cryptoState.balance = stores.crypto.balance || 0;
    cryptoState.currency = stores.crypto.currency || 'SPACE';
    cryptoState.marketPrice = stores.crypto.marketPrice;
    cryptoState.transactions = stores.crypto.transactions || [];
  }
  
  // Restore solar system
  if (stores.solarSystem) {
    const solarState = useSolarSystem.getState();
    // Restore accumulated time and universe start time directly
    if (stores.solarSystem.accumulatedTime !== undefined) {
      Object.assign(solarState, { accumulatedTime: stores.solarSystem.accumulatedTime });
    }
    if (stores.solarSystem.universeStartTime !== undefined) {
      Object.assign(solarState, { universeStartTime: stores.solarSystem.universeStartTime });
    }
    if (stores.solarSystem.timeScale !== undefined) {
      Object.assign(solarState, { timeScale: stores.solarSystem.timeScale });
    }
    if (stores.solarSystem.selectedPlanet !== undefined) {
      solarState.setSelectedPlanet(stores.solarSystem.selectedPlanet);
    }
    
    // Restore ship position, rotation, and velocity
    if (stores.solarSystem.shipPosition) {
      const pos = stores.solarSystem.shipPosition;
      solarState.setShipPosition(new THREE.Vector3(pos.x, pos.y, pos.z));
    }
    if (stores.solarSystem.shipRotation) {
      const rot = stores.solarSystem.shipRotation;
      solarState.setShipRotation(new THREE.Euler(rot.x, rot.y, rot.z));
    }
    if (stores.solarSystem.shipVelocity) {
      const vel = stores.solarSystem.shipVelocity;
      solarState.setShipVelocity(new THREE.Vector3(vel.x, vel.y, vel.z));
    }
    
    // Mark that we've restored saved state
    solarState.setHasRestoredState(true);
  }
  
  // Restore landed state
  if (stores.landedState) {
    const landedState = useLandedState.getState();
    if (stores.landedState.isLanded !== undefined) {
      landedState.isLanded = stores.landedState.isLanded;
    }
  }
  
  // Restore destroyed nodes
  if (stores.destroyedNodes) {
    const destroyedState = useDestroyedNodes.getState();
    const nodeIds = stores.destroyedNodes.destroyedNodeIds;
    destroyedState.destroyedNodeIds = new Set(Array.isArray(nodeIds) ? nodeIds : []);
  }
  
  // Restore heat system
  if (stores.heat) {
    const heatState = useHeatSystem.getState();
    heatState.currentHeat = stores.heat.currentHeat || 0;
    heatState.wantedLevel = stores.heat.wantedLevel || 0;
    heatState.lastActionTimestamp = stores.heat.lastActionTimestamp || Date.now();
    heatState.decayRate = stores.heat.decayRate || 0.1;
    heatState.heatEvents = stores.heat.heatEvents || [];
    heatState.totalBribesSpent = stores.heat.totalBribesSpent || 0;
    heatState.encounterHistory = stores.heat.encounterHistory || [];
  }
  
  // Restore rewards
  if (stores.rewards) {
    const rewardsState = useRewards.getState();
    rewardsState.landingRewards = stores.rewards.landingRewards || {};
    const visited = stores.rewards.visitedPlanets;
    rewardsState.visitedPlanets = new Set(Array.isArray(visited) ? visited : []);
  }
  
  // Restore settings
  if (stores.settings) {
    const settingsState = useSettings.getState();
    Object.assign(settingsState, stores.settings);
  }
  
  console.log('Game state restored successfully');
  
  // Transition game phase back to playing after restore
  const gamePhase = useGame.getState();
  gamePhase.start();
  console.log('[SAVE-LOAD] Game phase transitioned to playing after restore');
}

// Check version compatibility
function isVersionCompatible(version: string): boolean {
  const [major] = version.split('.');
  const [currentMajor] = SAVE_FORMAT_VERSION.split('.');
  return major === currentMajor;
}

// Save game to server
export async function saveGame(slot: number): Promise<void> {
  try {
    const gameState = collectGameState();
    await gameApi.saveGame(slot, gameState);
    console.log(`Game saved to slot ${slot}`);
  } catch (error) {
    console.error('Failed to save game:', error);
    throw error;
  }
}

// Load game from server
export async function loadGame(slot: number): Promise<void> {
  try {
    const gameState = await gameApi.loadGame(slot);
    restoreGameState(gameState);
    console.log(`Game loaded from slot ${slot}`);
  } catch (error) {
    console.error('Failed to load game:', error);
    throw error;
  }
}

// Quick save
export async function quickSave(): Promise<void> {
  try {
    const gameState = collectGameState();
    await gameApi.quickSave(gameState);
    console.log('Game quick saved');
  } catch (error) {
    console.error('Failed to quick save:', error);
    throw error;
  }
}

// Quick load
export async function quickLoad(): Promise<void> {
  try {
    const gameState = await gameApi.quickLoad();
    if (gameState) {
      restoreGameState(gameState);
      console.log('Game quick loaded');
    } else {
      console.log('No saves found');
      throw new Error('No saves found');
    }
  } catch (error) {
    console.error('Failed to quick load:', error);
    throw error;
  }
}

// Export save
export async function exportSave(slot: number): Promise<void> {
  try {
    await gameApi.exportSave(slot);
    console.log(`Game exported from slot ${slot}`);
  } catch (error) {
    console.error('Failed to export save:', error);
    throw error;
  }
}

// Import save
export async function importSave(slot: number, file: File): Promise<void> {
  try {
    await gameApi.importSaveFromFile(slot, file);
    console.log(`Game imported to slot ${slot}`);
  } catch (error) {
    console.error('Failed to import save:', error);
    throw error;
  }
}