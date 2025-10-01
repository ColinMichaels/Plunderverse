// Economy Domain
export { useCreditsStore } from './economy/credits.store';
export { useInventoryStore } from './economy/inventory.store';
export { economyService } from './economy/economy.service';
export { 
  useEconomySelectors, 
  useTotalInventoryValue, 
  useStorageInfo, 
  useCanAfford,
  useCreditsData,
  useInventoryDisplayData 
} from './economy/selectors';
export { economyEvents } from './economy/events';
export { migrationHelpers } from './economy/compatibility';
export type * from './economy/types';