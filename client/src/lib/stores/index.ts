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

// Re-export new domain stores (optional, for those who want to use them directly)
// Temporarily commented out until full migration is complete
// export { useCreditsStore } from '../domain/economy/credits.store';
// export { useInventoryStore } from '../domain/economy/inventory.store';
// export { economyService } from '../domain/economy/economy.service';
// export { useEquipmentStore } from '../domain/equipment/equipment.store';
// export { equipmentService } from '../domain/equipment/equipment.service';
// export { useMiningStore } from '../domain/mining/mining.store';
// export { miningService } from '../domain/mining/mining.service';