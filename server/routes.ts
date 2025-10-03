import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRoutes from "./routes/auth.routes";
import gameSaveRoutes from "./routes/game-save.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register authentication routes
  app.use('/api/auth', authRoutes);
  
  // Register game save routes
  app.use('/api/saves', gameSaveRoutes);
  
  // Crypto API Proxy Routes - keeps API keys secure on server side
  
  // Crypto API configuration from environment variables
  const CRYPTO_API_KEY = process.env.CRYPTO_API_KEY;
  const CRYPTO_API_URL = process.env.CRYPTO_API_URL || 'https://api.spacecrypto.example.com';
  const CRYPTO_NETWORK = process.env.CRYPTO_NETWORK || 'testnet';

  // Mock mode flag
  const MOCK_CRYPTO_MODE = !CRYPTO_API_KEY;

  // Mock storage for wallets and transactions
  const mockWallets = new Map<string, { address: string; playerId: string; balance: number; currency: string; network: string }>();
  const mockTransactions = new Map<string, { id: string; from: string; to: string; amount: number; timestamp: string; type: string; memo?: string }[]>();
  
  if (MOCK_CRYPTO_MODE) {
    console.log('CRYPTO: Running in MOCK MODE (CRYPTO_API_KEY not set)');
  } else {
    console.log('CRYPTO: Running in REAL MODE with API key');
  }

  // Helper function to generate deterministic mock address
  function generateMockAddress(playerId: string): string {
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      const char = playerId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `MOCK_${Math.abs(hash).toString(16).toUpperCase().padStart(12, '0')}`;
  }

  // Helper function to make authenticated requests to external crypto API
  async function cryptoApiRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) {
    if (!CRYPTO_API_KEY) {
      throw new Error('CRYPTO_API_KEY not configured');
    }

    const response = await fetch(`${CRYPTO_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRYPTO_API_KEY}`,
        'X-Network': CRYPTO_NETWORK,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Crypto API request failed');
    }

    return data;
  }

  // Wallet operations
  app.post('/api/crypto/wallets', async (req, res) => {
    try {
      const { playerId } = req.body;
      
      if (MOCK_CRYPTO_MODE) {
        const mockAddress = generateMockAddress(playerId);
        const walletData = {
          address: mockAddress,
          playerId,
          balance: 1000,
          currency: 'SPACE',
          network: CRYPTO_NETWORK
        };
        mockWallets.set(playerId, walletData);
        mockTransactions.set(mockAddress, []);
        console.log(`CRYPTO MOCK: Created wallet for player ${playerId} with address ${mockAddress}`);
        const { playerId: _, ...wallet } = walletData;
        res.json({ success: true, data: wallet });
      } else {
        const data = await cryptoApiRequest('/wallets', 'POST', {
          playerId,
          currency: 'SPACE',
          network: CRYPTO_NETWORK
        });
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'WALLET_CREATE_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  app.get('/api/crypto/wallets/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      if (MOCK_CRYPTO_MODE) {
        const walletData = Array.from(mockWallets.values()).find(w => w.address === address);
        if (!walletData) {
          throw new Error('Wallet not found');
        }
        console.log(`CRYPTO MOCK: Fetched wallet ${address}`);
        const { playerId: _, ...wallet } = walletData;
        res.json({ success: true, data: wallet });
      } else {
        const data = await cryptoApiRequest(`/wallets/${address}`);
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'WALLET_FETCH_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  app.get('/api/crypto/wallets/player/:playerId', async (req, res) => {
    try {
      const { playerId } = req.params;
      
      if (MOCK_CRYPTO_MODE) {
        let walletData = mockWallets.get(playerId);
        if (!walletData) {
          const mockAddress = generateMockAddress(playerId);
          walletData = {
            address: mockAddress,
            playerId,
            balance: 1000,
            currency: 'SPACE',
            network: CRYPTO_NETWORK
          };
          mockWallets.set(playerId, walletData);
          mockTransactions.set(mockAddress, []);
          console.log(`CRYPTO MOCK: Auto-created wallet for player ${playerId}`);
        }
        const { playerId: _, ...wallet } = walletData;
        res.json({ success: true, data: wallet });
      } else {
        const data = await cryptoApiRequest(`/wallets/player/${playerId}`);
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'WALLET_FETCH_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  // Transaction operations
  app.post('/api/crypto/transactions', async (req, res) => {
    try {
      const { fromAddress, toAddress, amount, gameContext } = req.body;
      
      if (MOCK_CRYPTO_MODE) {
        const fromWallet = Array.from(mockWallets.values()).find(w => w.address === fromAddress);
        const toWallet = Array.from(mockWallets.values()).find(w => w.address === toAddress);
        
        if (!fromWallet) {
          throw new Error('From wallet not found');
        }
        
        if (fromWallet.balance < amount) {
          throw new Error('Insufficient balance');
        }
        
        fromWallet.balance -= amount;
        if (toWallet) {
          toWallet.balance += amount;
        }
        
        const transaction = {
          id: `MOCK_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          from: fromAddress,
          to: toAddress,
          amount,
          timestamp: new Date().toISOString(),
          type: gameContext?.type || 'transfer',
          memo: gameContext?.details ? JSON.stringify(gameContext.details) : undefined
        };
        
        const fromTxHistory = mockTransactions.get(fromAddress) || [];
        fromTxHistory.push(transaction);
        mockTransactions.set(fromAddress, fromTxHistory);
        
        if (toAddress !== fromAddress) {
          const toTxHistory = mockTransactions.get(toAddress) || [];
          toTxHistory.push(transaction);
          mockTransactions.set(toAddress, toTxHistory);
        }
        
        console.log(`CRYPTO MOCK: Transaction ${transaction.id} from ${fromAddress} to ${toAddress} for ${amount} SPACE`);
        res.json({ success: true, data: transaction });
      } else {
        const data = await cryptoApiRequest('/transactions', 'POST', {
          fromAddress,
          toAddress,
          amount,
          currency: 'SPACE',
          gameContext
        });
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'TRANSACTION_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  app.get('/api/crypto/transactions/history/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      if (MOCK_CRYPTO_MODE) {
        const history = mockTransactions.get(address) || [];
        console.log(`CRYPTO MOCK: Fetched transaction history for ${address} (${history.length} transactions)`);
        res.json({ success: true, data: history });
      } else {
        const data = await cryptoApiRequest(`/transactions/history/${address}`);
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'HISTORY_FETCH_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  // Mining rewards
  app.post('/api/crypto/rewards/mining', async (req, res) => {
    try {
      const { address, amount, resourceType, planetSource } = req.body;
      
      if (MOCK_CRYPTO_MODE) {
        const wallet = Array.from(mockWallets.values()).find(w => w.address === address);
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        wallet.balance += amount;
        
        const transaction = {
          id: `MOCK_REWARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          from: 'SYSTEM_MINING_REWARD',
          to: address,
          amount,
          timestamp: new Date().toISOString(),
          type: 'mining_reward',
          memo: JSON.stringify({ resourceType, planetSource })
        };
        
        const txHistory = mockTransactions.get(address) || [];
        txHistory.push(transaction);
        mockTransactions.set(address, txHistory);
        
        console.log(`CRYPTO MOCK: Mining reward ${amount} SPACE to ${address} for ${resourceType} from ${planetSource}`);
        res.json({ success: true, data: transaction });
      } else {
        const data = await cryptoApiRequest('/rewards/mining', 'POST', {
          address,
          amount,
          currency: 'SPACE',
          gameContext: {
            type: 'mining_reward',
            details: { resourceType, planetSource }
          }
        });
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MINING_REWARD_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  // Market operations
  app.get('/api/crypto/market/price/:currency?', async (req, res) => {
    try {
      const currency = req.params.currency || 'SPACE';
      
      if (MOCK_CRYPTO_MODE) {
        const priceInUSD = 0.50 + (Math.random() * 0.1 - 0.05);
        const mockPrice = {
          currency: 'SPACE',
          priceInUSD,
          change24h: (Math.random() * 10 - 5),
          lastUpdated: Date.now()
        };
        console.log(`CRYPTO MOCK: Fetched market price for ${currency}: $${mockPrice.priceInUSD.toFixed(2)}`);
        res.json({ success: true, data: mockPrice });
      } else {
        const data = await cryptoApiRequest(`/market/price/${currency}`);
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'PRICE_FETCH_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  // Trading operations
  app.post('/api/crypto/trading/orders', async (req, res) => {
    try {
      const orderData = { ...req.body, currency: 'SPACE' };
      
      if (MOCK_CRYPTO_MODE) {
        const { address, type, amount, price } = orderData;
        const wallet = Array.from(mockWallets.values()).find(w => w.address === address);
        
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        const order = {
          id: `MOCK_ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          address,
          type,
          amount,
          price,
          currency: 'SPACE',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        
        console.log(`CRYPTO MOCK: Created ${type} order ${order.id} for ${amount} SPACE at $${price}`);
        res.json({ success: true, data: order });
      } else {
        const data = await cryptoApiRequest('/trading/orders', 'POST', orderData);
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'ORDER_CREATE_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  app.get('/api/crypto/trading/orders/:address?', async (req, res) => {
    try {
      const { address } = req.params;
      
      if (MOCK_CRYPTO_MODE) {
        const orders: any[] = [];
        console.log(`CRYPTO MOCK: Fetched trading orders${address ? ` for ${address}` : ''} (${orders.length} orders)`);
        res.json({ success: true, data: orders });
      } else {
        const endpoint = address ? `/trading/orders/${address}` : '/trading/orders';
        const data = await cryptoApiRequest(endpoint);
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'ORDERS_FETCH_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  // Purchase operations
  app.post('/api/crypto/purchases/upgrades', async (req, res) => {
    try {
      const { address, upgradeType, cost } = req.body;
      
      if (MOCK_CRYPTO_MODE) {
        const wallet = Array.from(mockWallets.values()).find(w => w.address === address);
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        if (wallet.balance < cost) {
          throw new Error('Insufficient balance for upgrade');
        }
        
        wallet.balance -= cost;
        
        const transaction = {
          id: `MOCK_PURCHASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          from: address,
          to: 'SYSTEM_UPGRADE_STORE',
          amount: cost,
          timestamp: new Date().toISOString(),
          type: 'upgrade_purchase',
          memo: JSON.stringify({ upgradeType })
        };
        
        const txHistory = mockTransactions.get(address) || [];
        txHistory.push(transaction);
        mockTransactions.set(address, txHistory);
        
        console.log(`CRYPTO MOCK: Purchased ${upgradeType} for ${cost} SPACE from ${address}`);
        res.json({ success: true, data: transaction });
      } else {
        const data = await cryptoApiRequest('/purchases/upgrades', 'POST', {
          address,
          upgradeType,
          cost,
          currency: 'SPACE',
          gameContext: {
            type: 'upgrade_purchase',
            details: { upgradeType }
          }
        });
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'PURCHASE_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
