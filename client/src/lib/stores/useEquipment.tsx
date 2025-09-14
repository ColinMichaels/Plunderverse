import { create } from "zustand";
import { ResourceData } from "../planetData";

export interface EquipmentItem {
  id: string;
  name: string;
  type: 'drill' | 'extractor' | 'scanner' | 'engine';
  maxDurability: number;
  currentDurability: number;
  repairCost: number;
  stressResistance: number; // 0-1, higher = less wear per operation
  performanceLevel: number; // Current performance multiplier based on condition
}

export interface StressFactors {
  resourceHardness: number; // Based on rarity
  operationIntensity: number; // How intensive the current operation is
  environmentalFactor: number; // Planet conditions affect wear
}

interface EquipmentState {
  equipment: EquipmentItem[];
  
  // Actions
  initializeEquipment: () => void;
  applyWear: (equipmentId: string, stressFactors: StressFactors, operationTime: number) => void;
  repairEquipment: (equipmentId: string, repairAmount?: number, availableCredits?: number) => { success: boolean; cost: number };
  getEquipment: (equipmentId: string) => EquipmentItem | undefined;
  getPerformanceMultiplier: (equipmentId: string) => number;
  getConditionStatus: (equipmentId: string) => 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'broken';
  calculateStressFactor: (resource: ResourceData, planetName: string) => StressFactors;
}

export const useEquipment = create<EquipmentState>((set, get) => ({
  equipment: [],
  
  initializeEquipment: () => {
    const initialEquipment: EquipmentItem[] = [
      {
        id: 'drill-mk1',
        name: 'Mining Drill Mk1',
        type: 'drill',
        maxDurability: 100,
        currentDurability: 100,
        repairCost: 50,
        stressResistance: 0.7,
        performanceLevel: 1.0
      },
      {
        id: 'extractor-basic',
        name: 'Resource Extractor',
        type: 'extractor',
        maxDurability: 80,
        currentDurability: 80,
        repairCost: 40,
        stressResistance: 0.8,
        performanceLevel: 1.0
      },
      {
        id: 'scanner-mk1',
        name: 'Planetary Scanner',
        type: 'scanner',
        maxDurability: 60,
        currentDurability: 60,
        repairCost: 30,
        stressResistance: 0.9,
        performanceLevel: 1.0
      }
    ];
    
    set({ equipment: initialEquipment });
    console.log("Equipment initialized with basic gear");
  },
  
  applyWear: (equipmentId, stressFactors, operationTime) => {
    set(state => {
      const equipment = [...state.equipment];
      const equipmentIndex = equipment.findIndex(eq => eq.id === equipmentId);
      
      if (equipmentIndex === -1) {
        console.warn(`Equipment ${equipmentId} not found`);
        return state;
      }
      
      const item = equipment[equipmentIndex];
      
      // Calculate wear amount based on stress factors and time
      const baseWear = operationTime * 0.1; // Base wear per operation
      const stressMultiplier = (
        stressFactors.resourceHardness * 0.5 +
        stressFactors.operationIntensity * 0.3 +
        stressFactors.environmentalFactor * 0.2
      );
      
      const totalWear = baseWear * stressMultiplier * (1 - item.stressResistance);
      const newDurability = Math.max(0, item.currentDurability - totalWear);
      
      // Update performance based on condition
      const conditionRatio = newDurability / item.maxDurability;
      let performanceLevel = 1.0;
      
      if (conditionRatio > 0.8) {
        performanceLevel = 1.0; // Excellent condition
      } else if (conditionRatio > 0.6) {
        performanceLevel = 0.9; // Good condition  
      } else if (conditionRatio > 0.4) {
        performanceLevel = 0.75; // Fair condition
      } else if (conditionRatio > 0.2) {
        performanceLevel = 0.5; // Poor condition
      } else if (conditionRatio > 0) {
        performanceLevel = 0.25; // Critical condition
      } else {
        performanceLevel = 0; // Broken
      }
      
      equipment[equipmentIndex] = {
        ...item,
        currentDurability: newDurability,
        performanceLevel
      };
      
      console.log(`${item.name} wear applied: -${totalWear.toFixed(1)} durability (${newDurability.toFixed(1)}/${item.maxDurability})`);
      
      if (newDurability <= 0) {
        console.warn(`${item.name} has broken down and needs repair!`);
      } else if (newDurability <= item.maxDurability * 0.2) {
        console.warn(`${item.name} is in critical condition and needs maintenance!`);
      }
      
      return { equipment };
    });
  },
  
  repairEquipment: (equipmentId, repairAmount, availableCredits) => {
    const state = get();
    const equipment = state.equipment.find(eq => eq.id === equipmentId);
    
    if (!equipment) {
      return { success: false, cost: 0 };
    }
    
    const maxRepair = equipment.maxDurability - equipment.currentDurability;
    const actualRepair = repairAmount !== undefined ? Math.min(repairAmount, maxRepair) : maxRepair;
    const repairCost = Math.ceil((actualRepair / equipment.maxDurability) * equipment.repairCost);
    
    // Check if player has enough credits
    if (availableCredits !== undefined && availableCredits < repairCost) {
      console.log(`Insufficient credits for repair. Need ${repairCost}, have ${availableCredits}`);
      return { success: false, cost: repairCost };
    }
    
    set(state => {
      const updatedEquipment = state.equipment.map(eq => {
        if (eq.id === equipmentId) {
          const newDurability = eq.currentDurability + actualRepair;
          const conditionRatio = newDurability / eq.maxDurability;
          
          // Recalculate performance level
          let performanceLevel = 1.0;
          if (conditionRatio > 0.8) performanceLevel = 1.0;
          else if (conditionRatio > 0.6) performanceLevel = 0.9;
          else if (conditionRatio > 0.4) performanceLevel = 0.75;
          else if (conditionRatio > 0.2) performanceLevel = 0.5;
          else if (conditionRatio > 0) performanceLevel = 0.25;
          else performanceLevel = 0;
          
          return {
            ...eq,
            currentDurability: newDurability,
            performanceLevel
          };
        }
        return eq;
      });
      
      return { equipment: updatedEquipment };
    });
    
    console.log(`Repaired ${equipment.name}: +${actualRepair.toFixed(1)} durability for ${repairCost} credits`);
    return { success: true, cost: repairCost };
  },
  
  getEquipment: (equipmentId) => {
    const state = get();
    return state.equipment.find(eq => eq.id === equipmentId);
  },
  
  getPerformanceMultiplier: (equipmentId) => {
    const equipment = get().getEquipment(equipmentId);
    return equipment ? equipment.performanceLevel : 1.0;
  },
  
  getConditionStatus: (equipmentId) => {
    const equipment = get().getEquipment(equipmentId);
    if (!equipment) return 'broken';
    
    const conditionRatio = equipment.currentDurability / equipment.maxDurability;
    
    if (conditionRatio === 0) return 'broken';
    if (conditionRatio <= 0.2) return 'critical';
    if (conditionRatio <= 0.4) return 'poor';
    if (conditionRatio <= 0.6) return 'fair';
    if (conditionRatio <= 0.8) return 'good';
    return 'excellent';
  },
  
  calculateStressFactor: (resource, planetName) => {
    // Resource hardness based on rarity
    const resourceHardness = {
      common: 0.3,
      uncommon: 0.6,
      rare: 0.8,
      legendary: 1.0
    }[resource.rarity];
    
    // Environmental factors based on planet conditions
    const environmentalFactors: Record<string, number> = {
      'Mercury': 0.9, // Extreme temperatures
      'Venus': 1.0, // Extreme heat and pressure
      'Earth': 0.2, // Ideal conditions
      'Mars': 0.4, // Cold and dusty
      'Jupiter': 0.8, // High gravity and radiation
      'Saturn': 0.7, // Moderate conditions
      'Uranus': 0.8, // Extreme cold
      'Neptune': 0.9, // Extreme conditions
      'Ceres': 0.3, // Low gravity, manageable
    };
    
    const environmentalFactor = environmentalFactors[planetName] || 0.5;
    
    // Operation intensity is moderate for basic mining
    const operationIntensity = 0.6;
    
    return {
      resourceHardness,
      operationIntensity,
      environmentalFactor
    };
  }
}));

// Auto-initialize equipment when the store is first created
if (typeof window !== 'undefined') {
  useEquipment.getState().initializeEquipment();
}