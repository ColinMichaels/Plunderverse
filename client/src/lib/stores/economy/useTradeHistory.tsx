import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TradeTransaction {
  id: string;
  timestamp: number;
  itemType: string;
  itemName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  transactionType: 'buy' | 'sell';
  station: string;
  planet: string;
  profit?: number; // For sell transactions, the profit made
  faction?: string;
  heatLevel?: number; // Heat level at time of transaction
}

export interface TradeStats {
  totalProfit: number;
  totalSpent: number;
  totalEarned: number;
  tradesCount: number;
  favoriteItems: string[]; // Most traded items
  bestDeal: TradeTransaction | null;
  worstDeal: TradeTransaction | null;
}

interface TradeHistoryState {
  transactions: TradeTransaction[];
  stats: TradeStats;
  priceAlerts: { itemType: string; targetPrice: number; alertType: 'above' | 'below' }[];
  favoriteItems: string[];
  
  // Actions
  addTransaction: (transaction: Omit<TradeTransaction, 'id' | 'timestamp'>) => void;
  getRecentTransactions: (limit?: number) => TradeTransaction[];
  getTransactionsByItem: (itemType: string) => TradeTransaction[];
  getTransactionsByStation: (station: string) => TradeTransaction[];
  calculateProfit: (itemType: string, sellPrice: number, quantity: number) => number;
  updateStats: () => void;
  clearHistory: () => void;
  toggleFavoriteItem: (itemType: string) => void;
  addPriceAlert: (itemType: string, targetPrice: number, alertType: 'above' | 'below') => void;
  removePriceAlert: (itemType: string) => void;
  checkPriceAlerts: (currentPrices: Record<string, number>) => string[];
  getAveragePrices: (itemType: string) => { buyAvg: number; sellAvg: number };
  getTradingTrends: () => { itemType: string; trend: 'up' | 'down' | 'stable'; change: number }[];
}

export const useTradeHistory = create<TradeHistoryState>()(
  persist(
    (set, get) => ({
      transactions: [],
      stats: {
        totalProfit: 0,
        totalSpent: 0,
        totalEarned: 0,
        tradesCount: 0,
        favoriteItems: [],
        bestDeal: null,
        worstDeal: null
      },
      priceAlerts: [],
      favoriteItems: [],
      
      addTransaction: (transaction) => {
        const id = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = Date.now();
        
        const newTransaction: TradeTransaction = {
          ...transaction,
          id,
          timestamp
        };
        
        set(state => {
          // Keep only last 100 transactions for performance
          const updatedTransactions = [newTransaction, ...state.transactions].slice(0, 100);
          
          return {
            transactions: updatedTransactions
          };
        });
        
        // Update stats after adding transaction
        get().updateStats();
        
        console.log(`[TradeHistory] Added ${transaction.transactionType} transaction:`, newTransaction);
      },
      
      getRecentTransactions: (limit = 20) => {
        const state = get();
        return state.transactions.slice(0, limit);
      },
      
      getTransactionsByItem: (itemType) => {
        const state = get();
        return state.transactions.filter(t => t.itemType === itemType);
      },
      
      getTransactionsByStation: (station) => {
        const state = get();
        return state.transactions.filter(t => t.station === station);
      },
      
      calculateProfit: (itemType, sellPrice, quantity) => {
        const state = get();
        // Find the most recent buy transaction for this item
        const buyTransactions = state.transactions
          .filter(t => t.itemType === itemType && t.transactionType === 'buy')
          .sort((a, b) => b.timestamp - a.timestamp);
        
        if (buyTransactions.length === 0) {
          // No purchase history, calculate based on assumed cost
          return sellPrice * quantity; // Pure profit if no known cost
        }
        
        // Calculate weighted average purchase price
        let totalCost = 0;
        let totalQuantity = 0;
        
        for (const transaction of buyTransactions) {
          if (totalQuantity >= quantity) break;
          
          const quantityFromThis = Math.min(transaction.quantity, quantity - totalQuantity);
          totalCost += transaction.pricePerUnit * quantityFromThis;
          totalQuantity += quantityFromThis;
        }
        
        const avgBuyPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        const profit = (sellPrice - avgBuyPrice) * quantity;
        
        return Math.round(profit);
      },
      
      updateStats: () => {
        const state = get();
        const { transactions } = state;
        
        let totalSpent = 0;
        let totalEarned = 0;
        let totalProfit = 0;
        let bestDeal: TradeTransaction | null = null;
        let worstDeal: TradeTransaction | null = null;
        
        // Calculate stats
        transactions.forEach(transaction => {
          if (transaction.transactionType === 'buy') {
            totalSpent += transaction.totalPrice;
          } else {
            totalEarned += transaction.totalPrice;
            if (transaction.profit !== undefined) {
              totalProfit += transaction.profit;
              
              // Track best and worst deals
              if (!bestDeal || (transaction.profit > (bestDeal.profit || 0))) {
                bestDeal = transaction;
              }
              if (!worstDeal || (transaction.profit < (worstDeal.profit || 0))) {
                worstDeal = transaction;
              }
            }
          }
        });
        
        // Find favorite items (most frequently traded)
        const itemFrequency: Record<string, number> = {};
        transactions.forEach(t => {
          itemFrequency[t.itemType] = (itemFrequency[t.itemType] || 0) + 1;
        });
        
        const favoriteItems = Object.entries(itemFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([item]) => item);
        
        set({
          stats: {
            totalProfit,
            totalSpent,
            totalEarned,
            tradesCount: transactions.length,
            favoriteItems,
            bestDeal,
            worstDeal
          }
        });
      },
      
      clearHistory: () => {
        set({
          transactions: [],
          stats: {
            totalProfit: 0,
            totalSpent: 0,
            totalEarned: 0,
            tradesCount: 0,
            favoriteItems: [],
            bestDeal: null,
            worstDeal: null
          }
        });
        console.log('[TradeHistory] History cleared');
      },
      
      toggleFavoriteItem: (itemType) => {
        set(state => {
          const isFavorite = state.favoriteItems.includes(itemType);
          return {
            favoriteItems: isFavorite
              ? state.favoriteItems.filter(item => item !== itemType)
              : [...state.favoriteItems, itemType]
          };
        });
      },
      
      addPriceAlert: (itemType, targetPrice, alertType) => {
        set(state => ({
          priceAlerts: [
            ...state.priceAlerts.filter(alert => alert.itemType !== itemType),
            { itemType, targetPrice, alertType }
          ]
        }));
        console.log(`[TradeHistory] Price alert set for ${itemType}: ${alertType} ${targetPrice}`);
      },
      
      removePriceAlert: (itemType) => {
        set(state => ({
          priceAlerts: state.priceAlerts.filter(alert => alert.itemType !== itemType)
        }));
      },
      
      checkPriceAlerts: (currentPrices) => {
        const state = get();
        const triggeredAlerts: string[] = [];
        
        state.priceAlerts.forEach(alert => {
          const currentPrice = currentPrices[alert.itemType];
          if (!currentPrice) return;
          
          const triggered = alert.alertType === 'above'
            ? currentPrice >= alert.targetPrice
            : currentPrice <= alert.targetPrice;
          
          if (triggered) {
            triggeredAlerts.push(
              `${alert.itemType} is now ${currentPrice}c (target: ${alert.alertType} ${alert.targetPrice}c)`
            );
          }
        });
        
        return triggeredAlerts;
      },
      
      getAveragePrices: (itemType) => {
        const state = get();
        const itemTransactions = state.transactions.filter(t => t.itemType === itemType);
        
        const buyTransactions = itemTransactions.filter(t => t.transactionType === 'buy');
        const sellTransactions = itemTransactions.filter(t => t.transactionType === 'sell');
        
        const buyAvg = buyTransactions.length > 0
          ? buyTransactions.reduce((sum, t) => sum + t.pricePerUnit, 0) / buyTransactions.length
          : 0;
        
        const sellAvg = sellTransactions.length > 0
          ? sellTransactions.reduce((sum, t) => sum + t.pricePerUnit, 0) / sellTransactions.length
          : 0;
        
        return { buyAvg: Math.round(buyAvg), sellAvg: Math.round(sellAvg) };
      },
      
      getTradingTrends: () => {
        const state = get();
        const trends: { itemType: string; trend: 'up' | 'down' | 'stable'; change: number }[] = [];
        
        // Group transactions by item type
        const itemGroups: Record<string, TradeTransaction[]> = {};
        state.transactions.forEach(t => {
          if (!itemGroups[t.itemType]) itemGroups[t.itemType] = [];
          itemGroups[t.itemType].push(t);
        });
        
        // Calculate trend for each item
        Object.entries(itemGroups).forEach(([itemType, transactions]) => {
          if (transactions.length < 2) {
            trends.push({ itemType, trend: 'stable', change: 0 });
            return;
          }
          
          // Get recent and older average prices
          const midPoint = Math.floor(transactions.length / 2);
          const recentTrans = transactions.slice(0, midPoint);
          const olderTrans = transactions.slice(midPoint);
          
          const recentAvg = recentTrans.reduce((sum, t) => sum + t.pricePerUnit, 0) / recentTrans.length;
          const olderAvg = olderTrans.reduce((sum, t) => sum + t.pricePerUnit, 0) / olderTrans.length;
          
          const change = ((recentAvg - olderAvg) / olderAvg) * 100;
          
          let trend: 'up' | 'down' | 'stable';
          if (change > 5) trend = 'up';
          else if (change < -5) trend = 'down';
          else trend = 'stable';
          
          trends.push({ itemType, trend, change: Math.round(change) });
        });
        
        return trends;
      }
    }),
    {
      name: 'trade-history-storage',
      version: 1
    }
  )
);