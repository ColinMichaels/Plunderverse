import {useEffect, useState} from 'react';
import {PanelId, usePanelManager} from '../../lib/stores/ui/usePanelManager';
import {useHUDContext} from '../../lib/stores/ui/useHUDContext';
import {MissionsPanel} from '../economy/MissionsPanel';
import {InventoryDisplay} from '../economy/InventoryDisplay';
import {TradingInterface} from '../economy/TradingInterface';
import {CrewManagementPanel} from '../ship/CrewManagementPanel';
import {StoryProgressionPanel} from './StoryProgressionPanel';
import {CryptoWallet} from '../economy/crypto/CryptoWallet';
import {FastTravelMenu} from '../navigation/FastTravelMenu';
import {ParrotSettingsPanel} from '../navigation/ParrotSettingsPanel';
import {INPUT_KEY_EVENT, InputRouter} from '@/lib/InputRouter';
import {PlanetInfo} from "@/components/shared/PlanetInfo.tsx";
import {CryptoMarketplace} from "@/components/economy/crypto/CryptoMarketplace.tsx";

if (typeof window !== 'undefined') {
    InputRouter.instance().attach();
}

interface ActionButton {
  id: PanelId;
  icon: string;
  label: string;
  shortcut: string;
}

const ACTION_BUTTONS: ActionButton[] = [
    {id: 'fast-travel', icon: '⚡', label: 'Fast Travel', shortcut: 'T'},
    {id: 'planet', icon: '🪐', label: 'Planet Info', shortcut: 'I'},
  { id: 'missions', icon: '📋', label: 'Missions', shortcut: 'F1' },
  { id: 'inventory', icon: '💼', label: 'Inventory', shortcut: 'F2' },
  { id: 'trading', icon: '💱', label: 'Trading', shortcut: 'F3' },
  { id: 'crew', icon: '👥', label: 'Crew', shortcut: 'F4' },
  { id: 'story', icon: '📖', label: 'Story', shortcut: 'F5' },
    {id: 'parrot-settings', icon: '🦜', label: 'Parrot', shortcut: 'P'},
  { id: 'crypto', icon: '💰', label: 'Crypto', shortcut: 'F6' },


];

export function ActionBar() {
    const {
    panels,
      togglePanel,
    closeAllPanels,
  } = usePanelManager();

    const {
        uiZoneVisibility,
    currentContext,
    setManualPanelOverride,
    refreshPanelOverrideTimeout
  } = useHUDContext();

  // State to track which button was recently pressed for visual feedback
  const [pressedButton, setPressedButton] = useState<PanelId | null>(null);

    // Set up keyboard shortcuts using the global InputRouter (high priority)
  useEffect(() => {
      const handleKeyEvent = (evt: Event) => {
          const ce = evt as CustomEvent<{
              key: string;
              code: string;
              altKey?: boolean;
              ctrlKey?: boolean;
              metaKey?: boolean
          }>;
          const detail = ce.detail || ({} as any);
          const key: string = detail.key || '';

      // Don't process shortcuts in minigame context
      if (currentContext === 'minigame') {
        return;
      }

      // Check for F1-F6 keys (matching ACTION_BUTTONS array length)
          const fKeyMatch = key.match(/^F(\d+)$/);
      if (fKeyMatch) {
        const fNumber = parseInt(fKeyMatch[1]);
        if (fNumber >= 1 && fNumber <= ACTION_BUTTONS.length) {
            // Consume globally to prevent other handlers (e.g., PauseMenu) from reacting
            evt.preventDefault();

          const button = ACTION_BUTTONS[fNumber - 1];
          if (button) {
            setPressedButton(button.id);
            setTimeout(() => setPressedButton(null), 300);

            togglePanel(button.id);
            setManualPanelOverride(true);
            refreshPanelOverrideTimeout();
          }
          return;
        }
      }

          const lower = key.toLowerCase();

      // T key for Fast Travel
          if (lower === 't' && !detail.ctrlKey && !detail.altKey && !detail.metaKey) {
              evt.preventDefault();
        setPressedButton('fast-travel');
        setTimeout(() => setPressedButton(null), 300);
        togglePanel('fast-travel');
        setManualPanelOverride(true);
        refreshPanelOverrideTimeout();
        return;
      }

      // P key for Parrot Settings
          if (lower === 'p' && !detail.ctrlKey && !detail.altKey && !detail.metaKey) {
              evt.preventDefault();
        setPressedButton('parrot-settings');
        setTimeout(() => setPressedButton(null), 300);
        togglePanel('parrot-settings');
        setManualPanelOverride(true);
        refreshPanelOverrideTimeout();
        return;
      }

          // I key for Planet Info
          if (lower === 'i' && !detail.ctrlKey && !detail.altKey && !detail.metaKey) {
              evt.preventDefault();
              setPressedButton('planet');
              setTimeout(() => setPressedButton(null), 300);
              togglePanel('planet');
              setManualPanelOverride(true);
              refreshPanelOverrideTimeout();
              return;
          }

      // ESC key to close all panels - only handle if panels are open
          if (key === 'Escape') {
        let anyPanelOpen = false;
        panels.forEach(panel => {
          if (panel.isOpen) anyPanelOpen = true;
        });

        if (anyPanelOpen) {
            evt.preventDefault(); // consume so PauseMenu won't also toggle
          setPressedButton('all' as PanelId);
          setTimeout(() => setPressedButton(null), 200);
          closeAllPanels();
          setManualPanelOverride(false);
        }
      }
    };

      // Register with high priority (capture true) on the global bus
      window.addEventListener(INPUT_KEY_EVENT, handleKeyEvent as EventListener, {capture: true});
    return () => {
        window.removeEventListener(INPUT_KEY_EVENT, handleKeyEvent as EventListener, {capture: true} as any);
    };
  }, [currentContext, panels, togglePanel, closeAllPanels, setManualPanelOverride, refreshPanelOverrideTimeout]);

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
            bg-gray-900
            p-2
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
            <MissionsPanel />
          </div>
        )}
        
        {/* Inventory Panel */}
        {panels.get('inventory')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900
            p-2
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
            <InventoryDisplay />
          </div>
        )}
        
        {/* Trading Panel */}
        {panels.get('trading')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900
             p-2
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
            <TradingInterface isVisible={true} onClose={() => togglePanel('trading')} />
          </div>
        )}

          {/* Planet Info Panel */}
          {panels.get('planet')?.isOpen && (
              <div className="
            absolute inset-0
            bg-gray-900
            p-2
            border-l border-cyan-400/50
            rounded-l-lg
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
                  <PlanetInfo/>
              </div>
          )}

        
        {/* Crew Panel */}
        {panels.get('crew')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900
            p-2
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
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
            bg-gray-900
            border-l border-cyan-400/50 
            rounded-l-lg
            p-2
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
            <StoryProgressionPanel />
          </div>
        )}
        
        {/* Crypto Panel */}
        {panels.get('crypto')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900
            p-2
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
              <CryptoMarketplace/>
            <CryptoWallet />
          </div>
        )}
        
        {/* Fast Travel Panel */}
        {panels.get('fast-travel')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
            <FastTravelMenu onClose={() => togglePanel('fast-travel')} />
          </div>
        )}
        
        {/* Parrot Settings Panel */}
        {panels.get('parrot-settings')?.isOpen && (
          <div className="
            absolute inset-0 
            bg-gray-900/95 backdrop-blur-sm 
            border-l border-cyan-400/50 
            rounded-l-lg 
            pointer-events-auto
            animate-slide-in-right
            overflow-y-auto
            scrollbar-hide
          ">
            <ParrotSettingsPanel />
          </div>
        )}
      </div>
    </>
  );
}
