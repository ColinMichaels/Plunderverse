import { create } from "zustand";
import { ResourceData } from "../../planetData";
import { useEquipment } from "../ship/useEquipment";
import { useLandedState } from "../surface/useLandedState";
import { economyService, TransactionResult } from "../../../domain/economy/economy.service";
import { useAudio } from "../ui/useAudio";
import { useDestroyedNodes } from "../surface/useDestroyedNodes";

interface MiningState {
  isActive: boolean;
  currentPlanet: string | null;
  targetResource: ResourceData | null;
  currentNodeId: string | null; // Tracks the specific node being mined
  clicksCompleted: number; // Number of clicks made
  clicksRequired: number; // Total clicks needed based on complexity
  miningSpeed: number; // Resources per second (legacy)
  miningEfficiency: number; // 0-1, affects yield
  
  // Mining equipment stats
  drillPower: number;
  extractorLevel: number;
  
  // Actions
  startMining: (planet: string, resource: ResourceData, nodeId?: string) => void;
  stopMining: () => void;
  performClick: () => Promise<TransactionResult | null>;
  updateProgress: (deltaTime: number) => TransactionResult | null;
  upgradeDrill: () => void;
  upgradeExtractor: () => void;
}

export const useMining = create<MiningState>((set, get) => ({
  isActive: false,
  currentPlanet: null,
  targetResource: null,
  currentNodeId: null,
  clicksCompleted: 0,
  clicksRequired: 0,
  miningSpeed: 0.2, // Much slower base mining speed (legacy)
  miningEfficiency: 0.4, // Lower base efficiency
  
  // Mining equipment
  drillPower: 1,
  extractorLevel: 1,
  
  startMining: (planet, resource, nodeId) => {
    // Check if ship is actually landed on the planet
    const landedState = useLandedState.getState();
    console.log(`[MINING-DEBUG] Checking landing status: isLanded=${landedState.isLanded}, landedPlanet=${landedState.landedPlanet}, targetPlanet=${planet}`);
    
    if (!landedState.isLanded || landedState.landedPlanet !== planet) {
      console.warn(`[MINING-DEBUG] Cannot start mining on ${planet} - ship not landed on surface!`);
      console.warn(`[MINING-DEBUG] Landing state: isLanded=${landedState.isLanded}, landedPlanet=${landedState.landedPlanet}`);
      return;
    }
    
    set({
      isActive: true,
      currentPlanet: planet,
      targetResource: resource,
      currentNodeId: nodeId || null,
      clicksCompleted: 0,
      clicksRequired: resource.complexity
    });
    console.log(`[MINING-DEBUG] Started mining ${resource.type} (node: ${nodeId}) on ${planet} surface - ${resource.complexity} clicks needed`);
  },
  
  stopMining: () => {
    set({
      isActive: false,
      currentPlanet: null,
      targetResource: null,
      currentNodeId: null,
      clicksCompleted: 0,
      clicksRequired: 0
    });
    console.log("Mining operation stopped");
  },
  
  performClick: async () => {
    const state = get();
    if (!state.isActive || !state.targetResource) return null;
    
    // Calculate previous and new progress percentages
    const previousProgress = (state.clicksCompleted / state.clicksRequired) * 100;
    const newClicksCompleted = state.clicksCompleted + 1;
    const newProgress = (newClicksCompleted / state.clicksRequired) * 100;
    
    set({ clicksCompleted: newClicksCompleted });
    
    console.log(`Mining click ${newClicksCompleted}/${state.clicksRequired} on ${state.targetResource!.type}`);
    
    // Trigger enhanced mining effects (screen shake, dynamic audio, visual effects)
    import('../surface/useMiningEffects').then(({ useMiningEffects }) => {
      const effectsStore = useMiningEffects.getState();
      const equipmentStore = useEquipment.getState();
      
      // Scale effects based on equipment efficiency
      const drillPerformance = equipmentStore.getPerformanceMultiplier('drill-mk1');
      const equipmentScale = 0.5 + (drillPerformance * 0.5); // 0.5 to 1.0 scale
      
      effectsStore.setEffectsIntensity(equipmentScale);
      effectsStore.triggerMiningImpact(state.targetResource!, newProgress / 100);
    }).catch(err => {
      console.warn('[MINING-EFFECTS] Could not load mining effects:', err);
      // Fallback to basic audio
      const { playHit } = useAudio.getState();
      playHit();
    });
    
    // Keep milestone logging for debugging
    const milestones = [25, 50, 75];
    for (const milestone of milestones) {
      if (previousProgress < milestone && newProgress >= milestone) {
        console.log(`[MINING-AUDIO] Hit milestone: ${milestone}%`);
        break;
      }
    }
    
    // Check if mining is complete
    if (newClicksCompleted >= state.clicksRequired) {
      // Get equipment performance multipliers
      const equipmentStore = useEquipment.getState();
      const drillPerformance = equipmentStore.getPerformanceMultiplier('drill-mk1');
      const extractorPerformance = equipmentStore.getPerformanceMultiplier('extractor-basic');
      
      // Check if equipment is broken
      if (drillPerformance === 0) {
        console.warn("Drill is broken! Mining stopped.");
        get().stopMining();
        return {
          success: false,
          message: "Drill is broken! Mining operation stopped."
        };
      }
      
      // Calculate base extraction - more dependent on equipment levels
      const equipmentMultiplier = (state.drillPower * state.extractorLevel * drillPerformance * extractorPerformance);
      const baseExtraction = Math.max(0.1, state.miningEfficiency * equipmentMultiplier);
      
      // Apply rarity-based yield reduction and round to reasonable amounts
      const rarityYieldMultiplier = {
        common: 1.0,
        uncommon: 0.8,
        rare: 0.6,
        legendary: 0.4
      }[state.targetResource!.rarity] || 1.0;
      
      const extractedAmount = extractorPerformance === 0 ? 0 : Math.max(1, Math.ceil(baseExtraction * rarityYieldMultiplier));
      
      // Check if extractor is broken
      if (extractorPerformance === 0) {
        console.warn("Extractor is broken! No resources extracted.");
        get().stopMining();
        return {
          success: false,
          message: "Extractor is broken! No resources extracted."
        };
      }
      
      console.log(`Mining complete! Extracted ${extractedAmount} ${state.targetResource!.type} after ${newClicksCompleted} clicks`);
      
      // Play success sound at 100% completion
      playSuccess();
      console.log(`[MINING-AUDIO] Mining completed at 100%`);
      // TODO: Add more elaborate completion sound effect (e.g., resource collection chime, inventory update sound)
      
      // Store the nodeId before resetting state
      const completedNodeId = state.currentNodeId;
      
      // Use EconomyService to handle all mining yield processing (resources, credits, equipment wear, sounds, events)
      const result = await economyService.applyMiningYield(
        state.targetResource!,
        extractedAmount,
        state.currentPlanet || "Unknown"
      );
      
      // Reset mining state AFTER processing the result
      // This ensures the node destruction happens properly
      get().stopMining();
      
      // Report collection trigger progress for missions
      if (result.success) {
        try {
          const { useObjectiveTriggers } = await import('./useObjectiveTriggers');
          const triggers = useObjectiveTriggers.getState();
          triggers.reportProgress('collection', { 
            itemType: state.targetResource!.type, 
            amount: extractedAmount 
          });
          triggers.reportCollectionProgress(
            state.targetResource!.type,
            state.targetResource!.type,
            extractedAmount
          );
          console.log(`[OBJECTIVE-TRIGGER] Reported mining ${extractedAmount}x ${state.targetResource!.type} for mission objectives`);
        } catch (error) {
          console.error('[OBJECTIVE-TRIGGER] Error reporting mining:', error);
        }
        
        // Destroy the node after successful mining
        if (completedNodeId && state.currentPlanet) {
          const destroyedNodesStore = useDestroyedNodes.getState();
          destroyedNodesStore.destroyNode(state.currentPlanet, completedNodeId);
          console.log(`[MINING] Successfully destroyed node ${completedNodeId} on ${state.currentPlanet}`);
        }
      }
      
      return result;
    }
    
    return null;
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
    
    // Click-based mining - no automatic progress
    // This function is kept for backward compatibility but not used in click-based system
    // Equipment wear is now handled by EconomyService.applyMiningYield()
    
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