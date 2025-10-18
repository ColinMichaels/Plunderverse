import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UpgradeTier = 'basic' | 'advanced' | 'elite' | 'legendary';
export type UpgradeCategory = 'hull' | 'shields' | 'engine' | 'weapons' | 'cargo' | 'special';

export interface UpgradeBenefit {
  label: string;
  value: string;
  improvement: number; // percentage improvement
}

export interface UpgradeRequirements {
  level?: number;
  reputation?: number;
  previousUpgrade?: string;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  tier: UpgradeTier;
  category: UpgradeCategory;
  cost: number;
  requirements: UpgradeRequirements;
  benefits: UpgradeBenefit[];
  // Effects to apply when equipped
  effects?: {
    hullBonus?: number;
    shieldBonus?: number;
    speedBonus?: number;
    cargoBonus?: number;
    damageBonus?: number;
    fuelEfficiencyBonus?: number;
    [key: string]: number | undefined;
  };
}

interface UpgradesState {
  // Catalog of all available upgrades
  catalog: Upgrade[];
  
  // IDs of owned upgrades
  ownedUpgrades: string[];
  
  // IDs of currently equipped upgrades (max one per category)
  equippedUpgrades: string[];
  
  // Actions
  initializeCatalog: () => void;
  purchaseUpgrade: (upgradeId: string) => boolean;
  equipUpgrade: (upgradeId: string) => boolean;
  unequipUpgrade: (upgradeId: string) => boolean;
  isOwned: (upgradeId: string) => boolean;
  isEquipped: (upgradeId: string) => boolean;
  meetsRequirements: (upgradeId: string, playerLevel: number, reputation: number) => boolean;
  getUpgrade: (upgradeId: string) => Upgrade | undefined;
  getOwnedUpgrades: () => Upgrade[];
  getEquippedUpgrades: () => Upgrade[];
  getUpgradesByCategory: (category: UpgradeCategory) => Upgrade[];
  getTotalBonuses: () => Record<string, number>;
}

// Define the upgrade catalog
const UPGRADE_CATALOG: Upgrade[] = [
  // Hull Upgrades
  {
    id: 'hull-reinforced',
    name: 'Reinforced Hull',
    description: 'Strengthened hull plating for better damage resistance',
    tier: 'basic',
    category: 'hull',
    cost: 400,
    requirements: { level: 2 },
    benefits: [
      { label: 'Hull Strength', value: '+20%', improvement: 20 },
      { label: 'Damage Resistance', value: '+10%', improvement: 10 }
    ],
    effects: {
      hullBonus: 20,
      damageResistanceBonus: 10
    }
  },
  {
    id: 'hull-titanium',
    name: 'Titanium Armor',
    description: 'Advanced titanium composite armor plating',
    tier: 'advanced',
    category: 'hull',
    cost: 1500,
    requirements: { level: 5, previousUpgrade: 'hull-reinforced' },
    benefits: [
      { label: 'Hull Strength', value: '+40%', improvement: 40 },
      { label: 'Damage Resistance', value: '+20%', improvement: 20 },
      { label: 'Weight Reduction', value: '-15%', improvement: 15 }
    ],
    effects: {
      hullBonus: 40,
      damageResistanceBonus: 20,
      speedBonus: 5
    }
  },
  {
    id: 'hull-quantum',
    name: 'Quantum Armor',
    description: 'Experimental quantum-phased armor technology',
    tier: 'legendary',
    category: 'hull',
    cost: 8000,
    requirements: { level: 10, reputation: 80 },
    benefits: [
      { label: 'Hull Strength', value: '+100%', improvement: 100 },
      { label: 'Damage Resistance', value: '+50%', improvement: 50 },
      { label: 'Self-Repair', value: '+5/min', improvement: 5 }
    ],
    effects: {
      hullBonus: 100,
      damageResistanceBonus: 50,
      selfRepairBonus: 5
    }
  },
  
  // Shield Upgrades
  {
    id: 'shield-enhanced',
    name: 'Enhanced Shields',
    description: 'Improved shield generators with faster recharge',
    tier: 'basic',
    category: 'shields',
    cost: 500,
    requirements: { level: 2 },
    benefits: [
      { label: 'Shield Capacity', value: '+25%', improvement: 25 },
      { label: 'Recharge Rate', value: '+15%', improvement: 15 }
    ],
    effects: {
      shieldBonus: 25,
      shieldRechargeBonus: 15
    }
  },
  {
    id: 'shield-plasma',
    name: 'Plasma Shields',
    description: 'High-energy plasma shield system',
    tier: 'elite',
    category: 'shields',
    cost: 4000,
    requirements: { level: 7, previousUpgrade: 'shield-enhanced' },
    benefits: [
      { label: 'Shield Capacity', value: '+60%', improvement: 60 },
      { label: 'Recharge Rate', value: '+30%', improvement: 30 },
      { label: 'Energy Efficiency', value: '+20%', improvement: 20 }
    ],
    effects: {
      shieldBonus: 60,
      shieldRechargeBonus: 30,
      fuelEfficiencyBonus: 10
    }
  },
  
  // Engine Upgrades
  {
    id: 'engine-turbo',
    name: 'Turbo Thrusters',
    description: 'High-performance thruster system for increased speed',
    tier: 'basic',
    category: 'engine',
    cost: 600,
    requirements: { level: 3 },
    benefits: [
      { label: 'Max Speed', value: '+30%', improvement: 30 },
      { label: 'Acceleration', value: '+20%', improvement: 20 }
    ],
    effects: {
      speedBonus: 30,
      accelerationBonus: 20,
      thrustEfficiencyBonus: 20
    }
  },
  {
    id: 'engine-warp',
    name: 'Warp Drive',
    description: 'Enables faster-than-light travel between systems',
    tier: 'advanced',
    category: 'engine',
    cost: 2500,
    requirements: { level: 6 },
    benefits: [
      { label: 'Warp Capability', value: 'Enabled', improvement: 100 },
      { label: 'Jump Range', value: '+50%', improvement: 50 }
    ],
    effects: {
      warpCapabilityBonus: 100,
      jumpRangeBonus: 50
    }
  },
  {
    id: 'engine-quantum',
    name: 'Quantum Drive',
    description: 'Revolutionary quantum propulsion technology',
    tier: 'legendary',
    category: 'engine',
    cost: 9000,
    requirements: { level: 12, reputation: 90, previousUpgrade: 'engine-warp' },
    benefits: [
      { label: 'Max Speed', value: '+100%', improvement: 100 },
      { label: 'Fuel Efficiency', value: '+50%', improvement: 50 },
      { label: 'Instant Jump', value: 'Enabled', improvement: 100 }
    ],
    effects: {
      speedBonus: 100,
      fuelEfficiencyBonus: 50,
      instantJumpBonus: 100
    }
  },
  
  // Weapons Upgrades
  {
    id: 'weapons-laser',
    name: 'Laser Cannon Mk2',
    description: 'Upgraded mining laser with combat capabilities',
    tier: 'basic',
    category: 'weapons',
    cost: 700,
    requirements: { level: 3 },
    benefits: [
      { label: 'Damage', value: '+25%', improvement: 25 },
      { label: 'Fire Rate', value: '+15%', improvement: 15 }
    ],
    effects: {
      damageBonus: 25,
      fireRateBonus: 15
    }
  },
  {
    id: 'weapons-plasma',
    name: 'Plasma Cannon',
    description: 'High-energy plasma weapon system',
    tier: 'elite',
    category: 'weapons',
    cost: 4000,
    requirements: { level: 8, previousUpgrade: 'weapons-laser' },
    benefits: [
      { label: 'Damage', value: '+75%', improvement: 75 },
      { label: 'Shield Penetration', value: '+30%', improvement: 30 },
      { label: 'Range', value: '+40%', improvement: 40 }
    ],
    effects: {
      damageBonus: 75,
      shieldPenetrationBonus: 30,
      rangeBonus: 40
    }
  },
  
  // Cargo Upgrades
  {
    id: 'cargo-expanded',
    name: 'Expanded Cargo Bay',
    description: 'Additional storage compartments for more resources',
    tier: 'basic',
    category: 'cargo',
    cost: 400,
    requirements: { level: 2 },
    benefits: [
      { label: 'Cargo Capacity', value: '+50', improvement: 50 },
      { label: 'Weight Distribution', value: 'Optimized', improvement: 10 }
    ],
    effects: {
      cargoBonus: 50,
      speedBonus: 5
    }
  },
  {
    id: 'cargo-quantum',
    name: 'Quantum Storage',
    description: 'Dimensional storage technology for massive capacity',
    tier: 'legendary',
    category: 'cargo',
    cost: 8000,
    requirements: { level: 10, previousUpgrade: 'cargo-expanded' },
    benefits: [
      { label: 'Cargo Capacity', value: '+200', improvement: 200 },
      { label: 'Weight Reduction', value: '-90%', improvement: 90 },
      { label: 'Auto-Sort', value: 'Enabled', improvement: 100 }
    ],
    effects: {
      cargoBonus: 200,
      weightReductionBonus: 90,
      autoSortBonus: 100
    }
  },
  
  // Special Upgrades
  {
    id: 'special-cloak',
    name: 'Cloaking Device',
    description: 'Stealth technology to avoid detection',
    tier: 'elite',
    category: 'special',
    cost: 5000,
    requirements: { level: 9, reputation: 70 },
    benefits: [
      { label: 'Detection Range', value: '-80%', improvement: 80 },
      { label: 'Heat Signature', value: '-60%', improvement: 60 }
    ],
    effects: {
      detectionRangeBonus: -80,
      heatSignatureBonus: -60
    }
  },
  {
    id: 'special-scanner',
    name: 'Advanced Scanner',
    description: 'Enhanced scanning capabilities for resource detection',
    tier: 'advanced',
    category: 'special',
    cost: 1200,
    requirements: { level: 4 },
    benefits: [
      { label: 'Scan Range', value: '+100%', improvement: 100 },
      { label: 'Resource Detection', value: '+50%', improvement: 50 },
      { label: 'Threat Detection', value: 'Enhanced', improvement: 75 }
    ],
    effects: {
      scanRangeBonus: 100,
      resourceDetectionBonus: 50,
      threatDetectionBonus: 75
    }
  }
];

export const useUpgrades = create<UpgradesState>()(
  persist(
    (set, get) => ({
      catalog: [],
      ownedUpgrades: [],
      equippedUpgrades: [],

      initializeCatalog: () => {
        set({ catalog: UPGRADE_CATALOG });
        console.log("[UPGRADES] Catalog initialized with", UPGRADE_CATALOG.length, "upgrades");
      },

      purchaseUpgrade: (upgradeId) => {
        const upgrade = get().catalog.find(u => u.id === upgradeId);
        if (!upgrade) {
          console.error("[UPGRADES] Upgrade not found:", upgradeId);
          return false;
        }

        if (get().ownedUpgrades.includes(upgradeId)) {
          console.warn("[UPGRADES] Upgrade already owned:", upgradeId);
          return false;
        }

        set(state => ({
          ownedUpgrades: [...state.ownedUpgrades, upgradeId]
        }));

        console.log("[UPGRADES] Purchased upgrade:", upgrade.name);
        return true;
      },

      equipUpgrade: (upgradeId) => {
        const state = get();
        const upgrade = state.catalog.find(u => u.id === upgradeId);
        
        if (!upgrade) {
          console.error("[UPGRADES] Upgrade not found:", upgradeId);
          return false;
        }

        if (!state.ownedUpgrades.includes(upgradeId)) {
          console.error("[UPGRADES] Cannot equip unowned upgrade:", upgradeId);
          return false;
        }

        // Unequip any existing upgrade in the same category
        const currentEquipped = state.equippedUpgrades.filter(id => {
          const equippedUpgrade = state.catalog.find(u => u.id === id);
          return equippedUpgrade?.category !== upgrade.category;
        });

        set({
          equippedUpgrades: [...currentEquipped, upgradeId]
        });

        console.log("[UPGRADES] Equipped upgrade:", upgrade.name);
        return true;
      },

      unequipUpgrade: (upgradeId) => {
        set(state => ({
          equippedUpgrades: state.equippedUpgrades.filter(id => id !== upgradeId)
        }));
        
        console.log("[UPGRADES] Unequipped upgrade:", upgradeId);
        return true;
      },

      isOwned: (upgradeId) => {
        return get().ownedUpgrades.includes(upgradeId);
      },

      isEquipped: (upgradeId) => {
        return get().equippedUpgrades.includes(upgradeId);
      },

      meetsRequirements: (upgradeId, playerLevel, reputation) => {
        const upgrade = get().catalog.find(u => u.id === upgradeId);
        if (!upgrade) return false;

        const { requirements } = upgrade;
        
        if (requirements.level && playerLevel < requirements.level) return false;
        if (requirements.reputation && reputation < requirements.reputation) return false;
        if (requirements.previousUpgrade && !get().ownedUpgrades.includes(requirements.previousUpgrade)) return false;
        
        return true;
      },

      getUpgrade: (upgradeId) => {
        return get().catalog.find(u => u.id === upgradeId);
      },

      getOwnedUpgrades: () => {
        const state = get();
        return state.catalog.filter(u => state.ownedUpgrades.includes(u.id));
      },

      getEquippedUpgrades: () => {
        const state = get();
        return state.catalog.filter(u => state.equippedUpgrades.includes(u.id));
      },

      getUpgradesByCategory: (category) => {
        return get().catalog.filter(u => u.category === category);
      },

      getTotalBonuses: () => {
        const state = get();
        const bonuses: Record<string, number> = {};
        
        state.equippedUpgrades.forEach(upgradeId => {
          const upgrade = state.catalog.find(u => u.id === upgradeId);
          if (upgrade?.effects) {
            Object.entries(upgrade.effects).forEach(([key, value]) => {
              if (value !== undefined) {
                bonuses[key] = (bonuses[key] || 0) + value;
              }
            });
          }
        });
        
        return bonuses;
      }
    }),
    {
      name: 'ship-upgrades-storage',
      version: 1
    }
  )
);

// Auto-initialize catalog when the store is first created
if (typeof window !== 'undefined') {
  useUpgrades.getState().initializeCatalog();
}