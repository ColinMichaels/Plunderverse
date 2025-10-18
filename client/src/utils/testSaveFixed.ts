// Test save with fixed values
import { gameApi } from '../services/gameApi';

export async function testFixedSave() {
  console.log('Testing save with fixed values...');
  
  // Create a test game state with all required fields
  const testGameState = {
    version: '1.0.0',
    timestamp: Date.now(),
    playTime: 100, // Fixed number
    credits: 1500, // Fixed number
    location: 'Earth',
    shipStatus: {
      hull: 100,
      shield: 100,
      fuel: 100,
    },
    stores: {
      player: {
        health: 100,
        age: 30,
        experience: 0,
        skillPoints: 0,
        oxygenLevel: 100,
        oxygenPercentage: 100,
        suit: 'standard',
        radiationLevel: 0,
        temperature: 20,
        points: 0,
        level: 1,
        planetsVisited: 1,
        totalMiningOperations: 0,
        totalJumps: 0,
        timeInSpace: 0,
        rank: 1,
        rankTitle: 'Rookie',
        notoriety: 0,
        heat: 0,
        reputation: {
          corporations: 50,
          independents: 50,
          outlaws: 50,
        },
        isAlive: true,
        needsMedicalAttention: false,
        suitStatus: 'operational',
      },
      credits: {
        balance: 1500,
        totalEarned: 1500,
        totalSpent: 0,
      },
      inventory: {
        items: [],
        capacity: 100,
        used: 0,
      },
      shipStatus: {
        shield: 100,
        hull: 100,
        isDestroyed: false,
        isCritical: false,
        isThrusting: false,
        isWarpMode: false,
        lastDamageSource: null,
        upgrades: {},
      },
      equipment: {
        equipment: [],
      },
      upgrades: {
        availableUpgrades: [],
        purchasedUpgrades: [],
      },
      crew: {
        crewMembers: [],
        maxCrew: 8,
      },
      plunderverseEconomy: {},
      plunderverseMissions: {
        availableMissions: [],
        acceptedMissions: [],
        completedMissions: [],
        completedMissionIds: [],
        acceptedMissionIds: [],
        rewardPoints: 0,
      },
      tradeHistory: {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalTransactions: 0,
        transactions: [],
      },
      crypto: {
        isInitialized: false,
      },
      solarSystem: {
        selectedPlanet: 'Earth',
        elapsedTime: 100000,
      },
      destroyedNodes: {
        nodes: [],
      },
      heat: {
        wantedLevel: 0,
        heat: 0,
      },
      rewards: {
        pendingRewards: [],
        claimedRewards: [],
      },
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        volume: 1,
        quality: 'high',
      },
    },
  };
  
  try {
    const result = await gameApi.saveGame(1, testGameState);
    console.log('Save successful!', result);
    return result;
  } catch (error) {
    console.error('Save failed:', error);
    throw error;
  }
}

// Make it available on window
(window as any).testFixedSave = testFixedSave;

console.log('Test fixed save ready. Run testFixedSave() in console to test.');