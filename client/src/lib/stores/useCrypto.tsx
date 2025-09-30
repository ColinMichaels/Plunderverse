import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { cryptoService } from '../../domain/crypto/crypto.service';
import { CryptoTransaction, CryptoMarketPrice } from '../../domain/crypto/crypto-api.types';

interface CryptoState {
  // Wallet state
  isInitialized: boolean;
  walletAddress: string | null;
  balance: number;
  currency: string;
  
  // Market data
  marketPrice: CryptoMarketPrice | null;
  
  // Transaction history
  transactions: CryptoTransaction[];
  isLoadingTransactions: boolean;
  
  // UI state
  showWallet: boolean;
  showMarketplace: boolean;
  showTransactionHistory: boolean;
  
  // Loading states
  isProcessingTransaction: boolean;
  lastTransactionResult: { success: boolean; message: string } | null;
  
  // Actions
  initializeCrypto: (playerId: string) => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  refreshMarketPrice: () => Promise<void>;
  loadTransactionHistory: () => Promise<void>;
  
  // Wallet operations
  transferToPlayer: (recipientAddress: string, amount: number, memo?: string) => Promise<boolean>;
  
  // Mining rewards
  issueMiningReward: (amount: number, resourceType: string, planetSource: string) => Promise<boolean>;
  
  // Purchases
  purchaseUpgrade: (upgradeType: string, cost: number) => Promise<boolean>;
  
  // Trading
  sellResource: (resourceType: string, quantity: number, pricePerUnit: number) => Promise<boolean>;
  buyResource: (resourceType: string, quantity: number, pricePerUnit: number) => Promise<boolean>;
  
  // UI actions
  toggleWallet: () => void;
  toggleMarketplace: () => void;
  toggleTransactionHistory: () => void;
  clearLastTransactionResult: () => void;
}

export const useCrypto = create<CryptoState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isInitialized: false,
    walletAddress: null,
    balance: 0,
    currency: 'SPACE',
    marketPrice: null,
    transactions: [],
    isLoadingTransactions: false,
    showWallet: false,
    showMarketplace: false,
    showTransactionHistory: false,
    isProcessingTransaction: false,
    lastTransactionResult: null,

    // Initialize crypto system
    initializeCrypto: async (playerId: string) => {
      console.log('[CRYPTO-STORE] Initializing cryptocurrency system...');
      
      try {
        const config = {
          apiKey: '', // Not needed - server proxy handles authentication
          baseUrl: import.meta.env.VITE_CRYPTO_API_URL || '/api/crypto',
          network: (import.meta.env.VITE_CRYPTO_NETWORK as 'testnet' | 'mainnet') || 'testnet',
          currency: 'SPACE'
        };

        const success = await cryptoService.initialize(config, playerId);
        
        if (success) {
          const walletAddress = cryptoService.getWalletAddress();
          const balance = await cryptoService.getBalance();
          const currency = await cryptoService.getCurrency();

          set({
            isInitialized: true,
            walletAddress,
            balance,
            currency
          });

          // Load initial market data and transaction history
          get().refreshMarketPrice();
          get().loadTransactionHistory();

          console.log('[CRYPTO-STORE] Initialization successful');
          return true;
        } else {
          console.error('[CRYPTO-STORE] Initialization failed');
          return false;
        }
      } catch (error) {
        console.error('[CRYPTO-STORE] Initialization error:', error);
        return false;
      }
    },

    // Refresh wallet balance
    refreshBalance: async () => {
      if (!get().isInitialized) return;

      try {
        const balance = await cryptoService.getBalance(true);
        set({ balance });
        console.log(`[CRYPTO-STORE] Balance refreshed: ${balance}`);
      } catch (error) {
        console.error('[CRYPTO-STORE] Failed to refresh balance:', error);
      }
    },

    // Refresh market price
    refreshMarketPrice: async () => {
      if (!get().isInitialized) return;

      try {
        const marketPrice = await cryptoService.getMarketPrice();
        set({ marketPrice });
        console.log('[CRYPTO-STORE] Market price refreshed');
      } catch (error) {
        console.error('[CRYPTO-STORE] Failed to refresh market price:', error);
      }
    },

    // Load transaction history
    loadTransactionHistory: async () => {
      if (!get().isInitialized) return;

      set({ isLoadingTransactions: true });
      try {
        const transactions = await cryptoService.getTransactionHistory();
        set({ transactions, isLoadingTransactions: false });
        console.log(`[CRYPTO-STORE] Loaded ${transactions.length} transactions`);
      } catch (error) {
        console.error('[CRYPTO-STORE] Failed to load transactions:', error);
        set({ isLoadingTransactions: false });
      }
    },

    // Transfer to another player
    transferToPlayer: async (recipientAddress: string, amount: number, memo?: string) => {
      if (!get().isInitialized) return false;

      set({ isProcessingTransaction: true });
      try {
        const success = await cryptoService.transferToPlayer(recipientAddress, amount, memo);
        
        if (success) {
          await get().refreshBalance();
          await get().loadTransactionHistory();
          set({ 
            lastTransactionResult: { success: true, message: `Successfully transferred ${amount} ${get().currency}` },
            isProcessingTransaction: false 
          });
        } else {
          set({ 
            lastTransactionResult: { success: false, message: 'Transfer failed' },
            isProcessingTransaction: false 
          });
        }
        
        return success;
      } catch (error) {
        console.error('[CRYPTO-STORE] Transfer error:', error);
        set({ 
          lastTransactionResult: { success: false, message: 'Transfer error occurred' },
          isProcessingTransaction: false 
        });
        return false;
      }
    },

    // Issue mining reward
    issueMiningReward: async (amount: number, resourceType: string, planetSource: string) => {
      if (!get().isInitialized) return false;

      try {
        const success = await cryptoService.issueMiningReward(amount, resourceType, planetSource);
        
        if (success) {
          await get().refreshBalance();
          await get().loadTransactionHistory();
          console.log(`[CRYPTO-STORE] Mining reward issued: ${amount} ${get().currency}`);
        }
        
        return success;
      } catch (error) {
        console.error('[CRYPTO-STORE] Mining reward error:', error);
        return false;
      }
    },

    // Purchase upgrade
    purchaseUpgrade: async (upgradeType: string, cost: number) => {
      if (!get().isInitialized) return false;

      set({ isProcessingTransaction: true });
      try {
        const success = await cryptoService.purchaseUpgrade(upgradeType, cost);
        
        if (success) {
          await get().refreshBalance();
          await get().loadTransactionHistory();
          set({ 
            lastTransactionResult: { success: true, message: `Successfully purchased ${upgradeType}` },
            isProcessingTransaction: false 
          });
        } else {
          set({ 
            lastTransactionResult: { success: false, message: `Failed to purchase ${upgradeType}` },
            isProcessingTransaction: false 
          });
        }
        
        return success;
      } catch (error) {
        console.error('[CRYPTO-STORE] Purchase error:', error);
        set({ 
          lastTransactionResult: { success: false, message: 'Purchase error occurred' },
          isProcessingTransaction: false 
        });
        return false;
      }
    },

    // Sell resource
    sellResource: async (resourceType: string, quantity: number, pricePerUnit: number) => {
      if (!get().isInitialized) return false;

      set({ isProcessingTransaction: true });
      try {
        const success = await cryptoService.sellResource(resourceType, quantity, pricePerUnit);
        
        if (success) {
          set({ 
            lastTransactionResult: { success: true, message: `Successfully listed ${quantity}x ${resourceType} for sale` },
            isProcessingTransaction: false 
          });
        } else {
          set({ 
            lastTransactionResult: { success: false, message: `Failed to list ${resourceType} for sale` },
            isProcessingTransaction: false 
          });
        }
        
        return success;
      } catch (error) {
        console.error('[CRYPTO-STORE] Sell resource error:', error);
        set({ 
          lastTransactionResult: { success: false, message: 'Sell order error occurred' },
          isProcessingTransaction: false 
        });
        return false;
      }
    },

    // Buy resource
    buyResource: async (resourceType: string, quantity: number, pricePerUnit: number) => {
      if (!get().isInitialized) return false;

      set({ isProcessingTransaction: true });
      try {
        const success = await cryptoService.buyResource(resourceType, quantity, pricePerUnit);
        
        if (success) {
          await get().refreshBalance();
          set({ 
            lastTransactionResult: { success: true, message: `Successfully placed buy order for ${quantity}x ${resourceType}` },
            isProcessingTransaction: false 
          });
        } else {
          set({ 
            lastTransactionResult: { success: false, message: `Failed to place buy order for ${resourceType}` },
            isProcessingTransaction: false 
          });
        }
        
        return success;
      } catch (error) {
        console.error('[CRYPTO-STORE] Buy resource error:', error);
        set({ 
          lastTransactionResult: { success: false, message: 'Buy order error occurred' },
          isProcessingTransaction: false 
        });
        return false;
      }
    },

    // UI actions
    toggleWallet: () => set(state => ({ showWallet: !state.showWallet })),
    toggleMarketplace: () => set(state => ({ showMarketplace: !state.showMarketplace })),
    toggleTransactionHistory: () => set(state => ({ showTransactionHistory: !state.showTransactionHistory })),
    clearLastTransactionResult: () => set({ lastTransactionResult: null })
  }))
);