import { create } from 'zustand';

export type PanelId = 'missions' | 'inventory' | 'trading' | 'crew' | 'story' | 'controls' | 'settings' | 'crypto' | 'navigation' | 'systems' | 'upgrades' | 'repair';

export interface Panel {
  id: PanelId;
  label: string;
  icon: string;
  isOpen: boolean;
  wasManuallyToggled: boolean;
  priority: number;
}

interface PanelManagerState {
  panels: Map<PanelId, Panel>;
  activePanelId: PanelId | null;
  manualOverride: boolean;
  lastInteractionTime: number;
  
  // Actions
  togglePanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  closeAllPanels: () => void;
  openPanel: (id: PanelId) => void;
  resetManualOverride: () => void;
  getPanelState: (id: PanelId) => Panel | undefined;
  isPanelOpen: (id: PanelId) => boolean;
  setManualOverride: (override: boolean) => void;
}

// Define default panels
const DEFAULT_PANELS: Panel[] = [
  { id: 'missions', label: 'Missions', icon: '📋', isOpen: false, wasManuallyToggled: false, priority: 0 },
  { id: 'inventory', label: 'Inventory', icon: '💼', isOpen: false, wasManuallyToggled: false, priority: 1 },
  { id: 'trading', label: 'Trading', icon: '💱', isOpen: false, wasManuallyToggled: false, priority: 2 },
  { id: 'crew', label: 'Crew', icon: '👥', isOpen: false, wasManuallyToggled: false, priority: 3 },
  { id: 'story', label: 'Story', icon: '📖', isOpen: false, wasManuallyToggled: false, priority: 4 },
  { id: 'controls', label: 'Controls', icon: '❓', isOpen: false, wasManuallyToggled: false, priority: 5 },
  { id: 'settings', label: 'Settings', icon: '⚙️', isOpen: false, wasManuallyToggled: false, priority: 6 },
  { id: 'crypto', label: 'Crypto', icon: '💰', isOpen: false, wasManuallyToggled: false, priority: 7 },
  { id: 'navigation', label: 'Navigation', icon: '🧭', isOpen: false, wasManuallyToggled: false, priority: 8 },
  { id: 'systems', label: 'Ship Systems', icon: '⚡', isOpen: false, wasManuallyToggled: false, priority: 9 },
  { id: 'upgrades', label: 'Upgrades', icon: '🚀', isOpen: false, wasManuallyToggled: false, priority: 10 },
  { id: 'repair', label: 'Quick Repair', icon: '🔧', isOpen: false, wasManuallyToggled: false, priority: 11 },
];

export const usePanelManager = create<PanelManagerState>((set, get) => ({
  panels: new Map(DEFAULT_PANELS.map(p => [p.id, p])),
  activePanelId: null,
  manualOverride: false,
  lastInteractionTime: Date.now(),
  
  togglePanel: (id: PanelId) => {
    const state = get();
    const panel = state.panels.get(id);
    if (!panel) return;
    
    const newIsOpen = !panel.isOpen;
    console.log(`[PanelManager] Toggling ${id}: ${panel.isOpen} -> ${newIsOpen}`);
    
    // Close other panels if opening a new one
    const updatedPanels = new Map(state.panels);
    if (newIsOpen) {
      // Close all other panels
      updatedPanels.forEach((p, pid) => {
        if (pid !== id && p.isOpen) {
          updatedPanels.set(pid, { ...p, isOpen: false });
        }
      });
    }
    
    // Update the toggled panel
    updatedPanels.set(id, {
      ...panel,
      isOpen: newIsOpen,
      wasManuallyToggled: true
    });
    
    set({
      panels: updatedPanels,
      activePanelId: newIsOpen ? id : null,
      manualOverride: true,
      lastInteractionTime: Date.now()
    });
    
    // Auto-reset manual override after 30 seconds of inactivity
    setTimeout(() => {
      const currentState = get();
      if (Date.now() - currentState.lastInteractionTime >= 30000) {
        console.log('[PanelManager] Resetting manual override due to inactivity');
        currentState.resetManualOverride();
      }
    }, 30000);
  },
  
  openPanel: (id: PanelId) => {
    const state = get();
    const panel = state.panels.get(id);
    if (!panel || panel.isOpen) return;
    
    console.log(`[PanelManager] Opening panel: ${id}`);
    
    // Close other panels
    const updatedPanels = new Map(state.panels);
    updatedPanels.forEach((p, pid) => {
      if (pid !== id && p.isOpen) {
        updatedPanels.set(pid, { ...p, isOpen: false });
      }
    });
    
    updatedPanels.set(id, {
      ...panel,
      isOpen: true,
      wasManuallyToggled: true
    });
    
    set({
      panels: updatedPanels,
      activePanelId: id,
      manualOverride: true,
      lastInteractionTime: Date.now()
    });
  },
  
  closePanel: (id: PanelId) => {
    const state = get();
    const panel = state.panels.get(id);
    if (!panel || !panel.isOpen) return;
    
    console.log(`[PanelManager] Closing panel: ${id}`);
    
    const updatedPanels = new Map(state.panels);
    updatedPanels.set(id, {
      ...panel,
      isOpen: false
    });
    
    set({
      panels: updatedPanels,
      activePanelId: state.activePanelId === id ? null : state.activePanelId,
      lastInteractionTime: Date.now()
    });
  },
  
  closeAllPanels: () => {
    console.log('[PanelManager] Closing all panels');
    const state = get();
    const updatedPanels = new Map(state.panels);
    
    updatedPanels.forEach((panel, id) => {
      if (panel.isOpen) {
        updatedPanels.set(id, { ...panel, isOpen: false });
      }
    });
    
    set({
      panels: updatedPanels,
      activePanelId: null,
      lastInteractionTime: Date.now()
    });
  },
  
  resetManualOverride: () => {
    console.log('[PanelManager] Resetting manual override');
    const state = get();
    const updatedPanels = new Map(state.panels);
    
    updatedPanels.forEach((panel, id) => {
      updatedPanels.set(id, { ...panel, wasManuallyToggled: false });
    });
    
    set({
      panels: updatedPanels,
      manualOverride: false
    });
  },
  
  getPanelState: (id: PanelId) => {
    return get().panels.get(id);
  },
  
  isPanelOpen: (id: PanelId) => {
    const panel = get().panels.get(id);
    return panel?.isOpen || false;
  },
  
  setManualOverride: (override: boolean) => {
    set({ manualOverride: override });
  }
}));