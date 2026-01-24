import { CryptoTransaction, CryptoMarketPrice } from './crypto-api.types';

class CryptoService {
  private mockBalance = 0;
  private mockAddress = 'mock_wallet_address';

  async initializeWallet(playerId: string): Promise<{ address: string; balance: number }> {
    console.log('[CryptoService] Mock mode - wallet initialized for', playerId);
    return { address: this.mockAddress, balance: this.mockBalance };
  }

  async getBalance(): Promise<number> {
    return this.mockBalance;
  }

  async getMarketPrice(): Promise<CryptoMarketPrice> {
    return {
      currency: 'PLUNDER',
      price: 1.0,
      change24h: 0,
      lastUpdated: Date.now()
    };
  }

  async getTransactionHistory(): Promise<CryptoTransaction[]> {
    return [];
  }

  async transfer(recipientAddress: string, amount: number, memo?: string): Promise<{ success: boolean; txId?: string; error?: string }> {
    console.log('[CryptoService] Mock transfer:', { recipientAddress, amount, memo });
    return { success: true, txId: 'mock_tx_' + Date.now() };
  }

  async issueMiningReward(amount: number, resourceType: string, planetSource: string): Promise<{ success: boolean; txId?: string; error?: string }> {
    console.log('[CryptoService] Mock mining reward:', { amount, resourceType, planetSource });
    this.mockBalance += amount;
    return { success: true, txId: 'mock_mining_' + Date.now() };
  }

  async purchaseUpgrade(upgradeType: string, cost: number): Promise<{ success: boolean; txId?: string; error?: string }> {
    if (this.mockBalance < cost) {
      return { success: false, error: 'Insufficient balance' };
    }
    this.mockBalance -= cost;
    return { success: true, txId: 'mock_purchase_' + Date.now() };
  }

  async sellResource(resourceType: string, quantity: number, pricePerUnit: number): Promise<{ success: boolean; txId?: string; error?: string }> {
    const amount = quantity * pricePerUnit;
    this.mockBalance += amount;
    return { success: true, txId: 'mock_sale_' + Date.now() };
  }

  async buyResource(resourceType: string, quantity: number, pricePerUnit: number): Promise<{ success: boolean; txId?: string; error?: string }> {
    const cost = quantity * pricePerUnit;
    if (this.mockBalance < cost) {
      return { success: false, error: 'Insufficient balance' };
    }
    this.mockBalance -= cost;
    return { success: true, txId: 'mock_buy_' + Date.now() };
  }
}

export const cryptoService = new CryptoService();
