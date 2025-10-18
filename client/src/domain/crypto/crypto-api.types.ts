// Types for the cryptocurrency API interface

export interface CryptoWallet {
  address: string;
  balance: number;
  currency: string; // e.g., 'SPACE' or 'ETH'
  network: string; // e.g., 'testnet' or 'mainnet'
}

export interface CryptoTransaction {
  id: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasPrice?: number;
  transactionHash?: string;
  blockNumber?: number;
  gameContext?: {
    type: 'mining_reward' | 'resource_sale' | 'upgrade_purchase' | 'player_trade';
    details: Record<string, any>;
  };
}

export interface CryptoMarketPrice {
  currency: string;
  priceInUSD: number;
  priceInETH?: number;
  lastUpdated: number;
  change24h: number;
}

export interface CryptoTradeOrder {
  id: string;
  playerAddress: string;
  orderType: 'buy' | 'sell';
  resourceType: string;
  quantity: number;
  pricePerUnit: number;
  currency: string;
  status: 'open' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt?: number;
}

export interface CryptoApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface CryptoApiConfig {
  apiKey: string;
  baseUrl: string;
  network: 'testnet' | 'mainnet';
  currency: string;
}