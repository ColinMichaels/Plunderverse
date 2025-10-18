import { 
  CryptoWallet, 
  CryptoTransaction, 
  CryptoMarketPrice, 
  CryptoTradeOrder, 
  CryptoApiResponse, 
  CryptoApiConfig 
} from './crypto-api.types';

/**
 * Cryptocurrency API client for external service communication
 * This handles all HTTP requests to the external crypto service
 */
export class CryptoApiClient {
  private config: CryptoApiConfig;

  constructor(config: CryptoApiConfig) {
    this.config = config;
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<CryptoApiResponse<T>> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          // Note: No API key in headers - server proxy handles authentication
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: data.message || 'Request failed',
            details: data
          },
          timestamp: Date.now()
        };
      }

      return {
        success: true,
        data,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[CRYPTO-API] Request failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown network error',
          details: error
        },
        timestamp: Date.now()
      };
    }
  }

  // Wallet operations
  async createWallet(playerId: string): Promise<CryptoApiResponse<CryptoWallet>> {
    return this.makeRequest<CryptoWallet>('/wallets', 'POST', {
      playerId,
      currency: this.config.currency,
      network: this.config.network
    });
  }

  async getWallet(address: string): Promise<CryptoApiResponse<CryptoWallet>> {
    return this.makeRequest<CryptoWallet>(`/wallets/${address}`);
  }

  async getWalletByPlayerId(playerId: string): Promise<CryptoApiResponse<CryptoWallet>> {
    return this.makeRequest<CryptoWallet>(`/wallets/player/${playerId}`);
  }

  // Transaction operations
  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    gameContext?: any
  ): Promise<CryptoApiResponse<CryptoTransaction>> {
    return this.makeRequest<CryptoTransaction>('/transactions', 'POST', {
      fromAddress,
      toAddress,
      amount,
      currency: this.config.currency,
      gameContext
    });
  }

  async getTransaction(transactionId: string): Promise<CryptoApiResponse<CryptoTransaction>> {
    return this.makeRequest<CryptoTransaction>(`/transactions/${transactionId}`);
  }

  async getTransactionHistory(address: string): Promise<CryptoApiResponse<CryptoTransaction[]>> {
    return this.makeRequest<CryptoTransaction[]>(`/transactions/history/${address}`);
  }

  // Mining rewards
  async issueMiningReward(
    address: string,
    amount: number,
    resourceType: string,
    planetSource: string
  ): Promise<CryptoApiResponse<CryptoTransaction>> {
    return this.makeRequest<CryptoTransaction>('/rewards/mining', 'POST', {
      address,
      amount,
      currency: this.config.currency,
      gameContext: {
        type: 'mining_reward',
        details: { resourceType, planetSource }
      }
    });
  }

  // Market operations
  async getMarketPrice(currency?: string): Promise<CryptoApiResponse<CryptoMarketPrice>> {
    const targetCurrency = currency || this.config.currency;
    return this.makeRequest<CryptoMarketPrice>(`/market/price/${targetCurrency}`);
  }

  // Trading operations
  async createTradeOrder(order: Omit<CryptoTradeOrder, 'id' | 'status' | 'createdAt'>): Promise<CryptoApiResponse<CryptoTradeOrder>> {
    return this.makeRequest<CryptoTradeOrder>('/trading/orders', 'POST', {
      ...order,
      currency: this.config.currency
    });
  }

  async getTradeOrders(address?: string): Promise<CryptoApiResponse<CryptoTradeOrder[]>> {
    const endpoint = address ? `/trading/orders/${address}` : '/trading/orders';
    return this.makeRequest<CryptoTradeOrder[]>(endpoint);
  }

  async cancelTradeOrder(orderId: string): Promise<CryptoApiResponse<boolean>> {
    return this.makeRequest<boolean>(`/trading/orders/${orderId}`, 'DELETE');
  }

  // Purchase operations
  async purchaseUpgrade(
    address: string,
    upgradeType: string,
    cost: number
  ): Promise<CryptoApiResponse<CryptoTransaction>> {
    return this.makeRequest<CryptoTransaction>('/purchases/upgrades', 'POST', {
      address,
      upgradeType,
      cost,
      currency: this.config.currency,
      gameContext: {
        type: 'upgrade_purchase',
        details: { upgradeType }
      }
    });
  }
}