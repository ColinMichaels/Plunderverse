// Economy Domain
export { useCreditsStore } from './economy/credits.store';
export { useInventoryStore } from './economy/inventory.store';
export { economyService } from './economy/economy.service';
export { useEconomySelectors, useTotalInventoryValue, useStorageInfo, useCanAfford } from './economy/selectors';
export { economyEvents } from './economy/events';
export type * from './economy/types';

// Equipment Domain  
export { useEquipmentStore } from './equipment/equipment.store';
export { equipmentService } from './equipment/equipment.service';
export type * from './equipment/types';

// Mining Domain
export { useMiningStore } from './mining/mining.store';
export { miningService } from './mining/mining.service';
export type * from './mining/types';