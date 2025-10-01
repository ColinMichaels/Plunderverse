import { useEffect, useCallback } from 'react';
import { useObjectiveTriggers } from './useObjectiveTriggers';
import { Coordinate3D } from '../../plunderverse/types';

/**
 * Hook that provides location-based objective progress reporting
 * Can be used by components to report when player reaches specific locations
 */
export const useLocationTrigger = () => {
  const triggers = useObjectiveTriggers();
  
  // Manual trigger functions for components that need explicit control
  const reportLocation = useCallback((location: string, coordinates?: Coordinate3D, planet?: string) => {
    triggers.reportLocationProgress(location, coordinates, planet);
    console.log(`[LocationTrigger] Reported location: ${location || planet || 'coordinates'}`);
  }, [triggers]);
  
  const reportPlanetReached = useCallback((planet: string) => {
    triggers.reportLocationProgress(undefined, undefined, planet);
    console.log(`[LocationTrigger] Reported planet reached: ${planet}`);
  }, [triggers]);
  
  const reportCoordinatesReached = useCallback((coordinates: Coordinate3D, radius?: number) => {
    // Report with custom radius if needed
    const triggerData = {
      type: 'location' as const,
      coordinates,
      radius: radius || 10,
      currentValue: 1,
      targetValue: 1
    };
    
    // Find all location objectives and check if we're within range
    const activeObjectives = triggers.getActiveObjectives();
    activeObjectives.forEach(obj => {
      if (obj.triggerType === 'location' && obj.triggerData?.coordinates) {
        const distance = Math.sqrt(
          Math.pow(coordinates.x - obj.triggerData.coordinates.x, 2) +
          Math.pow(coordinates.y - obj.triggerData.coordinates.y, 2) +
          Math.pow(coordinates.z - obj.triggerData.coordinates.z, 2)
        );
        
        if (distance <= (obj.triggerData.radius || 10)) {
          triggers.reportObjectiveProgress(obj.id, triggerData);
          console.log(`[LocationTrigger] Within range of objective ${obj.id}`);
        }
      }
    });
  }, [triggers]);
  
  const reportSystemReached = useCallback((system: string) => {
    triggers.reportLocationProgress(system, undefined, undefined);
    console.log(`[LocationTrigger] Reported system reached: ${system}`);
  }, [triggers]);
  
  return {
    reportLocation,
    reportPlanetReached,
    reportCoordinatesReached,
    reportSystemReached,
    // Also expose the raw location progress function
    reportLocationProgress: triggers.reportLocationProgress
  };
};

export default useLocationTrigger;