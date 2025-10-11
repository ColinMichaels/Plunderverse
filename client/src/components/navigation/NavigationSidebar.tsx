import React, { useEffect } from 'react';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useHUDContext } from '../../lib/stores/ui/useHUDContext';
import { useUILayout } from '../ui/UILayoutManager';
import { SpaceUIPanel } from '../ui/SpaceUIPanel';
import { NavigationPanel } from './NavigationPanel';
import { MinimapPanel } from './MinimapPanel';
import { ShipSystemsPanel } from '../../components/ship/ShipSystemsPanel';
import { ShipUpgradesPanel } from '../../components/ship/ShipUpgradesPanel';
import { QuickRepairPanel } from '../../components/ship/QuickRepairPanel';
import { ParrotSettingsPanel } from './ParrotSettingsPanel';

export const NavigationSidebar: React.FC = () => {
  const { isLanded } = useLandedState();
  const { currentContext, isDocked } = useHUDContext();
  const { togglePanel } = useUILayout();
  
  // Determine which panels should be visible based on context
  const showMinimap = true; // Always available
  const showAutopilot = !isLanded && currentContext !== 'planet-surface';
  const showShipSystems = true; // Always available
  const showShipUpgrades = isLanded || isDocked; // Only when landed or docked
  const showQuickRepair = true; // Always available
  
  // Set up keyboard shortcuts (Alt+1 through Alt+5) - only for visible panels
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
          if (showMinimap) {
            e.preventDefault();
            togglePanel('minimap');
          }
          break;
        case '2':
          if (showAutopilot) {
            e.preventDefault();
            togglePanel('autopilot');
          }
          break;
        case '3':
          if (showShipSystems) {
            e.preventDefault();
            togglePanel('ship-systems');
          }
          break;
        case '4':
          if (showShipUpgrades) {
            e.preventDefault();
            togglePanel('ship-upgrades');
          }
          break;
        case '5':
          if (showQuickRepair) {
            e.preventDefault();
            togglePanel('quick-repair');
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePanel, showMinimap, showAutopilot, showShipSystems, showShipUpgrades, showQuickRepair]);
  
  // Register panels with UILayoutManager using SpaceUIPanel
  // Conditionally render panels based on current context
  return (
    <>
      {/* Minimap - Always available */}
      {showMinimap && (
        <SpaceUIPanel
          id="minimap"
          title="NAVIGATION MAP"
          icon="🗺️"
          zone="left-sidebar"
          priority={1}
          defaultExpanded={true}
          canCollapse={true}
        >
          <MinimapPanel />
        </SpaceUIPanel>
      )}
      
      {/* Navigation Panel - Only in space (combines autopilot and fast travel) */}
      {showAutopilot && (
        <SpaceUIPanel
          id="autopilot"
          title="NAVIGATION"
          icon="🧭"
          zone="left-sidebar"
          priority={2}
          defaultExpanded={false}
          canCollapse={true}
        >
          <NavigationPanel />
        </SpaceUIPanel>
      )}
      
      {/* Ship Systems - Always available */}
      {showShipSystems && (
        <SpaceUIPanel
          id="ship-systems"
          title="SHIP SYSTEMS"
          icon="⚡"
          zone="left-sidebar"
          priority={3}
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
          priority={4}
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
          priority={5}
          defaultExpanded={false}
          canCollapse={true}
        >
          <QuickRepairPanel />
        </SpaceUIPanel>
      )}

      {/* Parrot Settings - Always available in right sidebar */}
      <SpaceUIPanel
        id="parrot-settings"
        title="PARROT SETTINGS"
        icon="🦜"
        zone="right-sidebar"
        priority={1}
        defaultExpanded={false}
        canCollapse={true}
      >
        <ParrotSettingsPanel />
      </SpaceUIPanel>
    </>
  );
};