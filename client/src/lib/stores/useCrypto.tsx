import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { cryptoService } from '../../domain/crypto/crypto.service';
import { CryptoTransaction, CryptoMarketPrice } from '../../domain/crypto/crypto-api.types';
import { useInventoryStore } from '../../domain/economy/inventory.store';

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

      if (get().isProcessingTransaction) {
        console.warn('[CRYPTO-STORE] Transaction already in progress, ignoring');
        return false;
      }

      set({ isProcessingTransaction: true });
      
      const inventory = useInventoryStore.getState();
      const item = inventory.items.find(i => i.type === resourceType);
      
      if (!item) {
        set({ 
          lastTransactionResult: { success: false, message: `Resource ${resourceType} not found in inventory` },
          isProcessingTransaction: false 
        });
        return false;
      }
      
      if (item.quantity < quantity) {
        set({ 
          lastTransactionResult: { success: false, message: `Insufficient ${resourceType}! Have ${item.quantity}, need ${quantity}` },
          isProcessingTransaction: false 
        });
        return false;
      }
      
      try {
        const removeSuccess = inventory.removeResource(resourceType, quantity);
        
        if (!removeSuccess) {
          set({ 
            lastTransactionResult: { success: false, message: `Failed to remove ${resourceType} from inventory` },
            isProcessingTransaction: false 
          });
          return false;
        }
        
        const totalRevenue = Math.floor((quantity * pricePerUnit) * 1000000) / 1000000;
        const success = await cryptoService.sellResource(resourceType, Math.floor(quantity), Math.floor(pricePerUnit * 1000000) / 1000000);
        
        if (success) {
          await get().refreshBalance();
          await get().loadTransactionHistory();
          set({ 
            lastTransactionResult: { success: true, message: `Sold ${quantity}x ${resourceType} for ${totalRevenue.toFixed(6)} ${get().currency}` },
            isProcessingTransaction: false 
          });
          console.log(`[CRYPTO-STORE] Successfully sold ${quantity}x ${resourceType} for ${totalRevenue.toFixed(6)} ${get().currency}`);
          return true;
        } else {
          inventory.addResource(item, quantity, item.planetSource || 'Unknown');
          set({ 
            lastTransactionResult: { success: false, message: `Crypto transaction failed - resources restored` },
            isProcessingTransaction: false 
          });
          return false;
        }
      } catch (error) {
        console.error('[CRYPTO-STORE] Sell resource error:', error);
        inventory.addResource(item, quantity, item.planetSource || 'Unknown');
        set({ 
          lastTransactionResult: { success: false, message: 'Sell order error occurred - resources restored' },
          isProcessingTransaction: false 
        });
        return false;
      }
    },

    // Buy resource
    buyResource: async (resourceType: string, quantity: number, pricePerUnit: number) => {
      if (!get().isInitialized) return false;

      if (get().isProcessingTransaction) {
        console.warn('[CRYPTO-STORE] Transaction already in progress, ignoring');
        return false;
      }

      set({ isProcessingTransaction: true });
      
      const inventory = useInventoryStore.getState();
      const cleanQuantity = Math.floor(quantity);
      const cleanPricePerUnit = Math.floor(pricePerUnit * 1000000) / 1000000;
      const totalCost = Math.floor((cleanQuantity * cleanPricePerUnit) * 1000000) / 1000000;
      const currentBalance = get().balance;
      
      if (currentBalance < totalCost) {
        set({ 
          lastTransactionResult: { success: false, message: `Insufficient funds! Need ${totalCost.toFixed(6)}, have ${currentBalance.toFixed(6)} ${get().currency}` },
          isProcessingTransaction: false 
        });
        return false;
      }
      
      const storageUsed = inventory.getStorageUsed();
      if (storageUsed + quantity > inventory.storageCapacity) {
        set({ 
          lastTransactionResult: { success: false, message: `Inventory full! Need ${quantity} space, have ${inventory.storageCapacity - storageUsed} available` },
          isProcessingTransaction: false 
        });
        return false;
      }
      
      try {
        const success = await cryptoService.buyResource(resourceType, cleanQuantity, cleanPricePerUnit);
        
        if (success) {
          await get().refreshBalance();
          await get().loadTransactionHistory();
          
          const resourceData = {
            type: resourceType,
            value: Math.floor(cleanPricePerUnit * 1000),
            rarity: 'common' as const,
            description: `Purchased via crypto marketplace`,
            complexity: 1
          };
          
          const addSuccess = inventory.addResource(resourceData, cleanQuantity, 'Crypto Marketplace');
          
          if (addSuccess) {
            set({ 
              lastTransactionResult: { success: true, message: `Bought ${cleanQuantity}x ${resourceType} for ${totalCost.toFixed(6)} ${get().currency}` },
              isProcessingTransaction: false 
            });
            console.log(`[CRYPTO-STORE] Successfully bought ${cleanQuantity}x ${resourceType} for ${totalCost.toFixed(6)} ${get().currency}`);
            return true;
          } else {
            set({ 
              lastTransactionResult: { success: false, message: `Crypto deducted but failed to add resources - contact support` },
              isProcessingTransaction: false 
            });
            return false;
          }
        } else {
          set({ 
            lastTransactionResult: { success: false, message: `Failed to place buy order for ${resourceType}` },
            isProcessingTransaction: false 
          });
          return false;
        }
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