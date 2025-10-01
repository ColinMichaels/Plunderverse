import { useEffect } from 'react';
import { useHUDContext } from '../lib/stores/ui/useHUDContext';

interface PanelShortcut {
  key: string;
  panelId: string;
  label: string;
  icon: string;
}

// Define panel shortcuts (F1-F5)
const PANEL_SHORTCUTS: PanelShortcut[] = [
  { key: 'F1', panelId: 'missions', label: 'Missions', icon: '📋' },
  { key: 'F2', panelId: 'inventory', label: 'Inventory', icon: '💼' },
  { key: 'F3', panelId: 'story', label: 'Story', icon: '📖' },
  { key: 'F4', panelId: 'controls', label: 'Controls', icon: '⌨️' },
  { key: 'F5', panelId: 'crypto', label: 'Crypto', icon: '💰' },
];

export function usePanelKeyboardShortcuts() {
  const { currentContext } = useHUDContext();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't process shortcuts in certain contexts
      if (currentContext === 'minigame' || currentContext === 'combat') {
        return;
      }

      // Handle F1-F5 keys for panel toggling
      const shortcut = PANEL_SHORTCUTS.find(s => s.key === event.key);
      if (shortcut) {
        event.preventDefault();
        togglePanel(shortcut.panelId);
        console.log(`[Panel Shortcut] ${shortcut.key} pressed - toggling ${shortcut.label}`);
      }
      
      // ESC key to close all panels
      if (event.key === 'Escape') {
        closeAllPanels();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentContext]);

  const togglePanel = (panelId: string) => {
    // Find the panel element and toggle its visibility
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel) {
      const isVisible = panel.classList.contains('expanded');
      if (isVisible) {
        panel.classList.remove('expanded');
        panel.classList.add('collapsed');
      } else {
        // Collapse other panels in combat/mining contexts
        if (currentContext === 'combat' || currentContext === 'mining') {
          closeAllPanels();
        }
        panel.classList.remove('collapsed');
        panel.classList.add('expanded');
      }
    }
  };

  const closeAllPanels = () => {
    const panels = document.querySelectorAll('[data-panel-id]');
    panels.forEach(panel => {
      panel.classList.remove('expanded');
      panel.classList.add('collapsed');
    });
  };

  return {
    shortcuts: PANEL_SHORTCUTS,
    togglePanel,
    closeAllPanels,
  };
}

// Component to display keyboard shortcuts hint
export function PanelShortcutsHint() {
  const { currentContext, uiZoneVisibility } = useHUDContext();
  const { shortcuts } = usePanelKeyboardShortcuts();

  // Don't show in combat or when panels are hidden
  if (!uiZoneVisibility.rightSidebar || currentContext === 'combat') {
    return null;
  }

  return (
    <div className="fixed top-4 right-80 z-30 pointer-events-none">
      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-xs">
        <div className="text-gray-400 mb-1">Panel Shortcuts:</div>
        <div className="flex flex-col gap-1">
          {shortcuts.map(shortcut => (
            <div key={shortcut.key} className="flex items-center gap-2">
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300 font-mono text-xs">
                {shortcut.key}
              </kbd>
              <span className="text-gray-500">
                {shortcut.icon} {shortcut.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-700">
            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300 font-mono text-xs">
              ESC
            </kbd>
            <span className="text-gray-500">Close All</span>
          </div>
        </div>
      </div>
    </div>
  );
}