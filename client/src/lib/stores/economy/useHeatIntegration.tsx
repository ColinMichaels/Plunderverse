import { useHeatSystem } from '../player/useHeatSystem';
import { usePlunderverseMissions } from './usePlunderverseMissions';
import { usePlayer } from '../player/usePlayer';

/**
 * Integration module for heat system with missions and economy
 */
export const integrateHeatWithMissions = () => {
  const heatSystem = useHeatSystem.getState();
  const missionsStore = usePlunderverseMissions.getState();
  
  // Hook into mission completion to apply heat
  const originalAcceptMission = missionsStore.acceptMission;
  missionsStore.acceptMission = (missionId: string) => {
    const result = originalAcceptMission(missionId);
    
    if (result) {
      const mission = missionsStore.availableMissions.find(m => m.id === missionId);
      
      // Apply heat based on mission type
      if (mission) {
        switch (mission.type) {
          case 'smuggling':
            // Smuggling immediately adds heat when accepted
            heatSystem.applyHeat('minor_smuggling', 0.5);
            break;
          case 'bounty':
            // Bounty hunting might be legal or illegal
            // TODO: Add tags support to Mission type if needed
            // For now, assume all bounty missions add some heat
            heatSystem.applyHeat('assault', 0.2);
            break;
          case 'combat':
            // Combat missions often involve illegal activities
            // TODO: Add faction support to Mission type if needed
            // For now, assume combat missions add moderate heat
            heatSystem.applyHeat('piracy', 0.3);
            break;
        }
      }
    }
    
    return result;
  };
};

/**
 * Apply heat consequences to mission availability
 */
export const applyHeatToMissionAvailability = () => {
  const heatSystem = useHeatSystem.getState();
  const missionsStore = usePlunderverseMissions.getState();
  
  // Filter missions based on heat restrictions
  if (heatSystem.missionRestrictions.length > 0) {
    const filteredMissions = missionsStore.availableMissions.filter(mission => {
      // Block restricted mission types
      return !heatSystem.missionRestrictions.includes(mission.type);
    });
    
    // Update available missions if restrictions apply
    if (filteredMissions.length !== missionsStore.availableMissions.length) {
      console.log(`[HeatIntegration] Restricting missions due to heat level ${heatSystem.wantedLevel}`);
      // This would need to be implemented in the missions store
    }
  }
};

/**
 * Handle heat generation from various game actions
 */
export const handleCrimeAction = (action: string, context?: any) => {
  const heatSystem = useHeatSystem.getState();
  const player = usePlayer.getState();
  
  switch (action) {
    case 'STEAL_CARGO':
      heatSystem.applyHeat('theft_minor', 1);
      break;
      
    case 'ATTACK_CORPORATION':
      heatSystem.applyHeat('corporate_espionage', 1);
      player.updateReputation('corporations', -10);
      break;
      
    case 'SMUGGLE_CONTRABAND':
      const severity = context?.value > 10000 ? 'major_smuggling' : 'minor_smuggling';
      heatSystem.applyHeat(severity, 1);
      break;
      
    case 'DESTROY_PATROL':
      heatSystem.applyHeat('murder', 1);
      player.updateNotoriety(10);
      break;
      
    case 'HACK_SYSTEM':
      heatSystem.applyHeat('corporate_espionage', 0.5);
      break;
      
    case 'BETRAY_FACTION':
      heatSystem.applyHeat('faction_betrayal', 1);
      const faction = context?.faction || 'independents';
      player.updateReputation(faction, -50);
      break;
      
    default:
      console.log(`[HeatIntegration] Unknown crime action: ${action}`);
  }
};