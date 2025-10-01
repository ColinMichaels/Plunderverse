// Legacy store exports for backward compatibility during transition
// These will gradually be deprecated in favor of domain-based stores

// Re-export existing stores
export { useAudio } from './useAudio';
export { useGame } from './useGame';
export { usePlayer } from './usePlayer';
export { useSolarSystem } from './useSolarSystem';
export { useShipStatus } from './useShipStatus';
export { useLandedState } from './useLandedState';
export { useAutopilot } from './useAutopilot';
export { useShooting } from './useShooting';
export { useAsteroids } from './useAsteroids';
export { useFlashlight } from './useFlashlight';
export { useLandingWarning } from './useLandingWarning';
export { useMissions } from './useMissions';
export { useRewards } from './useRewards';
export { useMusicPlayer } from './useMusicPlayer';
export { useSettings } from './useSettings';

// Legacy exports that map to new domain stores for backward compatibility
export { useCredits } from './useCredits';
export { useInventory } from './useInventory';
export { useEquipment } from './useEquipment';
export { useMining } from './useMining';

// Re-export new domain stores (preferred for new code)
export { useCreditsStore } from '../domain/economy/credits.store';
export { useInventoryStore } from '../domain/economy/inventory.store';
export { economyService } from '../domain/economy/economy.service';

// Re-export domain selectors for easier access
export { 
  useEconomySelectors, 
  useTotalInventoryValue, 
  useStorageInfo, 
  useCanAfford,
  useCreditsData,
  useInventoryDisplayData 
} from '../domain/economy/selectors';

// Re-export domain events
export { economyEvents } from '../domain/economy/events';

// Equipment and Mining stores - these would be implemented next
// export { useEquipmentStore } from '../domain/equipment/equipment.store';
// export { equipmentService } from '../domain/equipment/equipment.service';
// export { useMiningStore } from '../domain/mining/mining.store';
// export { miningService } from '../domain/mining/mining.service';