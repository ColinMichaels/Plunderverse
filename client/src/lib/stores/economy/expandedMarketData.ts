// Expanded market data with planet-specific items
export interface MarketItem {
  id: string;
  name: string;
  category: 'fuel' | 'food' | 'medicine' | 'electronics' | 'weapons' | 'contraband' | 
            'materials' | 'equipment' | 'luxury' | 'research' | 'survival';
  basePrice: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  description: string;
  icon: string;
  weight: number;
  illegal: boolean;
  heatOnPurchase?: number;
  factionModifiers?: {
    corporations?: number;
    independents?: number;
    outlaws?: number;
    military?: number;
  };
}

// Planet-specific items
export const EXPANDED_MARKET_ITEMS: MarketItem[] = [
  // ============ FUEL CATEGORY ============
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
  {
    id: 'hydrogen_fuel',
    name: 'Hydrogen Fuel',
    category: 'fuel',
    basePrice: 35,
    rarity: 'common',
    description: 'Extracted from gas giants',
    icon: '💧',
    weight: 1,
    illegal: false
  },
  {
    id: 'helium3',
    name: 'Helium-3',
    category: 'fuel',
    basePrice: 150,
    rarity: 'uncommon',
    description: 'Fusion reactor fuel from Jupiter',
    icon: '🔷',
    weight: 1,
    illegal: false
  },
  {
    id: 'tritium_fuel',
    name: 'Tritium Fuel',
    category: 'fuel',
    basePrice: 200,
    rarity: 'rare',
    description: 'Ultra-efficient deep space fuel',
    icon: '✨',
    weight: 1,
    illegal: false
  },

  // ============ FOOD CATEGORY ============
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
    description: 'Perishable fruits and vegetables from Earth',
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
  {
    id: 'water_ice',
    name: 'Water Ice',
    category: 'food',
    basePrice: 8,
    rarity: 'common',
    description: 'Essential for life support and consumption',
    icon: '🧊',
    weight: 2,
    illegal: false
  },
  {
    id: 'coffee_stimulants',
    name: 'Coffee & Stimulants',
    category: 'food',
    basePrice: 30,
    rarity: 'uncommon',
    description: 'Keeps researchers and miners alert',
    icon: '☕',
    weight: 1,
    illegal: false
  },

  // ============ MEDICINE CATEGORY ============
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
  {
    id: 'med_combat',
    name: 'Combat Stims',
    category: 'medicine',
    basePrice: 80,
    rarity: 'uncommon',
    description: 'Military-grade performance enhancers',
    icon: '💉',
    weight: 1,
    illegal: true,
    heatOnPurchase: 5,
    factionModifiers: {
      military: 0.6,
      outlaws: 0.8
    }
  },
  {
    id: 'venus_bacteria',
    name: 'Venus Bacteria Samples',
    category: 'medicine',
    basePrice: 300,
    rarity: 'rare',
    description: 'Extremophile bacteria for medical research',
    icon: '🦠',
    weight: 1,
    illegal: false
  },

  // ============ ELECTRONICS CATEGORY ============
  {
    id: 'electronics_consumer',
    name: 'Consumer Electronics',
    category: 'electronics',
    basePrice: 40,
    rarity: 'common',
    description: 'Personal devices and entertainment systems from Earth',
    icon: '📱',
    weight: 1,
    illegal: false
  },
  {
    id: 'quantum_processors',
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
    id: 'software_ai',
    name: 'AI Software',
    category: 'electronics',
    basePrice: 150,
    rarity: 'uncommon',
    description: 'Advanced artificial intelligence systems',
    icon: '🤖',
    weight: 0,
    illegal: false
  },
  {
    id: 'hacking_tools',
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
  {
    id: 'scientific_instruments',
    name: 'Scientific Instruments',
    category: 'electronics',
    basePrice: 120,
    rarity: 'uncommon',
    description: 'Research equipment and sensors',
    icon: '🔬',
    weight: 2,
    illegal: false
  },

  // ============ WEAPONS CATEGORY ============
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
    id: 'tactical_gear',
    name: 'Tactical Gear',
    category: 'weapons',
    basePrice: 60,
    rarity: 'common',
    description: 'Military armor and equipment',
    icon: '🛡️',
    weight: 3,
    illegal: false
  },
  {
    id: 'weap_bioweapons',
    name: 'Bioweapons',
    category: 'weapons',
    basePrice: 500,
    rarity: 'legendary',
    description: 'Highly illegal biological warfare agents',
    icon: '☣️',
    weight: 1,
    illegal: true,
    heatOnPurchase: 30,
    factionModifiers: {
      outlaws: 0.5,
      corporations: 5.0,
      military: 4.0
    }
  },

  // ============ MATERIALS CATEGORY ============
  {
    id: 'construction_materials',
    name: 'Construction Materials',
    category: 'materials',
    basePrice: 25,
    rarity: 'common',
    description: 'Basic building supplies from Mars',
    icon: '🧱',
    weight: 3,
    illegal: false
  },
  {
    id: 'rare_minerals',
    name: 'Rare Minerals',
    category: 'materials',
    basePrice: 100,
    rarity: 'uncommon',
    description: 'Precious metals from Mercury',
    icon: '💎',
    weight: 2,
    illegal: false
  },
  {
    id: 'acid_resist_materials',
    name: 'Acid-Resistant Materials',
    category: 'materials',
    basePrice: 80,
    rarity: 'uncommon',
    description: 'Special compounds from Venus atmosphere',
    icon: '🧪',
    weight: 2,
    illegal: false
  },
  {
    id: 'solar_crystals',
    name: 'Solar Crystals',
    category: 'materials',
    basePrice: 150,
    rarity: 'rare',
    description: 'Heat-forged crystals from Mercury',
    icon: '🔶',
    weight: 1,
    illegal: false
  },
  {
    id: 'metallic_hydrogen',
    name: 'Metallic Hydrogen',
    category: 'materials',
    basePrice: 400,
    rarity: 'legendary',
    description: 'Exotic matter from Jupiter\'s core',
    icon: '💠',
    weight: 1,
    illegal: false
  },
  {
    id: 'exotic_ice',
    name: 'Exotic Ice',
    category: 'materials',
    basePrice: 120,
    rarity: 'rare',
    description: 'Strange ice formations from Saturn',
    icon: '❄️',
    weight: 2,
    illegal: false
  },
  {
    id: 'exotic_diamonds',
    name: 'Diamond Rain Crystals',
    category: 'materials',
    basePrice: 350,
    rarity: 'legendary',
    description: 'Diamonds formed in Uranus atmosphere',
    icon: '💎',
    weight: 1,
    illegal: false
  },
  {
    id: 'dark_ice',
    name: 'Dark Ice',
    category: 'materials',
    basePrice: 180,
    rarity: 'rare',
    description: 'Mysterious ice from Neptune',
    icon: '🌑',
    weight: 2,
    illegal: false
  },
  {
    id: 'storm_crystals',
    name: 'Storm Crystals',
    category: 'materials',
    basePrice: 250,
    rarity: 'rare',
    description: 'Crystals charged by Neptune\'s storms',
    icon: '⛈️',
    weight: 1,
    illegal: false
  },

  // ============ EQUIPMENT CATEGORY ============
  {
    id: 'mining_tools',
    name: 'Mining Tools',
    category: 'equipment',
    basePrice: 45,
    rarity: 'common',
    description: 'Essential tools for asteroid mining',
    icon: '⛏️',
    weight: 2,
    illegal: false
  },
  {
    id: 'terraform_equipment',
    name: 'Terraforming Equipment',
    category: 'equipment',
    basePrice: 200,
    rarity: 'uncommon',
    description: 'Advanced Mars terraforming technology',
    icon: '🌍',
    weight: 4,
    illegal: false
  },
  {
    id: 'solar_panels',
    name: 'Solar Panels',
    category: 'equipment',
    basePrice: 60,
    rarity: 'common',
    description: 'High-efficiency panels from Mercury',
    icon: '☀️',
    weight: 3,
    illegal: false
  },
  {
    id: 'heat_shields',
    name: 'Heat Shields',
    category: 'equipment',
    basePrice: 90,
    rarity: 'uncommon',
    description: 'Essential protection near the Sun',
    icon: '🛡️',
    weight: 3,
    illegal: false
  },
  {
    id: 'atmospheric_processors',
    name: 'Atmospheric Processors',
    category: 'equipment',
    basePrice: 180,
    rarity: 'uncommon',
    description: 'Venus-designed air processing systems',
    icon: '💨',
    weight: 4,
    illegal: false
  },
  {
    id: 'gas_harvest_equipment',
    name: 'Gas Harvesting Equipment',
    category: 'equipment',
    basePrice: 150,
    rarity: 'uncommon',
    description: 'Specialized gear for Jupiter operations',
    icon: '🎈',
    weight: 3,
    illegal: false
  },
  {
    id: 'pressure_suits',
    name: 'Pressure Suits',
    category: 'equipment',
    basePrice: 70,
    rarity: 'common',
    description: 'High-pressure environment protection',
    icon: '👨‍🚀',
    weight: 2,
    illegal: false
  },
  {
    id: 'radiation_shielding',
    name: 'Radiation Shielding',
    category: 'equipment',
    basePrice: 85,
    rarity: 'common',
    description: 'Protection from cosmic radiation',
    icon: '☢️',
    weight: 3,
    illegal: false
  },
  {
    id: 'dome_habitats',
    name: 'Dome Habitats',
    category: 'equipment',
    basePrice: 300,
    rarity: 'rare',
    description: 'Prefab Mars colony structures',
    icon: '🏠',
    weight: 5,
    illegal: false
  },

  // ============ LUXURY CATEGORY ============
  {
    id: 'luxury_goods',
    name: 'Luxury Goods',
    category: 'luxury',
    basePrice: 150,
    rarity: 'uncommon',
    description: 'Fine items from Jupiter\'s stations',
    icon: '💍',
    weight: 1,
    illegal: false
  },
  {
    id: 'entertainment_media',
    name: 'Entertainment Media',
    category: 'luxury',
    basePrice: 30,
    rarity: 'common',
    description: 'Movies, games, and VR from Earth',
    icon: '🎮',
    weight: 0,
    illegal: false
  },
  {
    id: 'cultural_artifacts',
    name: 'Cultural Artifacts',
    category: 'luxury',
    basePrice: 200,
    rarity: 'rare',
    description: 'Earth\'s historical and cultural items',
    icon: '🗿',
    weight: 2,
    illegal: false
  },
  {
    id: 'fashion_items',
    name: 'Designer Fashion',
    category: 'luxury',
    basePrice: 100,
    rarity: 'uncommon',
    description: 'Latest fashion from Earth boutiques',
    icon: '👗',
    weight: 1,
    illegal: false
  },

  // ============ RESEARCH CATEGORY ============
  {
    id: 'research_data',
    name: 'Research Data',
    category: 'research',
    basePrice: 120,
    rarity: 'uncommon',
    description: 'Scientific data from Saturn labs',
    icon: '📊',
    weight: 0,
    illegal: false
  },
  {
    id: 'research_samples',
    name: 'Research Samples',
    category: 'research',
    basePrice: 180,
    rarity: 'rare',
    description: 'Biological and geological specimens',
    icon: '🧫',
    weight: 1,
    illegal: false
  },
  {
    id: 'anomaly_samples',
    name: 'Anomaly Samples',
    category: 'research',
    basePrice: 400,
    rarity: 'legendary',
    description: 'Strange materials from Uranus',
    icon: '🌀',
    weight: 1,
    illegal: false
  },
  {
    id: 'quantum_crystals',
    name: 'Quantum Crystals',
    category: 'research',
    basePrice: 350,
    rarity: 'rare',
    description: 'Crystals with quantum properties',
    icon: '💠',
    weight: 1,
    illegal: false
  },
  {
    id: 'titan_methane',
    name: 'Titan Methane',
    category: 'research',
    basePrice: 140,
    rarity: 'uncommon',
    description: 'Liquid methane from Saturn\'s moon',
    icon: '💧',
    weight: 2,
    illegal: false
  },
  {
    id: 'ring_minerals',
    name: 'Saturn Ring Minerals',
    category: 'research',
    basePrice: 160,
    rarity: 'rare',
    description: 'Unique minerals from Saturn\'s rings',
    icon: '💫',
    weight: 1,
    illegal: false
  },

  // ============ SURVIVAL CATEGORY ============
  {
    id: 'survival_gear',
    name: 'Survival Gear',
    category: 'survival',
    basePrice: 50,
    rarity: 'common',
    description: 'Essential frontier survival equipment',
    icon: '🎒',
    weight: 2,
    illegal: false
  },
  {
    id: 'heat_generators',
    name: 'Heat Generators',
    category: 'survival',
    basePrice: 75,
    rarity: 'common',
    description: 'Portable heating for cold environments',
    icon: '🔥',
    weight: 3,
    illegal: false
  },
  {
    id: 'cooling_systems',
    name: 'Cooling Systems',
    category: 'survival',
    basePrice: 80,
    rarity: 'common',
    description: 'Essential for hot planet operations',
    icon: '❄️',
    weight: 3,
    illegal: false
  },
  {
    id: 'water_extractors',
    name: 'Water Extractors',
    category: 'survival',
    basePrice: 65,
    rarity: 'common',
    description: 'Extract water from Mars ice',
    icon: '💧',
    weight: 3,
    illegal: false
  },

  // ============ CONTRABAND CATEGORY ============
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
    id: 'stolen_data',
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
    id: 'alien_tech',
    name: 'Alien Technology',
    category: 'contraband',
    basePrice: 600,
    rarity: 'legendary',
    description: 'Forbidden extraterrestrial tech',
    icon: '🛸',
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
    id: 'alien_artifacts',
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
  },
  {
    id: 'classified_research',
    name: 'Classified Research',
    category: 'contraband',
    basePrice: 300,
    rarity: 'rare',
    description: 'Top secret government research',
    icon: '📝',
    weight: 0,
    illegal: true,
    heatOnPurchase: 15,
    factionModifiers: {
      outlaws: 0.5,
      military: 4.0,
      corporations: 2.0
    }
  },
  {
    id: 'forged_documents',
    name: 'Forged Documents',
    category: 'contraband',
    basePrice: 80,
    rarity: 'uncommon',
    description: 'Fake IDs and ship registrations',
    icon: '📄',
    weight: 0,
    illegal: true,
    heatOnPurchase: 6,
    factionModifiers: {
      outlaws: 0.4,
      corporations: 2.0,
      military: 2.5
    }
  },
  {
    id: 'pirate_maps',
    name: 'Pirate Navigation Data',
    category: 'contraband',
    basePrice: 150,
    rarity: 'rare',
    description: 'Secret routes and hidden stations',
    icon: '🗺️',
    weight: 0,
    illegal: true,
    heatOnPurchase: 8,
    factionModifiers: {
      outlaws: 0.3,
      corporations: 3.0,
      military: 2.5
    }
  },
  {
    id: 'military_intel',
    name: 'Military Intelligence',
    category: 'contraband',
    basePrice: 250,
    rarity: 'rare',
    description: 'Stolen military deployment data',
    icon: '🎖️',
    weight: 0,
    illegal: true,
    heatOnPurchase: 18,
    factionModifiers: {
      outlaws: 0.6,
      military: 5.0,
      corporations: 1.5
    }
  },
  {
    id: 'corporate_secrets',
    name: 'Corporate Secrets',
    category: 'contraband',
    basePrice: 220,
    rarity: 'rare',
    description: 'Industrial espionage data',
    icon: '💼',
    weight: 0,
    illegal: true,
    heatOnPurchase: 10,
    factionModifiers: {
      outlaws: 0.5,
      corporations: 4.0,
      military: 1.5
    }
  },
  {
    id: 'toxic_waste',
    name: 'Toxic Waste',
    category: 'contraband',
    basePrice: 50,
    rarity: 'uncommon',
    description: 'Illegal industrial waste disposal',
    icon: '☠️',
    weight: 3,
    illegal: true,
    heatOnPurchase: 5,
    factionModifiers: {
      outlaws: 0.8,
      corporations: 1.5,
      military: 2.0
    }
  }
];