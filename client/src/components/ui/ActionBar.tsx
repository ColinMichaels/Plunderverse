import { useEffect } from 'react';
import { usePanelManager, PanelId } from '../../lib/stores/ui/usePanelManager';
import { useHUDContext } from '../../lib/stores/ui/useHUDContext';
import { MissionsPanel } from '../economy/MissionsPanel';
import { InventoryDisplay } from '../economy/InventoryDisplay';
import { TradingInterface } from '../economy/TradingInterface';
import { CrewManagementPanel } from '../ship/CrewManagementPanel';
import { StoryProgressionPanel } from './StoryProgressionPanel';
import { ControlsHelp } from '../screens/ControlsHelp';
import { SettingsPanel } from '../screens/SettingsPanel';
import { CryptoWallet } from '../economy/crypto/CryptoWallet';

interface ActionButton {
  id: PanelId;
  icon: string;
  label: string;
  shortcut: string;
}

const ACTION_BUTTONS: ActionButton[] = [
  { id: 'missions', icon: '📋', label: 'Missions', shortcut: 'F1' },
  { id: 'inventory', icon: '💼', label: 'Inventory', shortcut: 'F2' },
  { id: 'trading', icon: '💱', label: 'Trading', shortcut: 'F3' },
  { id: 'crew', icon: '👥', label: 'Crew', shortcut: 'F4' },
  { id: 'story', icon: '📖', label: 'Story', shortcut: 'F5' },
  { id: 'controls', icon: '❓', label: 'Controls', shortcut: 'F6' },
  { id: 'settings', icon: '⚙️', label: 'Settings', shortcut: 'F7' },
  { id: 'crypto', icon: '💰', label: 'Crypto', shortcut: 'F8' },
];

export function ActionBar() {
  const { 
    panels, 
    togglePanel, 
    openPanel,
    closeAllPanels,
    setManualOverride 
  } = usePanelManager();
  
  const { 
    uiZoneVisibility, 
    currentContext,
    setManualPanelOverride,
    refreshPanelOverrideTimeout
  } = useHUDContext();

  // Set up keyboard shortcuts with proper keydown handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't process shortcuts in minigame context
      if (currentContext === 'minigame') {
        return;
      }

      // Check for F1-F8 keys
      const fKeyMatch = event.key.match(/^F(\d+)$/);
      if (fKeyMatch) {
        const fNumber = parseInt(fKeyMatch[1]);
        if (fNumber >= 1 && fNumber <= 8) {
          event.preventDefault();
          event.stopPropagation();
          
          // Find the corresponding button
          const button = ACTION_BUTTONS[fNumber - 1];
          if (button) {
            console.log(`[ActionBar] ${event.key} pressed - toggling ${button.label}`);
            togglePanel(button.id);
            setManualPanelOverride(true);
            refreshPanelOverrideTimeout();
          }
        }
      }

      // ESC key to close all panels
      if (event.key === 'Escape') {
        console.log('[ActionBar] ESC pressed - closing all panels');
        closeAllPanels();
        setManualPanelOverride(false);
      }
    };

    // Use capture phase to ensure we get the event first
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    // Debug logging
    console.log('[ActionBar] Keyboard shortcuts initialized');
    console.log('[ActionBar] Available shortcuts: F1-F8 for panels, ESC to close all');
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [currentContext, togglePanel, closeAllPanels, setManualPanelOverride, refreshPanelOverrideTimeout]);

  // Don't show action bar if rightSidebar is hidden and no manual override
  if (!uiZoneVisibility.rightSidebar) {
    return null;
  }

  const handleButtonClick = (id: PanelId) => {
    console.log(`[ActionBar] Button clicked: ${id}`);
    togglePanel(id);
    setManualPanelOverride(true);
    refreshPanelOverrideTimeout();
  };

  return (
    <>
      {/* Vertical icon bar on right edge */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        {ACTION_BUTTONS.map(button => {
          const panel = panels.get(button.id);
          const isOpen = panel?.isOpen || false;
          
          return (
            <button
              key={button.id}
              onClick={() => handleButtonClick(button.id)}
              className={`
                bg-gray-900/90 hover:bg-cyan-600/90 
                ${isOpen ? 'bg-cyan-600/90 text-white' : 'text-cyan-400 hover:text-white'}
                w-10 h-10 rounded-lg 
                border ${isOpen ? 'border-cyan-400' : 'border-cyan-400/50 hover:border-cyan-400'}
                transition-all backdrop-blur-sm 
                flex items-center justify-center
                relative group
              `}
              title={`${button.label} (${button.shortcut})`}
            >
              <span className="text-xl">{button.icon}</span>
              
              {/* Tooltip on hover */}
              <div className="
                absolute right-full mr-2 
                bg-black/90 text-white px-2 py-1 rounded 
                text-xs whitespace-nowrap
                opacity-0 group-hover:opacity-100
                pointer-events-none
                transition-opacity
              ">
                {button.label} ({button.shortcut})
              </div>
            </button>
          );
        })}
      </div>

      {/* Panels - sliding in from right */}
      <div className="fixed right-16 top-20 bottom-20 w-96 z-30 pointer-events-none">
        {/* Missions Panel */}
        {panels.get('missions')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <MissionsPanel />
          </div>
        )}
        
        {/* Inventory Panel */}
        {panels.get('inventory')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <InventoryDisplay />
          </div>
        )}
        
        {/* Trading Panel */}
        {panels.get('trading')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <TradingInterface isVisible={true} onClose={() => togglePanel('trading')} />
          </div>
        )}
        
        {/* Crew Panel */}
        {panels.get('crew')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <CrewManagementPanel 
              onClose={() => togglePanel('crew')}
              onOpenRecruitment={() => {
                // Handle recruitment opening if needed
                console.log('[ActionBar] Crew recruitment requested');
              }}
            />
          </div>
        )}
        
        {/* Story Panel */}
        {panels.get('story')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <StoryProgressionPanel />
          </div>
        )}
        
        {/* Controls Panel */}
        {panels.get('controls')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <ControlsHelp />
          </div>
        )}
        
        {/* Settings Panel */}
        {panels.get('settings')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <SettingsPanel open={true} onOpenChange={(open) => !open && togglePanel('settings')} />
          </div>
        )}
        
        {/* Crypto Panel */}
        {panels.get('crypto')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-cyan-600 scrollbar-track-gray-800
          ">
            <CryptoWallet />
          </div>
        )}
      </div>
    </>
  );
}