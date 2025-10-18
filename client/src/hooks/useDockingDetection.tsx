import { useEffect } from 'react';
import { useHUDContext } from '../lib/stores/ui/useHUDContext';
import { useLandedState } from '../lib/stores/surface/useLandedState';
import { useShipStatus } from '../lib/stores/ship/useShipStatus';

// Hook to detect and manage docking state
export function useDockingDetection() {
  const { setDocked } = useHUDContext();
  const { isLanded, landedPlanet } = useLandedState();
  const { shield, hull } = useShipStatus();
  
  useEffect(() => {
    // Simple docking detection based on being landed and having good shield/hull
    // In a real implementation, this would check proximity to stations
    if (isLanded && landedPlanet) {
      // Simulate docking at a station on certain planets
      const stationPlanets = ['Earth', 'Mars', 'Venus'];
      const hasStation = stationPlanets.includes(landedPlanet);
      
      if (hasStation && shield > 50 && hull > 50) {
        // Automatically dock when landed at a station planet
        setDocked(true, `${landedPlanet} Station`);
      } else {
        setDocked(false);
      }
    } else {
      setDocked(false);
    }
  }, [isLanded, landedPlanet, shield, hull, setDocked]);
  
  return {
    // Additional docking utilities could go here
  };
}

// Manual docking trigger (for testing)
export function triggerDocking(stationName?: string) {
  const { setDocked } = useHUDContext.getState();
  setDocked(true, stationName || 'Test Station');
}

// Manual undocking trigger (for testing)
export function triggerUndocking() {
  const { setDocked } = useHUDContext.getState();
  setDocked(false);
}