import { useEffect, useState } from 'react';
import { usePanelManager, PanelId } from '../../lib/stores/ui/usePanelManager';
import { useHUDContext } from '../../lib/stores/ui/useHUDContext';
import { MissionsPanel } from '../economy/MissionsPanel';
import { InventoryDisplay } from '../economy/InventoryDisplay';
import { TradingInterface } from '../economy/TradingInterface';
import { CrewManagementPanel } from '../ship/CrewManagementPanel';
import { StoryProgressionPanel } from './StoryProgressionPanel';
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
  { id: 'crypto', icon: '💰', label: 'Crypto', shortcut: 'F6' },
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
  
  // State to track which button was recently pressed for visual feedback
  const [pressedButton, setPressedButton] = useState<PanelId | null>(null);

  // Set up keyboard shortcuts with proper keydown handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't process shortcuts in minigame context
      if (currentContext === 'minigame') {
        return;
      }

      // Check for F1-F6 keys (matching ACTION_BUTTONS array length)
      const fKeyMatch = event.key.match(/^F(\d+)$/);
      if (fKeyMatch) {
        const fNumber = parseInt(fKeyMatch[1]);
        // Only process keys that have corresponding buttons
        if (fNumber >= 1 && fNumber <= ACTION_BUTTONS.length) {
          // Only prevent default for F-keys, don't stop propagation to allow game controls
          event.preventDefault();
          
          // Find the corresponding button
          const button = ACTION_BUTTONS[fNumber - 1];
          if (button) {
            
            // Add visual feedback - highlight the button briefly
            setPressedButton(button.id);
            setTimeout(() => setPressedButton(null), 300);
            
            // Toggle the panel
            togglePanel(button.id);
            setManualPanelOverride(true);
            refreshPanelOverrideTimeout();
          }
          // Return early for F-keys
          return;
        }
      }

      // ESC key to close all panels - only handle if panels are open
      if (event.key === 'Escape') {
        // Check if any panels are open
        let anyPanelOpen = false;
        panels.forEach(panel => {
          if (panel.isOpen) anyPanelOpen = true;
        });
        
        if (anyPanelOpen) {
          // Only prevent default and handle if panels are open
          event.preventDefault();
          
          
          // Visual feedback - flash all buttons briefly
          setPressedButton('all' as PanelId);
          setTimeout(() => setPressedButton(null), 200);
          
          closeAllPanels();
          setManualPanelOverride(false);
        }
        // Let ESC propagate to game if no panels are open
      }
    };

    // Don't use capture phase to allow game controls to work
    window.addEventListener('keydown', handleKeyDown);
    
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentContext, togglePanel, closeAllPanels, setManualPanelOverride, refreshPanelOverrideTimeout]);

  // Don't show action bar if rightSidebar is hidden and no manual override
  if (!uiZoneVisibility.rightSidebar) {
    return null;
  }

  const handleButtonClick = (id: PanelId) => {
    // Add visual feedback for mouse clicks
    setPressedButton(id);
    setTimeout(() => setPressedButton(null), 200);
    
    togglePanel(id);
    setManualPanelOverride(true);
    refreshPanelOverrideTimeout();
  };

  return (
    <>
      {/* Vertical icon bar on right edge - aligned and polished */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5">
        {ACTION_BUTTONS.map(button => {
          const panel = panels.get(button.id);
          const isOpen = panel?.isOpen || false;
          const isPressed = pressedButton === button.id;
          
          return (
            <button
              key={button.id}
              onClick={() => handleButtonClick(button.id)}
              className={`
                ${isOpen 
                  ? 'bg-cyan-600/90 text-white shadow-lg shadow-cyan-400/50' 
                  : 'bg-gray-900/90 text-cyan-400 hover:text-white hover:bg-cyan-600/90'}
                ${isPressed 
                  ? 'scale-110 bg-yellow-500/90 border-yellow-400 shadow-lg shadow-yellow-400/50 animate-button-press' 
                  : ''}
                w-12 h-12 rounded-xl 
                border-2 ${isOpen ? 'border-cyan-400 animate-pulse' : 'border-cyan-400/30 hover:border-cyan-400'}
                transition-all duration-200 backdrop-blur-md 
                flex items-center justify-center
                relative group
                transform hover:scale-105
                ${isOpen ? '' : 'hover:shadow-md hover:shadow-cyan-400/30'}
              `}
              title={`${button.label} (${button.shortcut})`}
              aria-label={`${button.label} (${button.shortcut})`}
            >
              <span className={`text-xl ${isPressed ? 'scale-125' : ''} ${isOpen ? 'drop-shadow-glow' : ''} transition-transform duration-150`}>
                {button.icon}
              </span>
              
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

      {/* Panels - sliding in from right with proper spacing from action bar */}
      <div className="fixed right-16 top-1/2 -translate-y-1/2 w-96 h-[80vh] max-h-[600px] z-50 pointer-events-none">
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