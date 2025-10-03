import React, { useEffect } from 'react';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useUILayout } from '../ui/UILayoutManager';
import { SpaceUIPanel } from '../ui/SpaceUIPanel';
import { AutopilotPanel } from './AutopilotPanel';
import { ShipSystemsPanel } from '../../components/ship/ShipSystemsPanel';
import { ShipUpgradesPanel } from '../../components/ship/ShipUpgradesPanel';
import { QuickRepairPanel } from '../../components/ship/QuickRepairPanel';

export const NavigationSidebar: React.FC = () => {
  const { isLanded } = useLandedState();
  const { togglePanel } = useUILayout();
  
  // Don't show sidebar when landed on planet surface
  if (isLanded) return null;
  
  // Set up keyboard shortcuts (Alt+1 through Alt+4)
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
          e.preventDefault();
          togglePanel('autopilot');
          console.log('[NavigationSidebar] Alt+1 pressed - toggling Autopilot panel');
          break;
        case '2':
          e.preventDefault();
          togglePanel('ship-systems');
          console.log('[NavigationSidebar] Alt+2 pressed - toggling Ship Systems panel');
          break;
        case '3':
          e.preventDefault();
          togglePanel('ship-upgrades');
          console.log('[NavigationSidebar] Alt+3 pressed - toggling Ship Upgrades panel');
          break;
        case '4':
          e.preventDefault();
          togglePanel('quick-repair');
          console.log('[NavigationSidebar] Alt+4 pressed - toggling Quick Repair panel');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePanel]);
  
  // Register panels with UILayoutManager using SpaceUIPanel
  // These components don't render anything visible - they just register the panels
  return (
    <>
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
      
      <SpaceUIPanel
        id="ship-upgrades"
        title="UPGRADES"
        icon="🚀"
        zone="left-sidebar"
        priority={3}
        defaultExpanded={false}
        canCollapse={true}
      >
        <ShipUpgradesPanel />
      </SpaceUIPanel>
      
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
    </>
  );
};