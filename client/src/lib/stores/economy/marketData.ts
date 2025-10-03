// Market data for trading system
export interface MarketItem {
  id: string;
  name: string;
  category: 'fuel' | 'food' | 'medicine' | 'electronics' | 'weapons' | 'contraband';
  basePrice: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  description: string;
  icon: string;
  weight: number; // Storage units per item
  illegal: boolean; // If true, carrying increases heat
  heatOnPurchase?: number; // Heat gained when buying (for contraband)
  factionModifiers?: {
    corporations?: number;
    independents?: number;
    outlaws?: number;
    military?: number;
  };
}

export const MARKET_ITEMS: MarketItem[] = [
  // Fuel Category
  {
    id: 'fuel_standard',
    name: 'Standard Fuel',
    category: 'fuel',
    basePrice: 10,
    rarity: 'common',
    description: 'Basic ship fuel for standard engines',
    icon: '⛽',
    weight: 1,
    illegal: false
  },
  {
    id: 'fuel_premium',
    name: 'Premium Fuel',
    category: 'fuel',
    basePrice: 25,
    rarity: 'uncommon',
    description: 'High-grade fuel with efficiency boost',
    icon: '⚡',
    weight: 1,
    illegal: false
  },
  {
    id: 'fuel_quantum',
    name: 'Quantum Fuel',
    category: 'fuel',
    basePrice: 100,
    rarity: 'rare',
    description: 'Advanced fuel for jump drives',
    icon: '🔮',
    weight: 2,
    illegal: false
  },

  // Food Category
  {
    id: 'food_rations',
    name: 'Food Rations',
    category: 'food',
    basePrice: 5,
    rarity: 'common',
    description: 'Basic preserved food supplies',
    icon: '🍱',
    weight: 1,
    illegal: false
  },
  {
    id: 'food_fresh',
    name: 'Fresh Produce',
    category: 'food',
    basePrice: 15,
    rarity: 'uncommon',
    description: 'Perishable fruits and vegetables',
    icon: '🥗',
    weight: 2,
    illegal: false,
    factionModifiers: {
      corporations: 1.2,
      independents: 0.9
    }
  },
  {
    id: 'food_luxury',
    name: 'Luxury Cuisine',
    category: 'food',
    basePrice: 50,
    rarity: 'rare',
    description: 'Gourmet meals for the elite',
    icon: '🍾',
    weight: 1,
    illegal: false,
    factionModifiers: {
      corporations: 1.5,
      outlaws: 0.7
    }
  },

  // Medicine Category
  {
    id: 'med_basic',
    name: 'Medical Supplies',
    category: 'medicine',
    basePrice: 20,
    rarity: 'common',
    description: 'Basic first aid and medications',
    icon: '🏥',
    weight: 1,
    illegal: false
  },
  {
    id: 'med_advanced',
    name: 'Advanced Medicine',
    category: 'medicine',
    basePrice: 60,
    rarity: 'uncommon',
    description: 'Specialized treatments and vaccines',
    icon: '💊',
    weight: 1,
    illegal: false,
    factionModifiers: {
      corporations: 1.1,
      independents: 0.95
    }
  },
  {
    id: 'med_nano',
    name: 'Nano-Medicine',
    category: 'medicine',
    basePrice: 200,
    rarity: 'rare',
    description: 'Cutting-edge nanobot treatments',
    icon: '🧬',
    weight: 1,
    illegal: false,
    factionModifiers: {
      corporations: 1.3,
      military: 0.8
    }
  },

  // Electronics Category
  {
    id: 'elec_components',
    name: 'Electronic Components',
    category: 'electronics',
    basePrice: 30,
    rarity: 'common',
    description: 'Basic circuits and processors',
    icon: '🔌',
    weight: 1,
    illegal: false
  },
  {
    id: 'elec_computers',
    name: 'Computer Systems',
    category: 'electronics',
    basePrice: 80,
    rarity: 'uncommon',
    description: 'Advanced computing hardware',
    icon: '💻',
    weight: 2,
    illegal: false,
    factionModifiers: {
      corporations: 1.15,
      outlaws: 0.85
    }
  },
  {
    id: 'elec_quantum',
    name: 'Quantum Processors',
    category: 'electronics',
    basePrice: 300,
    rarity: 'rare',
    description: 'State-of-the-art quantum computers',
    icon: '🖥️',
    weight: 2,
    illegal: false,
    factionModifiers: {
      corporations: 1.4,
      military: 0.9
    }
  },
  {
    id: 'elec_hacking',
    name: 'Hacking Tools',
    category: 'electronics',
    basePrice: 150,
    rarity: 'uncommon',
    description: 'Illegal cyber warfare equipment',
    icon: '🔓',
    weight: 1,
    illegal: true,
    heatOnPurchase: 5,
    factionModifiers: {
      outlaws: 0.7,
      corporations: 2.0
    }
  },

  // Weapons Category
  {
    id: 'weap_small',
    name: 'Small Arms',
    category: 'weapons',
    basePrice: 40,
    rarity: 'common',
    description: 'Personal defense weapons',
    icon: '🔫',
    weight: 2,
    illegal: false,
    factionModifiers: {
      military: 0.8,
      outlaws: 1.1
    }
  },
  {
    id: 'weap_heavy',
    name: 'Heavy Weapons',
    category: 'weapons',
    basePrice: 120,
    rarity: 'uncommon',
    description: 'Military-grade armaments',
    icon: '💣',
    weight: 3,
    illegal: true,
    heatOnPurchase: 10,
    factionModifiers: {
      military: 0.7,
      outlaws: 0.9,
      corporations: 1.5
    }
  },
  {
    id: 'weap_energy',
    name: 'Energy Weapons',
    category: 'weapons',
    basePrice: 250,
    rarity: 'rare',
    description: 'Advanced plasma and laser weapons',
    icon: '⚡',
    weight: 2,
    illegal: false,
    factionModifiers: {
      military: 0.75,
      corporations: 1.2
    }
  },
  {
    id: 'weap_explosives',
    name: 'Explosives',
    category: 'weapons',
    basePrice: 180,
    rarity: 'uncommon',
    description: 'Demolition charges and grenades',
    icon: '💥',
    weight: 3,
    illegal: true,
    heatOnPurchase: 15,
    factionModifiers: {
      outlaws: 0.8,
      corporations: 2.0,
      military: 1.3
    }
  },

  // Contraband Category
  {
    id: 'contra_drugs',
    name: 'Illegal Substances',
    category: 'contraband',
    basePrice: 100,
    rarity: 'uncommon',
    description: 'Banned chemical compounds',
    icon: '🧪',
    weight: 1,
    illegal: true,
    heatOnPurchase: 8,
    factionModifiers: {
      outlaws: 0.6,
      corporations: 2.5,
      military: 3.0
    }
  },
  {
    id: 'contra_data',
    name: 'Stolen Data',
    category: 'contraband',
    basePrice: 200,
    rarity: 'rare',
    description: 'Corporate secrets and classified intel',
    icon: '💾',
    weight: 0,
    illegal: true,
    heatOnPurchase: 12,
    factionModifiers: {
      outlaws: 0.5,
      corporations: 3.0,
      military: 2.5
    }
  },
  {
    id: 'contra_tech',
    name: 'Forbidden Technology',
    category: 'contraband',
    basePrice: 500,
    rarity: 'legendary',
    description: 'Banned experimental technology',
    icon: '☢️',
    weight: 2,
    illegal: true,
    heatOnPurchase: 20,
    factionModifiers: {
      outlaws: 0.4,
      corporations: 4.0,
      military: 3.5
    }
  },
  {
    id: 'contra_artifacts',
    name: 'Alien Artifacts',
    category: 'contraband',
    basePrice: 800,
    rarity: 'legendary',
    description: 'Mysterious extraterrestrial objects',
    icon: '👽',
    weight: 3,
    illegal: true,
    heatOnPurchase: 25,
    factionModifiers: {
      outlaws: 0.3,
      corporations: 5.0,
      military: 4.0
    }
  }
];

// Helper function to get items by category
export const getItemsByCategory = (category: MarketItem['category']): MarketItem[] => {
  return MARKET_ITEMS.filter(item => item.category === category);
};

// Helper function to calculate final price with modifiers
export const calculateFinalPrice = (
  item: MarketItem, 
  faction: string, 
  heatModifier: number = 1.0,
  supplyDemandModifier: number = 1.0
): number => {
  let price = item.basePrice;
  
  // Apply faction modifier
  const factionKey = faction.toLowerCase() as keyof typeof item.factionModifiers;
  if (item.factionModifiers && item.factionModifiers[factionKey]) {
    price *= item.factionModifiers[factionKey]!;
  }
  
  // Apply heat modifier (prices go up with heat)
  price *= heatModifier;
  
  // Apply supply/demand modifier
  price *= supplyDemandModifier;
  
  // Round to integer
  return Math.round(price);
};

// Helper function to determine if a trade is profitable
export const isProfitableTrade = (
  buyPrice: number,
  sellPrice: number,
  threshold: number = 1.2
): boolean => {
  return sellPrice >= buyPrice * threshold;
};

// Helper to generate random market conditions
export const generateMarketConditions = (planetName: string): {
  available: string[]; // Item IDs available at this station
  supplyDemand: Record<string, number>; // Supply/demand modifiers
  specialDeals: { itemId: string; discount: number }[]; // Special offers
} => {
  // Determine available items based on planet/faction
  const baseItems = MARKET_ITEMS.filter(item => item.rarity === 'common').map(i => i.id);
  const uncommonItems = MARKET_ITEMS.filter(item => item.rarity === 'uncommon').map(i => i.id);
  const rareItems = MARKET_ITEMS.filter(item => item.rarity === 'rare').map(i => i.id);
  
  // Always have basic items, randomly add others
  const available = [
    ...baseItems,
    ...uncommonItems.filter(() => Math.random() > 0.5),
    ...rareItems.filter(() => Math.random() > 0.8)
  ];
  
  // Generate supply/demand modifiers
  const supplyDemand: Record<string, number> = {};
  available.forEach(itemId => {
    // Random modifier between 0.7 and 1.3
    supplyDemand[itemId] = 0.7 + Math.random() * 0.6;
  });
  
  // Generate 1-3 special deals
  const numDeals = Math.floor(Math.random() * 3) + 1;
  const specialDeals: { itemId: string; discount: number }[] = [];
  const dealItems = [...available].sort(() => Math.random() - 0.5).slice(0, numDeals);
  
  dealItems.forEach(itemId => {
    specialDeals.push({
      itemId,
      discount: 0.1 + Math.random() * 0.3 // 10-40% discount
    });
  });
  
  return { available, supplyDemand, specialDeals };
};