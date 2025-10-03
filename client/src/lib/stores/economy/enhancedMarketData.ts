// Enhanced market data system with planet economies integration
import { EXPANDED_MARKET_ITEMS, MarketItem } from './expandedMarketData';
import { 
  PLANET_ECONOMIES, 
  getPlanetPriceModifier, 
  supplyDemandTracker,
  findProfitableRoutes,
  TradeRoute
} from './planetEconomies';

// Use the expanded market items
export const MARKET_ITEMS = EXPANDED_MARKET_ITEMS;

// Get items by category
export const getItemsByCategory = (category: MarketItem['category']): MarketItem[] => {
  return MARKET_ITEMS.filter(item => item.category === category);
};

// Enhanced price calculation with planet economy integration
export const calculateFinalPrice = (
  item: MarketItem,
  planetName: string,
  faction: string,
  heatModifier: number = 1.0,
  isBuying: boolean = true
): number => {
  let price = item.basePrice;
  
  // Apply planet economy modifier
  const planetModifier = getPlanetPriceModifier(item.id, planetName, isBuying);
  price *= planetModifier;
  
  // Apply dynamic supply/demand
  const supplyDemandModifier = supplyDemandTracker.getSupplyDemandModifier(planetName, item.id);
  price *= supplyDemandModifier;
  
  // Apply faction modifier
  const factionKey = faction.toLowerCase() as keyof typeof item.factionModifiers;
  if (item.factionModifiers && item.factionModifiers[factionKey]) {
    price *= item.factionModifiers[factionKey]!;
  }
  
  // Apply heat modifier (prices go up with heat)
  price *= heatModifier;
  
  // Apply aggressive reputation-based price scaling
  const { usePlayer } = require('../../stores/player/usePlayer');
  const player = usePlayer.getState();
  const factionRep = player.reputation[faction as keyof typeof player.reputation] || 0;
  
  let reputationModifier = 1.0;
  if (isBuying) {
    // Buying prices based on reputation
    if (factionRep >= 75) {
      // Allied - special discounts
      reputationModifier = 0.7;
      console.log(`[PRICE] Allied discount with ${faction}: 30% off`);
    } else if (factionRep >= 50) {
      // Friendly - good prices
      reputationModifier = 0.85;
    } else if (factionRep >= 20) {
      // Liked - small discount
      reputationModifier = 0.95;
    } else if (factionRep <= -50) {
      // Hostile - very high prices (if they even trade)
      reputationModifier = 1.5;
      console.log(`[PRICE] Hostile markup with ${faction}: 50% increase`);
    } else if (factionRep <= -20) {
      // Unfriendly - higher prices
      reputationModifier = 1.2;
    }
  } else {
    // Selling prices based on reputation (inverse of buying)
    if (factionRep >= 75) {
      // Allied - better sell prices
      reputationModifier = 1.15;
      console.log(`[PRICE] Allied bonus when selling to ${faction}: 15% better`);
    } else if (factionRep >= 50) {
      reputationModifier = 1.1;
    } else if (factionRep >= 20) {
      reputationModifier = 1.05;
    } else if (factionRep <= -50) {
      // Hostile - terrible sell prices
      reputationModifier = 0.6;
      console.log(`[PRICE] Hostile penalty when selling to ${faction}: 40% worse`);
    } else if (factionRep <= -20) {
      reputationModifier = 0.8;
    }
  }
  
  price *= reputationModifier;
  
  // Special pricing for contraband/illegal items
  if (item.category === 'contraband' || item.illegal) {
    if (faction === 'outlaws' && player.reputation.outlaws >= 20) {
      // Outlaws give better prices for contraband to allies
      price *= isBuying ? 0.8 : 1.2;
      console.log(`[PRICE] Outlaw contraband ${isBuying ? 'discount' : 'bonus'}`);
    } else if (faction === 'corporations' && player.reputation.corporations >= 20) {
      // Corps charge more for contraband to law-abiding citizens
      price *= isBuying ? 1.5 : 0.7;
      console.log(`[PRICE] Corporation contraband ${isBuying ? 'penalty' : 'reduced value'}`);
    }
  }
  
  // Improved selling prices base modifier for better profit margins
  if (!isBuying) {
    // Base sell price should be 70% of buy price for standard items
    // This ensures a minimum 20-30% profit on trade routes
    price *= 0.7;
    
    // Increase profit margin for scarce items at this location
    const economy = PLANET_ECONOMIES[planetName];
    if (economy && economy.primaryImports.includes(item.id)) {
      price *= 1.3; // 30% bonus for items in demand
      console.log(`[TRADING] High demand for ${item.id} at ${planetName}, +30% sell bonus`);
    }
  }
  
  return Math.round(price);
};

// Generate market conditions based on planet economy
export const generatePlanetMarketConditions = (planetName: string): {
  available: string[];
  supplyDemand: Record<string, number>;
  specialDeals: { itemId: string; discount: number }[];
  economyType: string;
  description: string;
  tradeRoutes: TradeRoute[];
} => {
  const economy = PLANET_ECONOMIES[planetName];
  
  if (!economy) {
    // Fallback for unknown planets
    return {
      available: MARKET_ITEMS.filter(i => i.rarity === 'common').map(i => i.id),
      supplyDemand: {},
      specialDeals: [],
      economyType: 'frontier',
      description: 'Unknown trading post',
      tradeRoutes: []
    };
  }
  
  // Build available items list based on economy
  const available = new Set<string>();
  
  // Always have basic necessities
  ['fuel_standard', 'food_rations', 'med_basic'].forEach(id => available.add(id));
  
  // Add primary exports (abundant)
  economy.primaryExports.forEach(id => {
    available.add(id);
    // Also add related items
    const item = MARKET_ITEMS.find(i => i.id === id);
    if (item) {
      MARKET_ITEMS.filter(i => i.category === item.category && i.rarity !== 'legendary')
        .forEach(related => available.add(related.id));
    }
  });
  
  // Add some imports (but fewer)
  economy.primaryImports.slice(0, 3).forEach(id => available.add(id));
  
  // Add special items unique to this location
  economy.specialItems.forEach(id => available.add(id));
  
  // Add contraband based on black market activity
  if (economy.blackMarketActivity > 0.3) {
    const contrabandItems = MARKET_ITEMS.filter(i => i.category === 'contraband');
    const numContraband = Math.floor(economy.blackMarketActivity * contrabandItems.length);
    contrabandItems.slice(0, numContraband).forEach(item => available.add(item.id));
  }
  
  // Generate supply/demand modifiers
  const supplyDemand: Record<string, number> = {};
  available.forEach(itemId => {
    // Get dynamic supply/demand from tracker
    supplyDemand[itemId] = supplyDemandTracker.getSupplyDemandModifier(planetName, itemId);
  });
  
  // Generate special deals for exports
  const specialDeals: { itemId: string; discount: number }[] = [];
  const exportDeals = economy.primaryExports.filter(() => Math.random() > 0.7);
  exportDeals.forEach(itemId => {
    if (available.has(itemId)) {
      specialDeals.push({
        itemId,
        discount: 0.1 + Math.random() * 0.2 // 10-30% discount on exports
      });
    }
  });
  
  // Get recommended trade routes from this planet
  const tradeRoutes = findProfitableRoutes(planetName, 10000, 100);
  
  return {
    available: Array.from(available),
    supplyDemand,
    specialDeals,
    economyType: economy.economyType,
    description: economy.description,
    tradeRoutes: tradeRoutes.slice(0, 5) // Top 5 routes
  };
};

// Record a purchase (affects supply/demand)
export const recordPurchase = (
  planetName: string,
  itemId: string,
  quantity: number,
  price: number
): void => {
  supplyDemandTracker.recordPurchase(planetName, itemId, quantity, price);
};

// Record a sale (affects supply/demand)
export const recordSale = (
  planetName: string,
  itemId: string,
  quantity: number,
  price: number
): void => {
  supplyDemandTracker.recordSale(planetName, itemId, quantity, price);
};

// Get supply/demand indicator
export const getSupplyDemandIndicator = (
  planetName: string,
  itemId: string
): 'abundant' | 'normal' | 'scarce' => {
  const conditions = supplyDemandTracker.getConditions(planetName, itemId);
  
  if (conditions.supplyLevel > 70) return 'abundant';
  if (conditions.supplyLevel < 30) return 'scarce';
  return 'normal';
};

// Get demand level indicator
export const getDemandIndicator = (
  planetName: string,
  itemId: string
): 'high' | 'normal' | 'low' => {
  const conditions = supplyDemandTracker.getConditions(planetName, itemId);
  
  if (conditions.demandLevel > 70) return 'high';
  if (conditions.demandLevel < 30) return 'low';
  return 'normal';
};

// Check if a trade route is profitable
export const isProfitableTrade = (
  buyPrice: number,
  sellPrice: number,
  threshold: number = 1.2
): boolean => {
  return sellPrice >= buyPrice * threshold;
};

// Get price trend
export const getPriceTrend = (
  planetName: string,
  itemId: string
): 'rising' | 'falling' | 'stable' => {
  const conditions = supplyDemandTracker.getConditions(planetName, itemId);
  
  if (conditions.priceHistory.length < 2) return 'stable';
  
  const recent = conditions.priceHistory.slice(-5);
  const avgRecent = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
  const avgOlder = conditions.priceHistory.slice(0, -5).reduce((sum, p) => sum + p.price, 0) / 
                    Math.max(1, conditions.priceHistory.length - 5);
  
  if (avgRecent > avgOlder * 1.1) return 'rising';
  if (avgRecent < avgOlder * 0.9) return 'falling';
  return 'stable';
};

// Update market conditions over time
export const updateMarketConditions = (): void => {
  supplyDemandTracker.updateMarketConditions();
};

// Get item by ID
export const getItemById = (itemId: string): MarketItem | undefined => {
  return MARKET_ITEMS.find(item => item.id === itemId);
};

// Category display configuration
export const CATEGORY_CONFIG = {
  fuel: { name: 'Fuel', icon: '⛽', color: 'from-yellow-500 to-orange-500' },
  food: { name: 'Food', icon: '🍱', color: 'from-green-500 to-lime-500' },
  medicine: { name: 'Medicine', icon: '💊', color: 'from-blue-500 to-cyan-500' },
  electronics: { name: 'Electronics', icon: '💻', color: 'from-purple-500 to-pink-500' },
  weapons: { name: 'Weapons', icon: '🔫', color: 'from-red-500 to-rose-500' },
  materials: { name: 'Materials', icon: '🧱', color: 'from-amber-500 to-yellow-600' },
  equipment: { name: 'Equipment', icon: '🔧', color: 'from-indigo-500 to-blue-600' },
  luxury: { name: 'Luxury', icon: '💎', color: 'from-pink-500 to-purple-600' },
  research: { name: 'Research', icon: '🔬', color: 'from-teal-500 to-cyan-600' },
  survival: { name: 'Survival', icon: '🎒', color: 'from-green-600 to-emerald-600' },
  contraband: { name: 'Contraband', icon: '⚠️', color: 'from-gray-600 to-gray-800' }
};

// Export everything for backwards compatibility
export { PLANET_ECONOMIES, findProfitableRoutes, type TradeRoute } from './planetEconomies';
export type { PlanetEconomy, EconomyType } from './planetEconomies';
export type { MarketItem } from './expandedMarketData';