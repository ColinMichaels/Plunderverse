import { CryptoTransaction, CryptoMarketPrice } from './crypto-api.types';

interface CryptoConfig {
  apiKey: string;
  baseUrl: string;
  network: 'testnet' | 'mainnet';
  currency: string;
}

class CryptoService {
  private isInitialized = false;
  private mockBalance = 100;
  private mockAddress = '';
  private currency = 'SPACE';
  private transactions: CryptoTransaction[] = [];

  async initialize(config: CryptoConfig, playerId: string): Promise<boolean> {
    console.log('[CryptoService] Mock mode - initializing for player:', playerId);
    this.mockAddress = `wallet_${playerId}_${Date.now()}`;
    this.currency = config.currency || 'SPACE';
    this.isInitialized = true;
    return true;
  }

  getWalletAddress(): string {
    return this.mockAddress;
  }

  getCurrency(): string {
    return this.currency;
  }

  async getBalance(force?: boolean): Promise<number> {
    if (force) {
      console.log('[CryptoService] Forcing balance refresh');
    }
    return this.mockBalance;
  }

  async getMarketPrice(): Promise<CryptoMarketPrice> {
    return {
      currency: this.currency,
      price: 1.0,
      change24h: 0,
      lastUpdated: Date.now()
    };
  }

  async getTransactionHistory(): Promise<CryptoTransaction[]> {
    return this.transactions;
  }

  async transferToPlayer(recipientAddress: string, amount: number, memo?: string): Promise<boolean> {
    console.log('[CryptoService] Mock transfer:', { recipientAddress, amount, memo });
    if (this.mockBalance < amount) {
      return false;
    }
    this.mockBalance -= amount;
    this.transactions.unshift({
      id: 'tx_' + Date.now(),
      type: 'transfer',
      amount: -amount,
      timestamp: Date.now(),
      status: 'completed',
      memo
    });
    return true;
  }

  async issueMiningReward(amount: number, resourceType: string, planetSource: string): Promise<boolean> {
    console.log('[CryptoService] Mock mining reward:', { amount, resourceType, planetSource });
    this.mockBalance += amount;
    this.transactions.unshift({
      id: 'mining_' + Date.now(),
      type: 'mining_reward',
      amount,
      timestamp: Date.now(),
      status: 'completed',
      memo: `Mined ${resourceType} from ${planetSource}`
    });
    return true;
  }

  async purchaseUpgrade(upgradeType: string, cost: number): Promise<boolean> {
    console.log('[CryptoService] Mock purchase:', { upgradeType, cost });
    if (this.mockBalance < cost) {
      return false;
    }
    this.mockBalance -= cost;
    this.transactions.unshift({
      id: 'purchase_' + Date.now(),
      type: 'purchase',
      amount: -cost,
      timestamp: Date.now(),
      status: 'completed',
      memo: `Purchased ${upgradeType}`
    });
    return true;
  }

  async sellResource(resourceType: string, quantity: number, pricePerUnit: number): Promise<boolean> {
    const amount = quantity * pricePerUnit;
    console.log('[CryptoService] Mock sell:', { resourceType, quantity, pricePerUnit, amount });
    this.mockBalance += amount;
    this.transactions.unshift({
      id: 'sale_' + Date.now(),
      type: 'sale',
      amount,
      timestamp: Date.now(),
      status: 'completed',
      memo: `Sold ${quantity}x ${resourceType}`
    });
    return true;
  }

  async buyResource(resourceType: string, quantity: number, pricePerUnit: number): Promise<boolean> {
    const cost = quantity * pricePerUnit;
    console.log('[CryptoService] Mock buy:', { resourceType, quantity, pricePerUnit, cost });
    if (this.mockBalance < cost) {
      return false;
    }
    this.mockBalance -= cost;
    this.transactions.unshift({
      id: 'buy_' + Date.now(),
      type: 'purchase',
      amount: -cost,
      timestamp: Date.now(),
      status: 'completed',
      memo: `Bought ${quantity}x ${resourceType}`
    });
    return true;
  }
}

export const cryptoService = new CryptoService();
