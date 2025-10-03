// Legacy store exports for backward compatibility during transition
// These will gradually be deprecated in favor of domain-based stores

// Space stores
export { useSolarSystem } from './space/useSolarSystem';
export { useAsteroids } from './space/useAsteroids';

// Navigation stores
export { useAutopilot } from './navigation/useAutopilot';

// Surface stores
export { useLandedState } from './surface/useLandedState';
export { useLandingWarning } from './surface/useLandingWarning';
export { useFlashlight } from './surface/useFlashlight';
export { useSurfaceCollision } from './surface/useSurfaceCollision';
export { useDestroyedNodes } from './surface/useDestroyedNodes';
export { useTerrain } from './surface/useTerrain';
export { useSurfaceLighting } from './surface/useSurfaceLighting';
export { useSurfacePlayer } from './surface/useSurfacePlayer';
export { useWind } from './surface/useWind';

// Combat stores
export { useShooting } from './combat/useShooting';

// Economy stores
export { useInventory } from './economy/useInventory';
export { useCredits } from './economy/useCredits';
export { useMining } from './economy/useMining';
export { useCrypto } from './economy/useCrypto';
export { useMissions } from './economy/useMissions';

// Objective Trigger system
export { useObjectiveTriggers } from './economy/useObjectiveTriggers';
export { useLocationTrigger } from './economy/useLocationTrigger';
export { useCollectionTrigger } from './economy/useCollectionTrigger';
export { useCombatTrigger } from './economy/useCombatTrigger';

// Ship stores
export { useShipStatus } from './ship/useShipStatus';
export { useEquipment } from './ship/useEquipment';
export { useUpgrades } from './ship/useUpgrades';

// Player stores
export { usePlayer } from './player/usePlayer';

// UI stores
export { useGame } from './ui/useGame';
export { useSettings } from './ui/useSettings';
export { useHints } from './ui/useHints';
export { useMusicPlayer } from './ui/useMusicPlayer';
export { useAudio } from './ui/useAudio';
export { useRewards } from './ui/useRewards';

// Debug stores
export { useDebugTools } from './debug/useDebugTools';

// Re-export new domain stores (preferred for new code)
export { useCreditsStore } from '../../domain/economy/credits.store';
export { useInventoryStore } from '../../domain/economy/inventory.store';
export { economyService } from '../../domain/economy/economy.service';

// Re-export domain selectors for easier access
export { 
  useEconomySelectors, 
  useTotalInventoryValue, 
  useStorageInfo, 
  useCanAfford,
  useCreditsData,
  useInventoryDisplayData 
} from '../../domain/economy/selectors';

// Re-export domain events
export { economyEvents } from '../../domain/economy/events';

// Equipment and Mining stores - these would be implemented next
// export { useEquipmentStore } from '../domain/equipment/equipment.store';
// export { equipmentService } from '../domain/equipment/equipment.service';
// export { useMiningStore } from '../domain/mining/mining.store';
// export { miningService } from '../domain/mining/mining.service';