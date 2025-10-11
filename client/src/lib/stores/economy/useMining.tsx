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
    // Null safety check for resource parameter
    if (!resource || resource === null || resource === undefined) {
      console.warn(`[MINING-DEBUG] Cannot start mining - resource is null/undefined`);
      return;
    }
    
    // Null safety check for planet parameter
    if (!planet || planet === null || planet === undefined) {
      console.warn(`[MINING-DEBUG] Cannot start mining - planet is null/undefined`);
      return;
    }
    
    // Validate resource properties exist
    if (!resource.type || !resource.complexity || resource.complexity === null || resource.complexity === undefined) {
      console.warn(`[MINING-DEBUG] Cannot start mining - resource missing required properties (type: ${resource.type}, complexity: ${resource.complexity})`);
      return;
    }
    
    // Ensure complexity is a valid number
    const complexity = Number(resource.complexity);
    if (isNaN(complexity) || complexity <= 0) {
      console.warn(`[MINING-DEBUG] Cannot start mining - invalid complexity value: ${resource.complexity}`);
      return;
    }
    
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
      clicksRequired: complexity
    });
    console.log(`[MINING-DEBUG] Started mining ${resource.type} (node: ${nodeId}) on ${planet} surface - ${complexity} clicks needed`);
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
    
    // Comprehensive null checks for state and targetResource
    if (!state || !state.isActive) {
      console.warn('[MINING-DEBUG] Mining is not active');
      return null;
    }
    
    if (!state.targetResource || state.targetResource === null || state.targetResource === undefined) {
      console.warn('[MINING-DEBUG] No target resource for mining');
      return null;
    }
    
    // Validate targetResource properties
    if (!state.targetResource.type || !state.targetResource.rarity) {
      console.warn('[MINING-DEBUG] Target resource missing required properties (type or rarity)');
      return null;
    }
    
    // Validate numeric values
    const clicksCompleted = Number(state.clicksCompleted) || 0;
    const clicksRequired = Number(state.clicksRequired) || 1;
    
    if (isNaN(clicksCompleted) || isNaN(clicksRequired) || clicksRequired <= 0) {
      console.warn('[MINING-DEBUG] Invalid click counts - completed:', clicksCompleted, 'required:', clicksRequired);
      return null;
    }
    
    // Calculate previous and new progress percentages
    const previousProgress = (clicksCompleted / clicksRequired) * 100;
    const newClicksCompleted = clicksCompleted + 1;
    const newProgress = (newClicksCompleted / clicksRequired) * 100;
    
    set({ clicksCompleted: newClicksCompleted });
    
    console.log(`Mining click ${newClicksCompleted}/${clicksRequired} on ${state.targetResource.type}`);
    
    // Trigger enhanced mining effects (screen shake, dynamic audio, visual effects)
    import('../surface/useMiningEffects').then(({ useMiningEffects }) => {
      const effectsStore = useMiningEffects.getState();
      const equipmentStore = useEquipment.getState();
      
      // Scale effects based on equipment efficiency
      const drillPerformance = equipmentStore.getPerformanceMultiplier('drill-mk1');
      const equipmentScale = 0.5 + (drillPerformance * 0.5); // 0.5 to 1.0 scale
      
      effectsStore.setEffectsIntensity(equipmentScale);
      // Safe access to targetResource with null check
      if (state.targetResource) {
        effectsStore.triggerMiningImpact(state.targetResource, newProgress / 100);
      }
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
      // Safe access to rarity with validation
      const resourceRarity = state.targetResource?.rarity || 'common';
      const rarityYieldMultiplier = {
        common: 1.0,
        uncommon: 0.8,
        rare: 0.6,
        legendary: 0.4
      }[resourceRarity] || 1.0;
      
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
      
      console.log(`Mining complete! Extracted ${extractedAmount} ${state.targetResource?.type || 'unknown'} after ${newClicksCompleted} clicks`);
      
      // Play success sound at 100% completion
      const { playSuccess } = useAudio.getState();
      playSuccess();
      console.log(`[MINING-AUDIO] Mining completed at 100%`);
      // TODO: Add more elaborate completion sound effect (e.g., resource collection chime, inventory update sound)
      
      // Store the nodeId before resetting state
      const completedNodeId = state.currentNodeId;
      
      // Use EconomyService to handle all mining yield processing (resources, credits, equipment wear, sounds, events)
      // Additional null check before calling economyService
      if (!state.targetResource) {
        console.warn('[MINING-DEBUG] Target resource became null before applying yield');
        get().stopMining();
        return null;
      }
      
      const result = await economyService.applyMiningYield(
        state.targetResource,
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
          // Safe access to targetResource type
          const resourceType = state.targetResource?.type || 'unknown';
          triggers.reportProgress('collection', { 
            itemType: resourceType, 
            amount: extractedAmount 
          });
          triggers.reportCollectionProgress(
            resourceType,
            resourceType,
            extractedAmount
          );
          console.log(`[OBJECTIVE-TRIGGER] Reported mining ${extractedAmount}x ${resourceType} for mission objectives`);
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
    
    // Comprehensive null checks
    if (!state || !state.isActive) {
      console.warn('[MINING-DEBUG] Mining is not active in updateProgress');
      return null;
    }
    
    if (!state.targetResource || state.targetResource === null || state.targetResource === undefined) {
      console.warn('[MINING-DEBUG] No target resource in updateProgress');
      return null;
    }
    
    // Validate targetResource has required properties
    if (!state.targetResource.rarity) {
      console.warn('[MINING-DEBUG] Target resource missing rarity property');
      return null;
    }
    
    // Validate deltaTime is a valid number
    const validDeltaTime = Number(deltaTime) || 0;
    if (isNaN(validDeltaTime) || validDeltaTime < 0) {
      console.warn('[MINING-DEBUG] Invalid deltaTime value:', deltaTime);
      return null;
    }
    
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