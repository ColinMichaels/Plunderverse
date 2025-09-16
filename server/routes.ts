import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Crypto API Proxy Routes - keeps API keys secure on server side
  
  // Crypto API configuration from environment variables
  const CRYPTO_API_KEY = process.env.CRYPTO_API_KEY;
  const CRYPTO_API_URL = process.env.CRYPTO_API_URL || 'https://api.spacecrypto.example.com';
  const CRYPTO_NETWORK = process.env.CRYPTO_NETWORK || 'testnet';

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
      const data = await cryptoApiRequest('/wallets', 'POST', {
        playerId,
        currency: 'SPACE',
        network: CRYPTO_NETWORK
      });
      res.json({ success: true, data });
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
      const data = await cryptoApiRequest(`/wallets/${address}`);
      res.json({ success: true, data });
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
      const data = await cryptoApiRequest(`/wallets/player/${playerId}`);
      res.json({ success: true, data });
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
      const data = await cryptoApiRequest('/transactions', 'POST', {
        fromAddress,
        toAddress,
        amount,
        currency: 'SPACE',
        gameContext
      });
      res.json({ success: true, data });
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
      const data = await cryptoApiRequest(`/transactions/history/${address}`);
      res.json({ success: true, data });
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
      const data = await cryptoApiRequest(`/market/price/${currency}`);
      res.json({ success: true, data });
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
      const data = await cryptoApiRequest('/trading/orders', 'POST', orderData);
      res.json({ success: true, data });
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
      const endpoint = address ? `/trading/orders/${address}` : '/trading/orders';
      const data = await cryptoApiRequest(endpoint);
      res.json({ success: true, data });
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
