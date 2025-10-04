import { create } from "zustand";
import { toast } from "sonner";
import { ResourceData } from "../../planetData";

export interface EquipmentItem {
  id: string;
  name: string;
  type: 'drill' | 'extractor' | 'scanner' | 'engine' | 'hull' | 'fuel' | 'maintenance';
  maxDurability: number;
  currentDurability: number;
  repairCost: number;
  stressResistance: number; // 0-1, higher = less wear per operation
  performanceLevel: number; // Current performance multiplier based on condition
  isConsumable?: boolean; // For resources like fuel that need replenishment
  replenishmentCost?: number; // Cost per unit to refill consumables
  // New fuel and engine properties
  fuelType?: 'standard' | 'premium' | 'quantum'; // Fuel efficiency rating
  engineType?: 'standard' | 'efficient' | 'highPerformance'; // Engine characteristics  
  baseEfficiency?: number; // Base fuel efficiency multiplier
  speedMultiplier?: number; // Speed vs efficiency trade-off
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
  replenishFuel: (fuelAmount: number, availableCredits: number) => { success: boolean; cost: number };
  consumeFuel: (amount: number) => boolean; // Returns false if insufficient fuel
  getEquipment: (equipmentId: string) => EquipmentItem | undefined;
  getPerformanceMultiplier: (equipmentId: string) => number;
  getFuelEfficiencyMultiplier: () => number; // Calculate combined fuel efficiency from engine and fuel type
  getConditionStatus: (equipmentId: string) => 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'broken';
  calculateStressFactor: (resource: ResourceData, planetName: string) => StressFactors;
  applyShipDegradation: (operationType: 'autopilot' | 'mining' | 'repair', intensity: number, duration: number) => void;
}

export const useEquipment = create<EquipmentState>((set, get) => ({
  equipment: [],
  
  initializeEquipment: () => {
    const initialEquipment: EquipmentItem[] = [
      // Mining Equipment
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
      },
      // Ship Components
      {
        id: 'hull-primary',
        name: 'Ship Hull',
        type: 'hull',
        maxDurability: 200,
        currentDurability: 200,
        repairCost: 100,
        stressResistance: 0.6,
        performanceLevel: 1.0
      },
      {
        id: 'engine-main',
        name: 'Main Engine',
        type: 'engine',
        maxDurability: 150,
        currentDurability: 150,
        repairCost: 75,
        stressResistance: 0.7,
        performanceLevel: 1.0,
        engineType: 'standard',
        baseEfficiency: 1.0, // Standard efficiency
        speedMultiplier: 1.0 // Standard speed
      },
      {
        id: 'fuel-tank',
        name: 'Standard Fuel Tank',
        type: 'fuel',
        maxDurability: 100,
        currentDurability: 100,
        repairCost: 20,
        stressResistance: 1.0, // Fuel doesn't "wear" but gets consumed
        performanceLevel: 1.0,
        isConsumable: true,
        replenishmentCost: 2, // Credits per fuel unit
        fuelType: 'standard',
        baseEfficiency: 1.0 // Standard fuel efficiency
      },
      {
        id: 'maintenance-kit',
        name: 'Maintenance Kit',
        type: 'maintenance',
        maxDurability: 50,
        currentDurability: 50,
        repairCost: 25,
        stressResistance: 0.5,
        performanceLevel: 1.0
      }
    ];
    
    set({ equipment: initialEquipment });
    console.log("Equipment initialized with mining gear and ship components");
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
      
      // Show equipment damage notifications
      if (newDurability <= 0) {
        console.warn(`${item.name} has broken down and needs repair!`);
        toast.error(`💥 ${item.name} has broken down!`, {
          description: 'Equipment needs immediate repair',
          duration: 4000
        });
      } else if (newDurability <= item.maxDurability * 0.2) {
        console.warn(`${item.name} is in critical condition and needs maintenance!`);
        toast.warning(`⚠️ Equipment damaged: ${item.name} at ${Math.round(conditionRatio * 100)}%`, {
          description: 'Critical condition - needs maintenance',
          duration: 3500
        });
      } else if (newDurability <= item.maxDurability * 0.5 && item.currentDurability > item.maxDurability * 0.5) {
        // Just crossed 50% threshold
        toast.info(`🔧 ${item.name} at ${Math.round(conditionRatio * 100)}% condition`, {
          description: 'Consider repairs soon',
          duration: 3000
        });
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
    
    // Apply crew mechanic bonus to repair costs if available
    let repairCostMultiplier = 1.0;
    try {
      const crewState = (window as any).useCrewManagement?.getState?.();
      if (crewState?.currentBonuses?.repairCost) {
        repairCostMultiplier = 1 + crewState.currentBonuses.repairCost; // Negative bonus = reduced cost
        console.log(`[REPAIR] Applying mechanic discount: ${(-crewState.currentBonuses.repairCost * 100).toFixed(0)}% repair cost reduction`);
      }
    } catch (e) {
      // Crew management might not be initialized yet
    }
    
    const baseRepairCost = Math.ceil((actualRepair / equipment.maxDurability) * equipment.repairCost);
    const repairCost = Math.ceil(baseRepairCost * repairCostMultiplier);
    
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
          
          // Bidirectional sync: update useShipStatus hull when hull equipment is repaired
          if (eq.id === 'hull-primary') {
            // Import here to avoid circular dependency
            import('./useShipStatus').then(({ useShipStatus }) => {
              const hullPercentage = (newDurability / eq.maxDurability) * 100;
              const shipStatusStore = useShipStatus.getState();
              
              // Only update if there's a significant difference to avoid constant updates
              const currentHull = shipStatusStore.hull;
              if (Math.abs(currentHull - hullPercentage) > 0.1) {
                useShipStatus.setState(state => ({
                  ...state,
                  hull: hullPercentage,
                  isCritical: state.shield < 20 || hullPercentage < 20
                }));
                console.log(`[HULL-SYNC] Updated useShipStatus hull to ${hullPercentage.toFixed(1)}% from equipment repair`);
              }
            });
          }
          
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

  replenishFuel: (fuelAmount, availableCredits) => {
    const fuel = get().getEquipment('fuel-tank');
    if (!fuel || !fuel.isConsumable) {
      return { success: false, cost: 0 };
    }

    const maxRefill = fuel.maxDurability - fuel.currentDurability;
    const actualRefill = Math.min(fuelAmount, maxRefill);
    const refillCost = Math.ceil(actualRefill * (fuel.replenishmentCost || 2));

    if (availableCredits < refillCost) {
      console.log(`Insufficient credits for fuel. Need ${refillCost}, have ${availableCredits}`);
      return { success: false, cost: refillCost };
    }

    set(state => {
      const updatedEquipment = state.equipment.map(eq => {
        if (eq.id === 'fuel-tank') {
          return {
            ...eq,
            currentDurability: eq.currentDurability + actualRefill,
            performanceLevel: Math.min(1.0, (eq.currentDurability + actualRefill) / eq.maxDurability)
          };
        }
        return eq;
      });
      
      return { equipment: updatedEquipment };
    });

    console.log(`Refueled ${actualRefill} units for ${refillCost} credits`);
    return { success: true, cost: refillCost };
  },

  consumeFuel: (amount) => {
    const fuel = get().getEquipment('fuel-tank');
    if (!fuel) {
      console.warn(`No fuel tank found!`);
      return false;
    }
    
    // Apply crew pilot bonus to reduce fuel consumption
    let fuelEfficiencyMultiplier = 1.0;
    try {
      const crewState = (window as any).useCrewManagement?.getState?.();
      if (crewState?.currentBonuses?.fuelEfficiency) {
        fuelEfficiencyMultiplier = 1 - crewState.currentBonuses.fuelEfficiency; // Negative bonus = less fuel consumed
        console.log(`[FUEL] Applying pilot/mechanic efficiency: -${(crewState.currentBonuses.fuelEfficiency * 100).toFixed(0)}% fuel consumption`);
      }
    } catch (e) {
      // Crew management might not be initialized yet
    }
    
    const actualConsumption = amount * fuelEfficiencyMultiplier;
    
    if (fuel.currentDurability < actualConsumption) {
      console.warn(`Insufficient fuel! Need ${actualConsumption.toFixed(1)}, have ${fuel.currentDurability.toFixed(1)}`);
      return false;
    }

    set(state => {
      const updatedEquipment = state.equipment.map(eq => {
        if (eq.id === 'fuel-tank') {
          const newFuel = Math.max(0, eq.currentDurability - actualConsumption);
          const fuelPercentage = (newFuel / eq.maxDurability) * 100;
          
          // Show fuel level warnings
          if (fuelPercentage <= 10 && fuel.currentDurability > eq.maxDurability * 0.1) {
            // Just hit critical fuel
            toast.error(`⛽ Fuel critical! ${Math.round(fuelPercentage)}% remaining`, {
              description: 'Find fuel immediately!',
              duration: 4000
            });
          } else if (fuelPercentage <= 20 && fuel.currentDurability > eq.maxDurability * 0.2) {
            // Just hit low fuel
            toast.warning(`⛽ Fuel low - ${Math.round(newFuel)} units remaining`, {
              description: `Approximately ${Math.floor(newFuel / 5)} jumps possible`,
              duration: 3500
            });
          } else if (fuelPercentage <= 30 && fuel.currentDurability > eq.maxDurability * 0.3) {
            // Just hit 30% threshold
            toast.info(`⛽ Fuel at ${Math.round(fuelPercentage)}%`, {
              description: 'Consider refueling soon',
              duration: 3000
            });
          }
          
          return {
            ...eq,
            currentDurability: newFuel,
            performanceLevel: newFuel / eq.maxDurability
          };
        }
        return eq;
      });
      
      return { equipment: updatedEquipment };
    });

    console.log(`Consumed ${actualConsumption.toFixed(1)} fuel units (base: ${amount})`);
    return true;
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
  },

  applyShipDegradation: (operationType, intensity, duration) => {
    set(state => {
      const equipment = [...state.equipment];
      
      // Apply degradation based on operation type
      switch (operationType) {
        case 'autopilot': {
          // Engine wear from autopilot usage
          const engineIndex = equipment.findIndex(eq => eq.id === 'engine-main');
          if (engineIndex >= 0) {
            const engine = equipment[engineIndex];
            const engineWear = duration * intensity * 0.05 * (1 - engine.stressResistance);
            const newDurability = Math.max(0, engine.currentDurability - engineWear);
            const conditionRatio = newDurability / engine.maxDurability;
            
            equipment[engineIndex] = {
              ...engine,
              currentDurability: newDurability,
              performanceLevel: conditionRatio > 0.8 ? 1.0 : conditionRatio > 0.6 ? 0.9 : conditionRatio > 0.4 ? 0.75 : conditionRatio > 0.2 ? 0.5 : conditionRatio > 0 ? 0.25 : 0
            };
            
            console.log(`Engine wear from autopilot: -${engineWear.toFixed(1)} durability`);
          }

          // Hull stress from space travel
          const hullIndex = equipment.findIndex(eq => eq.id === 'hull-primary');
          if (hullIndex >= 0) {
            const hull = equipment[hullIndex];
            const hullWear = duration * intensity * 0.02 * (1 - hull.stressResistance);
            const newDurability = Math.max(0, hull.currentDurability - hullWear);
            const conditionRatio = newDurability / hull.maxDurability;
            
            equipment[hullIndex] = {
              ...hull,
              currentDurability: newDurability,
              performanceLevel: conditionRatio > 0.8 ? 1.0 : conditionRatio > 0.6 ? 0.9 : conditionRatio > 0.4 ? 0.75 : conditionRatio > 0.2 ? 0.5 : conditionRatio > 0 ? 0.25 : 0
            };
            
            console.log(`Hull wear from travel: -${hullWear.toFixed(1)} durability`);
          }
          break;
        }
        
        case 'mining': {
          // Hull stress from mining operations (vibrations, debris impact)
          const hullIndex = equipment.findIndex(eq => eq.id === 'hull-primary');
          if (hullIndex >= 0) {
            const hull = equipment[hullIndex];
            const hullWear = duration * intensity * 0.01 * (1 - hull.stressResistance);
            const newDurability = Math.max(0, hull.currentDurability - hullWear);
            const conditionRatio = newDurability / hull.maxDurability;
            
            equipment[hullIndex] = {
              ...hull,
              currentDurability: newDurability,
              performanceLevel: conditionRatio > 0.8 ? 1.0 : conditionRatio > 0.6 ? 0.9 : conditionRatio > 0.4 ? 0.75 : conditionRatio > 0.2 ? 0.5 : conditionRatio > 0 ? 0.25 : 0
            };
            
            console.log(`Hull wear from mining: -${hullWear.toFixed(1)} durability`);
          }
          break;
        }
        
        case 'repair': {
          // Maintenance kit degradation from repairs
          const maintenanceIndex = equipment.findIndex(eq => eq.id === 'maintenance-kit');
          if (maintenanceIndex >= 0) {
            const maintenance = equipment[maintenanceIndex];
            const maintenanceWear = intensity * 0.5 * (1 - maintenance.stressResistance);
            const newDurability = Math.max(0, maintenance.currentDurability - maintenanceWear);
            const conditionRatio = newDurability / maintenance.maxDurability;
            
            equipment[maintenanceIndex] = {
              ...maintenance,
              currentDurability: newDurability,
              performanceLevel: conditionRatio > 0.8 ? 1.0 : conditionRatio > 0.6 ? 0.9 : conditionRatio > 0.4 ? 0.75 : conditionRatio > 0.2 ? 0.5 : conditionRatio > 0 ? 0.25 : 0
            };
            
            console.log(`Maintenance kit wear from repairs: -${maintenanceWear.toFixed(1)} durability`);
          }
          break;
        }
      }
      
      return { equipment };
    });
  },

  getFuelEfficiencyMultiplier: () => {
    const state = get();
    const engine = state.getEquipment('engine-main');
    const fuelTank = state.getEquipment('fuel-tank');
    
    if (!engine || !fuelTank) return 1.0;
    
    // Base efficiency from engine condition and type
    let engineEfficiency = engine.performanceLevel * (engine.baseEfficiency || 1.0);
    
    // Adjust based on engine type characteristics
    switch (engine.engineType) {
      case 'efficient':
        engineEfficiency *= 0.7; // 30% better efficiency
        break;
      case 'highPerformance':
        engineEfficiency *= 1.5; // 50% worse efficiency but higher speed
        break;
      default: // 'standard'
        engineEfficiency *= 1.0;
    }
    
    // Fuel type efficiency
    let fuelEfficiency = fuelTank.baseEfficiency || 1.0;
    switch (fuelTank.fuelType) {
      case 'premium':
        fuelEfficiency *= 0.8; // 20% better efficiency
        break;
      case 'quantum':
        fuelEfficiency *= 0.6; // 40% better efficiency
        break;
      default: // 'standard'
        fuelEfficiency *= 1.0;
    }
    
    return engineEfficiency * fuelEfficiency;
  }
}));

// Auto-initialize equipment when the store is first created
if (typeof window !== 'undefined') {
  useEquipment.getState().initializeEquipment();
}