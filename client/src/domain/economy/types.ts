import { ResourceData } from '../../lib/planetData';

export interface InventoryItem extends ResourceData {
  quantity: number;
  planetSource: string;
}

export interface CreditsState {
  credits: number;
}

export interface InventoryState {
  items: InventoryItem[];
  storageCapacity: number;
}

export interface TransactionEvent {
  type: 'credits_earned' | 'credits_spent' | 'resource_added' | 'resource_removed';
  payload: {
    amount?: number;
    resource?: ResourceData;
    quantity?: number;
    planetSource?: string;
  };
  timestamp: number;
}

export interface EconomySelectors {
  totalInventoryValue: number;
  storageUsed: number;
  canAfford: (amount: number) => boolean;
  hasResource: (resourceType: string, quantity: number) => boolean;
}