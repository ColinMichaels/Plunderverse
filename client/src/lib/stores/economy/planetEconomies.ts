// Planet-specific economy profiles for the trading system
import { MarketItem } from './marketData';

export type EconomyType = 'agricultural' | 'industrial' | 'technological' | 'mining' | 'luxury' | 'frontier' | 'research' | 'gas_harvesting';

export interface PlanetEconomy {
  planet: string;
  economyType: EconomyType;
  description: string;
  primaryExports: string[]; // Item IDs that are abundant (cheap) here
  primaryImports: string[]; // Item IDs that are scarce (expensive) here
  specialItems: string[]; // Unique items only available here
  illegalItems: string[]; // Items that are particularly illegal here
  baseSupplyModifier: number; // 0.5 = abundant, 2.0 = scarce
  baseDemandModifier: number;
  blackMarketActivity: number; // 0-1, affects contraband prices
}

export const PLANET_ECONOMIES: Record<string, PlanetEconomy> = {
  Mercury: {
    planet: 'Mercury',
    economyType: 'mining',
    description: 'Solar energy harvesting and rare mineral extraction hub',
    primaryExports: [
      'solar_panels', 'heat_shields', 'rare_minerals', 'thermal_regulators',
      'solar_crystals', 'mercury_ore', 'fuel_quantum'
    ],
    primaryImports: [
      'food_rations', 'food_fresh', 'water_ice', 'cooling_systems',
      'med_basic', 'entertainment_media', 'luxury_goods'
    ],
    specialItems: ['solar_panels', 'heat_shields', 'solar_crystals', 'mercury_ore'],
    illegalItems: ['contra_drugs', 'stolen_tech'],
    baseSupplyModifier: 0.8,
    baseDemandModifier: 1.2,
    blackMarketActivity: 0.3
  },
  
  Venus: {
    planet: 'Venus',
    economyType: 'industrial',
    description: 'Atmospheric processing and acid-resistant material manufacturing',
    primaryExports: [
      'acid_resist_materials', 'atmospheric_processors', 'pressure_suits',
      'carbon_compounds', 'sulfur_compounds', 'industrial_chemicals'
    ],
    primaryImports: [
      'food_rations', 'med_advanced', 'electronics_consumer', 'water_ice',
      'entertainment_media', 'cooling_systems'
    ],
    specialItems: ['acid_resist_materials', 'atmospheric_processors', 'venus_bacteria'],
    illegalItems: ['weap_bioweapons', 'toxic_waste'],
    baseSupplyModifier: 0.9,
    baseDemandModifier: 1.1,
    blackMarketActivity: 0.4
  },
  
  Earth: {
    planet: 'Earth',
    economyType: 'technological',
    description: 'Central hub of commerce, technology, and cultural exports',
    primaryExports: [
      'electronics_consumer', 'entertainment_media', 'cultural_artifacts',
      'food_luxury', 'med_advanced', 'software_ai', 'fashion_items'
    ],
    primaryImports: [
      'rare_minerals', 'alien_artifacts', 'exotic_materials', 'helium3',
      'quantum_processors', 'research_data'
    ],
    specialItems: ['cultural_artifacts', 'entertainment_media', 'fashion_items'],
    illegalItems: ['alien_tech', 'contra_artifacts', 'weap_mass_destruction'],
    baseSupplyModifier: 1.0,
    baseDemandModifier: 1.0,
    blackMarketActivity: 0.5
  },
  
  Mars: {
    planet: 'Mars',
    economyType: 'frontier',
    description: 'Terraforming operations and construction material production',
    primaryExports: [
      'terraform_equipment', 'mining_tools', 'construction_materials',
      'mars_soil', 'water_extractors', 'dome_habitats'
    ],
    primaryImports: [
      'food_fresh', 'med_nano', 'entertainment_media', 'luxury_goods',
      'electronics_consumer', 'cultural_artifacts'
    ],
    specialItems: ['terraform_equipment', 'mars_soil', 'dome_habitats'],
    illegalItems: ['contra_drugs', 'weap_heavy'],
    baseSupplyModifier: 0.85,
    baseDemandModifier: 1.15,
    blackMarketActivity: 0.6
  },
  
  Jupiter: {
    planet: 'Jupiter',
    economyType: 'gas_harvesting',
    description: 'Gas giant resource extraction and luxury goods trading post',
    primaryExports: [
      'helium3', 'gas_harvest_equipment', 'hydrogen_fuel', 'metallic_hydrogen',
      'luxury_goods', 'exotic_gases', 'research_samples'
    ],
    primaryImports: [
      'food_rations', 'med_basic', 'pressure_suits', 'radiation_shielding',
      'construction_materials', 'entertainment_media'
    ],
    specialItems: ['gas_harvest_equipment', 'metallic_hydrogen', 'exotic_gases'],
    illegalItems: ['experimental_tech', 'classified_data'],
    baseSupplyModifier: 0.7,
    baseDemandModifier: 1.3,
    blackMarketActivity: 0.4
  },
  
  Saturn: {
    planet: 'Saturn',
    economyType: 'research',
    description: 'Scientific research station and rare ice crystal mining',
    primaryExports: [
      'research_data', 'exotic_ice', 'titan_methane', 'ring_minerals',
      'scientific_instruments', 'cryogenic_samples'
    ],
    primaryImports: [
      'food_all', 'med_advanced', 'quantum_processors', 'lab_equipment',
      'entertainment_media', 'coffee_stimulants'
    ],
    specialItems: ['exotic_ice', 'titan_methane', 'ring_minerals', 'cryogenic_samples'],
    illegalItems: ['classified_research', 'bioweapons'],
    baseSupplyModifier: 0.75,
    baseDemandModifier: 1.25,
    blackMarketActivity: 0.3
  },
  
  Uranus: {
    planet: 'Uranus',
    economyType: 'research',
    description: 'Deep space research and exotic material processing',
    primaryExports: [
      'magnetic_materials', 'exotic_diamonds', 'quantum_crystals',
      'research_data', 'anomaly_samples'
    ],
    primaryImports: [
      'food_rations', 'med_basic', 'fuel_quantum', 'electronics_consumer',
      'entertainment_media', 'survival_gear'
    ],
    specialItems: ['exotic_diamonds', 'quantum_crystals', 'anomaly_samples'],
    illegalItems: ['alien_tech', 'dimensional_artifacts'],
    baseSupplyModifier: 0.8,
    baseDemandModifier: 1.4,
    blackMarketActivity: 0.5
  },
  
  Neptune: {
    planet: 'Neptune',
    economyType: 'frontier',
    description: 'Extreme frontier outpost for deep space operations',
    primaryExports: [
      'tritium_fuel', 'dark_ice', 'storm_crystals', 'deep_minerals',
      'survival_gear'
    ],
    primaryImports: [
      'food_all', 'med_all', 'fuel_standard', 'electronics_basic',
      'entertainment_media', 'heat_generators'
    ],
    specialItems: ['dark_ice', 'storm_crystals', 'tritium_fuel'],
    illegalItems: ['all_contraband'],
    baseSupplyModifier: 0.6,
    baseDemandModifier: 1.6,
    blackMarketActivity: 0.8
  },
  
  // Space Stations
  'Corporate Station': {
    planet: 'Corporate Station',
    economyType: 'technological',
    description: 'High-tech corporate trading hub',
    primaryExports: ['electronics_advanced', 'software_ai', 'quantum_processors'],
    primaryImports: ['rare_minerals', 'research_data', 'luxury_goods'],
    specialItems: ['corporate_secrets', 'stock_options'],
    illegalItems: ['contra_data', 'hacking_tools'],
    baseSupplyModifier: 1.1,
    baseDemandModifier: 0.9,
    blackMarketActivity: 0.2
  },
  
  'Outlaw Station': {
    planet: 'Outlaw Station',
    economyType: 'frontier',
    description: 'Lawless trading post for smugglers and pirates',
    primaryExports: ['weap_all', 'contra_all', 'stolen_goods'],
    primaryImports: ['food_basic', 'med_basic', 'fuel_standard'],
    specialItems: ['pirate_maps', 'forged_documents'],
    illegalItems: [], // Nothing is illegal here
    baseSupplyModifier: 0.5,
    baseDemandModifier: 1.8,
    blackMarketActivity: 1.0
  },
  
  'Military Outpost': {
    planet: 'Military Outpost',
    economyType: 'industrial',
    description: 'Military supply depot and defense station',
    primaryExports: ['weap_military', 'armor_plating', 'tactical_gear'],
    primaryImports: ['food_rations', 'med_combat', 'fuel_military'],
    specialItems: ['military_intel', 'combat_stims'],
    illegalItems: ['contra_all', 'alien_tech'],
    baseSupplyModifier: 0.9,
    baseDemandModifier: 1.1,
    blackMarketActivity: 0.1
  }
};

// Calculate dynamic supply and demand based on recent trades
export interface MarketConditions {
  supplyLevel: number; // 0-100, affects price (low supply = high price)
  demandLevel: number; // 0-100, affects price (high demand = high price) 
  lastTraded: number; // Timestamp
  priceHistory: { timestamp: number; price: number }[];
}

// Get price modifier based on planet economy
export const getPlanetPriceModifier = (
  itemId: string,
  planetName: string,
  isBuying: boolean
): number => {
  const economy = PLANET_ECONOMIES[planetName];
  if (!economy) return 1.0;
  
  let modifier = 1.0;
  
  // Check if item is a primary export (abundant, cheaper to buy)
  if (economy.primaryExports.includes(itemId)) {
    modifier = isBuying ? 0.6 : 0.5; // Cheap to buy, very cheap to sell
  }
  // Check if item is a primary import (scarce, expensive to buy)
  else if (economy.primaryImports.includes(itemId)) {
    modifier = isBuying ? 1.6 : 1.8; // Expensive to buy, very profitable to sell
  }
  // Special items unique to this planet
  else if (economy.specialItems.includes(itemId)) {
    modifier = isBuying ? 0.8 : 0.4; // Only available here, cheap locally
  }
  // Illegal items have extreme markups
  else if (economy.illegalItems.includes(itemId)) {
    modifier = isBuying ? 2.5 : 3.0; // Very risky, very expensive
  }
  
  // Apply black market modifier for contraband
  if (itemId.includes('contra_') || itemId.includes('stolen_')) {
    const blackMarketBonus = economy.blackMarketActivity;
    modifier *= (2.0 - blackMarketBonus); // High black market activity = lower contraband prices
  }
  
  return modifier;
};

// Get trade route recommendations
export interface TradeRoute {
  from: string;
  to: string;
  item: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitMargin: number;
  risk: 'low' | 'medium' | 'high';
}

export const findProfitableRoutes = (
  currentPlanet: string,
  availableCredits: number,
  cargoSpace: number
): TradeRoute[] => {
  const routes: TradeRoute[] = [];
  const currentEconomy = PLANET_ECONOMIES[currentPlanet];
  
  if (!currentEconomy) return routes;
  
  // Check exports from current planet
  currentEconomy.primaryExports.forEach(itemId => {
    // Find planets that import this item
    Object.entries(PLANET_ECONOMIES).forEach(([planetName, economy]) => {
      if (planetName === currentPlanet) return;
      
      if (economy.primaryImports.includes(itemId)) {
        // Calculate potential profit
        const buyModifier = getPlanetPriceModifier(itemId, currentPlanet, true);
        const sellModifier = getPlanetPriceModifier(itemId, planetName, false);
        
        // Rough price calculation (would use actual item base price)
        const estimatedBuyPrice = 100 * buyModifier;
        const estimatedSellPrice = 100 * sellModifier;
        const profit = estimatedSellPrice - estimatedBuyPrice;
        const profitMargin = (profit / estimatedBuyPrice) * 100;
        
        if (profit > 0 && estimatedBuyPrice <= availableCredits) {
          routes.push({
            from: currentPlanet,
            to: planetName,
            item: itemId,
            buyPrice: Math.round(estimatedBuyPrice),
            sellPrice: Math.round(estimatedSellPrice),
            profit: Math.round(profit),
            profitMargin: Math.round(profitMargin),
            risk: itemId.includes('contra_') || itemId.includes('weap_') ? 'high' :
                  profitMargin > 50 ? 'medium' : 'low'
          });
        }
      }
    });
  });
  
  // Sort by profit margin
  return routes.sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 10);
};

// Dynamic supply/demand adjustments
export class SupplyDemandTracker {
  private marketConditions: Map<string, Map<string, MarketConditions>> = new Map();
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage() {
    const stored = localStorage.getItem('market-conditions');
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([planet, items]) => {
        const planetMap = new Map<string, MarketConditions>();
        Object.entries(items as any).forEach(([itemId, conditions]) => {
          planetMap.set(itemId, conditions as MarketConditions);
        });
        this.marketConditions.set(planet, planetMap);
      });
    }
  }
  
  private saveToStorage() {
    const data: any = {};
    this.marketConditions.forEach((items, planet) => {
      data[planet] = {};
      items.forEach((conditions, itemId) => {
        data[planet][itemId] = conditions;
      });
    });
    localStorage.setItem('market-conditions', JSON.stringify(data));
  }
  
  getConditions(planet: string, itemId: string): MarketConditions {
    if (!this.marketConditions.has(planet)) {
      this.marketConditions.set(planet, new Map());
    }
    
    const planetConditions = this.marketConditions.get(planet)!;
    if (!planetConditions.has(itemId)) {
      planetConditions.set(itemId, {
        supplyLevel: 50,
        demandLevel: 50,
        lastTraded: Date.now(),
        priceHistory: []
      });
    }
    
    return planetConditions.get(itemId)!;
  }
  
  recordPurchase(planet: string, itemId: string, quantity: number, price: number) {
    const conditions = this.getConditions(planet, itemId);
    
    // Buying reduces supply, increases demand
    conditions.supplyLevel = Math.max(0, conditions.supplyLevel - (quantity * 2));
    conditions.demandLevel = Math.min(100, conditions.demandLevel + (quantity * 1.5));
    conditions.lastTraded = Date.now();
    conditions.priceHistory.push({ timestamp: Date.now(), price });
    
    // Keep only last 20 price points
    if (conditions.priceHistory.length > 20) {
      conditions.priceHistory.shift();
    }
    
    this.saveToStorage();
  }
  
  recordSale(planet: string, itemId: string, quantity: number, price: number) {
    const conditions = this.getConditions(planet, itemId);
    
    // Selling increases supply, reduces demand
    conditions.supplyLevel = Math.min(100, conditions.supplyLevel + (quantity * 2));
    conditions.demandLevel = Math.max(0, conditions.demandLevel - (quantity * 1.5));
    conditions.lastTraded = Date.now();
    conditions.priceHistory.push({ timestamp: Date.now(), price });
    
    // Keep only last 20 price points
    if (conditions.priceHistory.length > 20) {
      conditions.priceHistory.shift();
    }
    
    this.saveToStorage();
  }
  
  getSupplyDemandModifier(planet: string, itemId: string): number {
    const conditions = this.getConditions(planet, itemId);
    
    // Low supply = higher price, high demand = higher price
    const supplyModifier = 1.5 - (conditions.supplyLevel / 100); // 1.5 to 0.5
    const demandModifier = 0.5 + (conditions.demandLevel / 100); // 0.5 to 1.5
    
    return (supplyModifier + demandModifier) / 2;
  }
  
  // Gradually restore supply/demand to equilibrium over time
  updateMarketConditions() {
    const now = Date.now();
    const hourInMs = 3600000;
    
    this.marketConditions.forEach(planetConditions => {
      planetConditions.forEach(conditions => {
        const timeSinceLastTrade = now - conditions.lastTraded;
        const hoursElapsed = timeSinceLastTrade / hourInMs;
        
        // Restore 5% per hour towards equilibrium (50)
        const restorationRate = Math.min(hoursElapsed * 5, 50);
        
        if (conditions.supplyLevel < 50) {
          conditions.supplyLevel = Math.min(50, conditions.supplyLevel + restorationRate);
        } else if (conditions.supplyLevel > 50) {
          conditions.supplyLevel = Math.max(50, conditions.supplyLevel - restorationRate);
        }
        
        if (conditions.demandLevel < 50) {
          conditions.demandLevel = Math.min(50, conditions.demandLevel + restorationRate);
        } else if (conditions.demandLevel > 50) {
          conditions.demandLevel = Math.max(50, conditions.demandLevel - restorationRate);
        }
      });
    });
    
    this.saveToStorage();
  }
}

export const supplyDemandTracker = new SupplyDemandTracker();