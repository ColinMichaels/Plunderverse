import React, { useEffect } from 'react';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useHUDContext } from '../../lib/stores/ui/useHUDContext';
import { useUILayout } from '../ui/UILayoutManager';
import { SpaceUIPanel } from '../ui/SpaceUIPanel';
import { AutopilotPanel } from './AutopilotPanel';
import { ShipSystemsPanel } from '../../components/ship/ShipSystemsPanel';
import { ShipUpgradesPanel } from '../../components/ship/ShipUpgradesPanel';
import { QuickRepairPanel } from '../../components/ship/QuickRepairPanel';

export const NavigationSidebar: React.FC = () => {
  const { isLanded, landedPlanet } = useLandedState();
  const { currentContext, isDocked, dockedStationName } = useHUDContext();
  const { togglePanel } = useUILayout();
  
  // Determine which panels should be visible based on context
  const showAutopilot = !isLanded && currentContext !== 'planet-surface';
  const showShipSystems = true; // Always available
  const showShipUpgrades = isLanded || isDocked; // Only when landed or docked
  const showQuickRepair = true; // Always available
  
  // Set up keyboard shortcuts (Alt+1 through Alt+4) - only for visible panels
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Check for Alt key modifier
      if (!e.altKey) return;
      
      switch (e.key) {
        case '1':
          if (showAutopilot) {
            e.preventDefault();
            togglePanel('autopilot');
          }
          break;
        case '2':
          if (showShipSystems) {
            e.preventDefault();
            togglePanel('ship-systems');
          }
          break;
        case '3':
          if (showShipUpgrades) {
            e.preventDefault();
            togglePanel('ship-upgrades');
          }
          break;
        case '4':
          if (showQuickRepair) {
            e.preventDefault();
            togglePanel('quick-repair');
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePanel, showAutopilot, showShipSystems, showShipUpgrades, showQuickRepair]);
  
  // Register panels with UILayoutManager using SpaceUIPanel
  // Conditionally render panels based on current context
  return (
    <>
      {/* Autopilot - Only in space */}
      {showAutopilot && (
        <SpaceUIPanel
          id="autopilot"
          title="AUTOPILOT"
          icon="🧭"
          zone="left-sidebar"
          priority={1}
          defaultExpanded={false}
          canCollapse={true}
        >
          <AutopilotPanel />
        </SpaceUIPanel>
      )}
      
      {/* Ship Systems - Always available */}
      {showShipSystems && (
        <SpaceUIPanel
          id="ship-systems"
          title="SHIP SYSTEMS"
          icon="⚡"
          zone="left-sidebar"
          priority={2}
          defaultExpanded={false}
          canCollapse={true}
        >
          <ShipSystemsPanel />
        </SpaceUIPanel>
      )}
      
      {/* Ship Upgrades - Only when docked or landed */}
      {showShipUpgrades && (
        <SpaceUIPanel
          id="ship-upgrades"
          title={isDocked ? "STATION UPGRADES" : (isLanded ? "FIELD REPAIRS" : "UPGRADES")}
          icon="🚀"
          zone="left-sidebar"
          priority={3}
          defaultExpanded={false}
          canCollapse={true}
        >
          <ShipUpgradesPanel />
        </SpaceUIPanel>
      )}
      
      {/* Quick Repair - Always available */}
      {showQuickRepair && (
        <SpaceUIPanel
          id="quick-repair"
          title="QUICK REPAIR"
          icon="🔧"
          zone="left-sidebar"
          priority={4}
          defaultExpanded={false}
          canCollapse={true}
        >
          <QuickRepairPanel />
        </SpaceUIPanel>
      )}
    </>
  );
};