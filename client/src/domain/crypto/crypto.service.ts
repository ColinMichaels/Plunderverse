import { CryptoApiClient } from './crypto-api.client';
import { CryptoWallet, CryptoTransaction, CryptoMarketPrice, CryptoApiConfig } from './crypto-api.types';

/**
 * Cryptocurrency service that provides game-side interface to external crypto API
 * This is the main service that game stores will use for crypto operations
 */
export class CryptoService {
  private apiClient: CryptoApiClient | null = null;
  private isInitialized = false;
  private playerId: string | null = null;
  private wallet: CryptoWallet | null = null;

  async initialize(config: CryptoApiConfig, playerId: string): Promise<boolean> {
    console.log('[CRYPTO] Initializing cryptocurrency service...');
    
    try {
      this.apiClient = new CryptoApiClient(config);
      this.playerId = playerId;

      // Try to get existing wallet or create new one
      const walletResponse = await this.apiClient.getWalletByPlayerId(playerId);
      
      if (walletResponse.success && walletResponse.data) {
        this.wallet = walletResponse.data;
        console.log(`[CRYPTO] Existing wallet loaded: ${this.wallet.address}`);
      } else {
        // Create new wallet
        const createResponse = await this.apiClient.createWallet(playerId);
        if (createResponse.success && createResponse.data) {
          this.wallet = createResponse.data;
          console.log(`[CRYPTO] New wallet created: ${this.wallet.address}`);
        } else {
          console.error('[CRYPTO] Failed to create wallet:', createResponse.error);
          return false;
        }
      }

      this.isInitialized = true;
      console.log(`[CRYPTO] Service initialized successfully. Balance: ${this.wallet.balance} ${this.wallet.currency}`);
      return true;
    } catch (error) {
      console.error('[CRYPTO] Initialization failed:', error);
      return false;
    }
  }

  private checkInitialized(): boolean {
    if (!this.isInitialized || !this.apiClient || !this.wallet) {
      console.error('[CRYPTO] Service not initialized. Call initialize() first.');
      return false;
    }
    return true;
  }

  // Wallet operations
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  async getBalance(refresh = false): Promise<number> {
    if (!this.checkInitialized()) return 0;

    if (refresh && this.wallet) {
      const response = await this.apiClient!.getWallet(this.wallet.address);
      if (response.success && response.data) {
        this.wallet = response.data;
      }
    }

    return this.wallet?.balance || 0;
  }

  async getCurrency(): Promise<string> {
    return this.wallet?.currency || 'SPACE';
  }

  // Mining rewards
  async issueMiningReward(amount: number, resourceType: string, planetSource: string): Promise<boolean> {
    if (!this.checkInitialized()) return false;

    console.log(`[CRYPTO] Issuing mining reward: ${amount} for ${resourceType} from ${planetSource}`);

    const response = await this.apiClient!.issueMiningReward(
      this.wallet!.address,
      amount,
      resourceType,
      planetSource
    );

    if (response.success) {
      console.log(`[CRYPTO] Mining reward issued successfully: ${amount} ${this.wallet!.currency}`);
      // Refresh balance
      await this.getBalance(true);
      return true;
    } else {
      console.error('[CRYPTO] Mining reward failed:', response.error);
      return false;
    }
  }

  // Purchase operations
  async purchaseUpgrade(upgradeType: string, cost: number): Promise<boolean> {
    if (!this.checkInitialized()) return false;

    const currentBalance = await this.getBalance(true);
    if (currentBalance < cost) {
      console.log(`[CRYPTO] Insufficient funds for ${upgradeType}. Need: ${cost}, Have: ${currentBalance}`);
      return false;
    }

    console.log(`[CRYPTO] Purchasing ${upgradeType} for ${cost} ${this.wallet!.currency}`);

    const response = await this.apiClient!.purchaseUpgrade(
      this.wallet!.address,
      upgradeType,
      cost
    );

    if (response.success) {
      console.log(`[CRYPTO] Purchase successful: ${upgradeType}`);
      // Refresh balance
      await this.getBalance(true);
      return true;
    } else {
      console.error('[CRYPTO] Purchase failed:', response.error);
      return false;
    }
  }

  // Market operations
  async getMarketPrice(): Promise<CryptoMarketPrice | null> {
    if (!this.checkInitialized()) return null;

    const response = await this.apiClient!.getMarketPrice();
    if (response.success && response.data) {
      return response.data;
    } else {
      console.error('[CRYPTO] Failed to get market price:', response.error);
      return null;
    }
  }

  // Resource trading
  async sellResource(resourceType: string, quantity: number, pricePerUnit: number): Promise<boolean> {
    if (!this.checkInitialized()) return false;

    console.log(`[CRYPTO] Creating sell order: ${quantity}x ${resourceType} at ${pricePerUnit} each`);

    const response = await this.apiClient!.createTradeOrder({
      playerAddress: this.wallet!.address,
      orderType: 'sell',
      resourceType,
      quantity,
      pricePerUnit,
      currency: this.wallet!.currency
    });

    if (response.success) {
      console.log('[CRYPTO] Sell order created successfully');
      return true;
    } else {
      console.error('[CRYPTO] Sell order failed:', response.error);
      return false;
    }
  }

  async buyResource(resourceType: string, quantity: number, pricePerUnit: number): Promise<boolean> {
    if (!this.checkInitialized()) return false;

    const totalCost = quantity * pricePerUnit;
    const currentBalance = await this.getBalance(true);

    if (currentBalance < totalCost) {
      console.log(`[CRYPTO] Insufficient funds to buy ${quantity}x ${resourceType}. Need: ${totalCost}, Have: ${currentBalance}`);
      return false;
    }

    console.log(`[CRYPTO] Creating buy order: ${quantity}x ${resourceType} at ${pricePerUnit} each`);

    const response = await this.apiClient!.createTradeOrder({
      playerAddress: this.wallet!.address,
      orderType: 'buy',
      resourceType,
      quantity,
      pricePerUnit,
      currency: this.wallet!.currency
    });

    if (response.success) {
      console.log('[CRYPTO] Buy order created successfully');
      return true;
    } else {
      console.error('[CRYPTO] Buy order failed:', response.error);
      return false;
    }
  }

  // Transaction history
  async getTransactionHistory(): Promise<CryptoTransaction[]> {
    if (!this.checkInitialized()) return [];

    const response = await this.apiClient!.getTransactionHistory(this.wallet!.address);
    if (response.success && response.data) {
      return response.data;
    } else {
      console.error('[CRYPTO] Failed to get transaction history:', response.error);
      return [];
    }
  }

  // Player-to-player transfers
  async transferToPlayer(recipientAddress: string, amount: number, memo?: string): Promise<boolean> {
    if (!this.checkInitialized()) return false;

    const currentBalance = await this.getBalance(true);
    if (currentBalance < amount) {
      console.log(`[CRYPTO] Insufficient funds for transfer. Need: ${amount}, Have: ${currentBalance}`);
      return false;
    }

    console.log(`[CRYPTO] Transferring ${amount} ${this.wallet!.currency} to ${recipientAddress}`);

    const response = await this.apiClient!.sendTransaction(
      this.wallet!.address,
      recipientAddress,
      amount,
      {
        type: 'player_trade',
        details: { memo }
      }
    );

    if (response.success) {
      console.log('[CRYPTO] Transfer successful');
      // Refresh balance
      await this.getBalance(true);
      return true;
    } else {
      console.error('[CRYPTO] Transfer failed:', response.error);
      return false;
    }
  }
}

// Singleton instance for the game
export const cryptoService = new CryptoService();