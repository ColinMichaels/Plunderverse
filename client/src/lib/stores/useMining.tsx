import { create } from "zustand";
import { ResourceData } from "../planetData";
import { useEquipment } from "./useEquipment";
import { useLandedState } from "./useLandedState";

interface MiningState {
  isActive: boolean;
  currentPlanet: string | null;
  targetResource: ResourceData | null;
  progress: number; // 0-100
  miningSpeed: number; // Resources per second
  miningEfficiency: number; // 0-1, affects yield
  
  // Mining equipment stats
  drillPower: number;
  extractorLevel: number;
  
  // Actions
  startMining: (planet: string, resource: ResourceData) => void;
  stopMining: () => void;
  updateProgress: (deltaTime: number) => { resource: ResourceData; quantity: number; planet: string } | null;
  upgradeDrill: () => void;
  upgradeExtractor: () => void;
}

export const useMining = create<MiningState>((set, get) => ({
  isActive: false,
  currentPlanet: null,
  targetResource: null,
  progress: 0,
  miningSpeed: 0.2, // Much slower base mining speed
  miningEfficiency: 0.4, // Lower base efficiency
  
  // Mining equipment
  drillPower: 1,
  extractorLevel: 1,
  
  startMining: (planet, resource) => {
    // Check if ship is actually landed on the planet
    const landedState = useLandedState.getState();
    if (!landedState.isLanded || landedState.landedPlanet !== planet) {
      console.warn(`Cannot start mining on ${planet} - ship not landed on surface!`);
      return;
    }
    
    set({
      isActive: true,
      currentPlanet: planet,
      targetResource: resource,
      progress: 0
    });
    console.log(`Started mining ${resource.type} on ${planet} surface`);
  },
  
  stopMining: () => {
    set({
      isActive: false,
      currentPlanet: null,
      targetResource: null,
      progress: 0
    });
    console.log("Mining operation stopped");
  },
  
  updateProgress: (deltaTime) => {
    const state = get();
    if (!state.isActive || !state.targetResource) return null;
    
    // Get equipment performance multipliers
    const equipmentStore = useEquipment.getState();
    const drillPerformance = equipmentStore.getPerformanceMultiplier('drill-mk1');
    const extractorPerformance = equipmentStore.getPerformanceMultiplier('extractor-basic');
    
    // Check if equipment is broken
    if (drillPerformance === 0) {
      console.warn("Drill is broken! Mining stopped.");
      get().stopMining();
      return null;
    }
    
    // Calculate mining progress based on equipment and resource rarity
    const rarityMultiplier = {
      common: 1,
      uncommon: 0.7,
      rare: 0.4,
      legendary: 0.2
    }[state.targetResource.rarity] || 1;
    
    const effectiveSpeed = state.miningSpeed * state.drillPower * rarityMultiplier * drillPerformance;
    const progressIncrease = (effectiveSpeed * deltaTime * 100) / 30; // 30 seconds per resource base (much slower)
    
    const newProgress = Math.min(100, state.progress + progressIncrease);
    set({ progress: newProgress });
    
    // Apply wear to drill equipment during mining
    const stressFactors = equipmentStore.calculateStressFactor(state.targetResource, state.currentPlanet || "Unknown");
    equipmentStore.applyWear('drill-mk1', stressFactors, deltaTime);
    
    // Apply ship degradation during mining operations
    equipmentStore.applyShipDegradation('mining', stressFactors.operationIntensity, deltaTime);
    
    // Mining complete
    if (newProgress >= 100) {
      // Calculate base extraction - more dependent on equipment levels
      const equipmentMultiplier = (state.drillPower * state.extractorLevel * drillPerformance * extractorPerformance);
      const baseExtraction = Math.max(0.1, state.miningEfficiency * equipmentMultiplier);
      
      // Apply rarity-based yield reduction and round to reasonable amounts
      const rarityYieldMultiplier = {
        common: 1.0,
        uncommon: 0.8,
        rare: 0.6,
        legendary: 0.4
      }[state.targetResource.rarity] || 1.0;
      
      const extractedAmount = extractorPerformance === 0 ? 0 : Math.max(1, Math.ceil(baseExtraction * rarityYieldMultiplier));
      
      // Check if extractor is broken
      if (extractorPerformance === 0) {
        console.warn("Extractor is broken! No resources extracted.");
        set({ progress: 0 });
        return {
          resource: state.targetResource,
          quantity: 0,
          planet: state.currentPlanet || "Unknown"
        };
      }
      
      console.log(`Mining complete! Extracted ${extractedAmount} ${state.targetResource.type} (base: ${baseExtraction}, performance: ${Math.round(extractorPerformance * 100)}%)`);
      
      // Debug assert for healthy extractor
      if (extractorPerformance >= 1.0 && extractedAmount <= 0) {
        console.error("DEBUG: Healthy extractor produced 0 resources! Base:", baseExtraction, "Performance:", extractorPerformance);
      }
      
      // Apply wear to extractor equipment on completion
      equipmentStore.applyWear('extractor-basic', stressFactors, 1.0); // Full cycle wear
      
      // Reset for next mining cycle
      set({ progress: 0 });
      
      // Return the extracted materials for inventory addition
      return {
        resource: state.targetResource,
        quantity: extractedAmount,
        planet: state.currentPlanet || "Unknown"
      };
    }
    
    return null;
  },
  
  upgradeDrill: () => {
    set(state => ({
      drillPower: state.drillPower + 0.5
    }));
    console.log(`Drill upgraded! New power: ${get().drillPower}`);
  },
  
  upgradeExtractor: () => {
    set(state => ({
      extractorLevel: state.extractorLevel + 1,
      miningEfficiency: Math.min(0.95, state.miningEfficiency + 0.05)
    }));
    console.log(`Extractor upgraded! Level: ${get().extractorLevel}, Efficiency: ${get().miningEfficiency}`);
  }
}));