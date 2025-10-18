import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

// Good types with their categories
export type GoodCategory = 'fuel' | 'food' | 'medicine' | 'electronics' | 'weapons' | 'rare';

export interface Good {
  id: string;
  name: string;
  category: GoodCategory;
  basePrice: number;
  weight: number;
  description: string;
  icon?: string;
}

export interface MarketPrice {
  goodId: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  demand: number; // 0-1, affects price
}

export interface Trade {
  id: string;
  timestamp: number;
  station: string;
  type: 'buy' | 'sell';
  goodId: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

interface TradingState {
  // Market data
  goods: Good[];
  marketPrices: Record<string, MarketPrice[]>; // station -> prices
  tradeHistory: Trade[];
  
  // Actions
  getMarketPrices: (station: string) => MarketPrice[];
  buyGood: (station: string, goodId: string, quantity: number, totalCost: number) => void;
  sellGood: (station: string, goodId: string, quantity: number, earnings: number) => void;
  calculatePrice: (basePrice: number, factionModifier: number, heatModifier: number, demand: number) => number;
  getGoodById: (goodId: string) => Good | undefined;
  getRecentTrades: (limit?: number) => Trade[];
  getTotalProfit: () => number;
  generateMarketPrices: (station: string) => void;
}

// Default goods catalog
const defaultGoods: Good[] = [
  // Fuel
  { id: 'fuel-standard', name: 'Standard Fuel', category: 'fuel', basePrice: 10, weight: 1, description: 'Basic starship fuel', icon: '⛽' },
  { id: 'fuel-premium', name: 'Premium Fuel', category: 'fuel', basePrice: 20, weight: 1, description: 'High-efficiency fuel', icon: '🚀' },
  
  // Food
  { id: 'food-rations', name: 'Food Rations', category: 'food', basePrice: 5, weight: 1, description: 'Standard space rations', icon: '🍱' },
  { id: 'food-fresh', name: 'Fresh Produce', category: 'food', basePrice: 15, weight: 2, description: 'Perishable fresh food', icon: '🥗' },
  { id: 'food-luxury', name: 'Luxury Meals', category: 'food', basePrice: 50, weight: 2, description: 'Gourmet space cuisine', icon: '🍽️' },
  
  // Medicine
  { id: 'med-basic', name: 'Basic Medkits', category: 'medicine', basePrice: 25, weight: 1, description: 'Emergency medical supplies', icon: '🏥' },
  { id: 'med-advanced', name: 'Advanced Medicine', category: 'medicine', basePrice: 75, weight: 1, description: 'Specialized treatments', icon: '💊' },
  { id: 'med-nanotech', name: 'Nano-Medicine', category: 'medicine', basePrice: 200, weight: 1, description: 'Cutting-edge nanobot treatment', icon: '🧬' },
  
  // Electronics
  { id: 'elec-components', name: 'Electronic Components', category: 'electronics', basePrice: 30, weight: 1, description: 'Basic electronic parts', icon: '🔌' },
  { id: 'elec-processors', name: 'Quantum Processors', category: 'electronics', basePrice: 100, weight: 1, description: 'Advanced computing chips', icon: '💻' },
  { id: 'elec-ai-cores', name: 'AI Cores', category: 'electronics', basePrice: 500, weight: 2, description: 'Artificial intelligence modules', icon: '🤖' },
  
  // Weapons
  { id: 'weap-small', name: 'Small Arms', category: 'weapons', basePrice: 40, weight: 2, description: 'Personal defense weapons', icon: '🔫' },
  { id: 'weap-heavy', name: 'Heavy Weapons', category: 'weapons', basePrice: 150, weight: 5, description: 'Military-grade armaments', icon: '💣' },
  { id: 'weap-energy', name: 'Energy Weapons', category: 'weapons', basePrice: 300, weight: 3, description: 'Plasma and laser weaponry', icon: '⚡' },
  
  // Rare Goods
  { id: 'rare-artifacts', name: 'Alien Artifacts', category: 'rare', basePrice: 1000, weight: 1, description: 'Mysterious alien technology', icon: '🛸' },
  { id: 'rare-crystals', name: 'Rare Crystals', category: 'rare', basePrice: 750, weight: 2, description: 'Valuable energy crystals', icon: '💎' },
  { id: 'rare-data', name: 'Encrypted Data', category: 'rare', basePrice: 600, weight: 0, description: 'Valuable information', icon: '💾' },
];

export const useTrading = create<TradingState>()(
  persist(
    (set, get) => ({
      goods: defaultGoods,
      marketPrices: {},
      tradeHistory: [],
      
      getMarketPrices: (station: string) => {
        const state = get();
        
        // Generate prices if not exists for this station
        if (!state.marketPrices[station]) {
          get().generateMarketPrices(station);
        }
        
        return state.marketPrices[station] || [];
      },
      
      buyGood: (station: string, goodId: string, quantity: number, totalCost: number) => {
        const trade: Trade = {
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          station,
          type: 'buy',
          goodId,
          quantity,
          pricePerUnit: totalCost / quantity,
          totalPrice: totalCost
        };
        
        // Show purchase notification
        const good = get().getGoodById(goodId);
        if (good) {
          toast.info(`💰 Purchased ${quantity} ${good.name}`, {
            description: `Paid ${totalCost} credits at ${station}`,
            duration: 3000
          });
        }
        
        set(state => ({
          tradeHistory: [...state.tradeHistory, trade],
          marketPrices: {
            ...state.marketPrices,
            [station]: state.marketPrices[station]?.map(mp => 
              mp.goodId === goodId 
                ? { ...mp, stock: Math.max(0, mp.stock - quantity), demand: Math.min(1, mp.demand + 0.05) }
                : mp
            )
          }
        }));
      },
      
      sellGood: (station: string, goodId: string, quantity: number, earnings: number) => {
        const trade: Trade = {
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          station,
          type: 'sell',
          goodId,
          quantity,
          pricePerUnit: earnings / quantity,
          totalPrice: earnings
        };
        
        // Calculate profit/loss by checking purchase history
        const good = get().getGoodById(goodId);
        const recentBuy = get().tradeHistory
          .filter(t => t.type === 'buy' && t.goodId === goodId)
          .slice(-1)[0];
        
        if (good) {
          const pricePerUnit = earnings / quantity;
          let profitMessage = '';
          let toastType: 'success' | 'warning' | 'info' = 'success';
          
          if (recentBuy) {
            const profit = earnings - (recentBuy.pricePerUnit * quantity);
            const margin = ((pricePerUnit - recentBuy.pricePerUnit) / recentBuy.pricePerUnit * 100).toFixed(0);
            
            if (profit > 0) {
              profitMessage = `📈 Trade profit: +${Math.round(profit)} credits (${margin}% margin)`;
              toastType = 'success';
              toast[toastType](profitMessage, {
                description: `Sold ${quantity} ${good.name} at ${station}`,
                duration: 3500
              });
            } else if (profit < 0) {
              profitMessage = `📉 Trade loss: ${Math.round(profit)} credits`;
              toastType = 'warning';
              toast[toastType](profitMessage, {
                description: `Sold ${quantity} ${good.name} at ${station}`,
                duration: 3500
              });
            } else {
              toast.info(`💱 Sold ${quantity} ${good.name}`, {
                description: `Earned ${earnings} credits at ${station}`,
                duration: 3000
              });
            }
          } else {
            // No purchase history, just show sale info
            toast.success(`💰 Sold ${quantity} ${good.name}`, {
              description: `Earned ${earnings} credits at ${station}`,
              duration: 3000
            });
          }
        }
        
        set(state => ({
          tradeHistory: [...state.tradeHistory, trade],
          marketPrices: {
            ...state.marketPrices,
            [station]: state.marketPrices[station]?.map(mp => 
              mp.goodId === goodId 
                ? { ...mp, stock: mp.stock + quantity, demand: Math.max(0, mp.demand - 0.05) }
                : mp
            )
          }
        }));
      },
      
      calculatePrice: (basePrice: number, factionModifier: number, heatModifier: number, demand: number) => {
        // Apply crew negotiator bonus to trade prices
        let tradePriceModifier = 1.0;
        try {
          const crewState = (window as any).useCrewManagement?.getState?.();
          if (crewState?.currentBonuses?.tradePrices) {
            tradePriceModifier = 1 + crewState.currentBonuses.tradePrices; // Negative bonus = better prices
            console.log(`[TRADING] Applying negotiator bonus: ${(-crewState.currentBonuses.tradePrices * 100).toFixed(0)}% better trade prices`);
          }
        } catch (e) {
          // Crew management might not be initialized yet
        }
        
        // Apply all modifiers
        const demandModifier = 0.8 + (demand * 0.4); // 0.8x to 1.2x based on demand
        return Math.round(basePrice * factionModifier * heatModifier * demandModifier * tradePriceModifier);
      },
      
      getGoodById: (goodId: string) => {
        return get().goods.find(g => g.id === goodId);
      },
      
      getRecentTrades: (limit = 10) => {
        const trades = get().tradeHistory;
        return trades.slice(-limit).reverse();
      },
      
      getTotalProfit: () => {
        const trades = get().tradeHistory;
        return trades.reduce((total, trade) => {
          if (trade.type === 'sell') {
            return total + trade.totalPrice;
          } else {
            return total - trade.totalPrice;
          }
        }, 0);
      },
      
      generateMarketPrices: (station: string) => {
        const goods = get().goods;
        const prices: MarketPrice[] = goods.map(good => {
          // Randomize stock and demand
          const stock = Math.floor(Math.random() * 100) + 10;
          const demand = Math.random();
          
          // Calculate prices with some variation
          const variation = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
          const buyPrice = Math.round(good.basePrice * variation);
          const sellPrice = Math.round(buyPrice * 0.7); // Sell for 70% of buy price
          
          return {
            goodId: good.id,
            buyPrice,
            sellPrice,
            stock,
            demand
          };
        });
        
        set(state => ({
          marketPrices: {
            ...state.marketPrices,
            [station]: prices
          }
        }));
      }
    }),
    {
      name: 'trading-storage',
      partialize: (state) => ({
        marketPrices: state.marketPrices,
        tradeHistory: state.tradeHistory
      })
    }
  )
);