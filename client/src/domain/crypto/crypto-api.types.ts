export interface CryptoTransaction {
  id: string;
  type: 'mining_reward' | 'transfer' | 'purchase' | 'sale';
  amount: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  memo?: string;
}

export interface CryptoMarketPrice {
  currency: string;
  price: number;
  change24h: number;
  lastUpdated: number;
}
