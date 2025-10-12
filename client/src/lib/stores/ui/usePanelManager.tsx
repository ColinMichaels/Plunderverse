import { create } from 'zustand';

export type PanelId = 'missions' | 'inventory' | 'trading' | 'crew' | 'story' | 'controls' | 'settings' | 'crypto' | 'navigation' | 'systems' | 'upgrades' | 'repair' | 'fast-travel' | 'parrot-settings';

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

const STORAGE_KEY = 'panel-manager-states';

// Load saved panel states from localStorage
const loadPanelStates = (): Partial<Record<PanelId, boolean>> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('[PanelManager] Failed to load panel states:', e);
    return {};
  }
};

// Save panel states to localStorage
const savePanelStates = (panels: Map<PanelId, Panel>) => {
  try {
    const states: Partial<Record<PanelId, boolean>> = {};
    panels.forEach((panel, id) => {
      states[id] = panel.isOpen;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (e) {
    console.error('[PanelManager] Failed to save panel states:', e);
  }
};

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
  { id: 'fast-travel', label: 'Fast Travel', icon: '🚀', isOpen: false, wasManuallyToggled: false, priority: 12 },
  { id: 'parrot-settings', label: 'Parrot', icon: '🦜', isOpen: false, wasManuallyToggled: false, priority: 13 },
];

// Initialize panels with saved states
const initializePanels = (): Map<PanelId, Panel> => {
  const savedStates = loadPanelStates();
  const panels = new Map<PanelId, Panel>();
  
  DEFAULT_PANELS.forEach(panel => {
    panels.set(panel.id, {
      ...panel,
      isOpen: savedStates[panel.id] || false
    });
  });
  
  return panels;
};

export const usePanelManager = create<PanelManagerState>((set, get) => ({
  panels: initializePanels(),
  activePanelId: null,
  manualOverride: false,
  lastInteractionTime: Date.now(),
  
  togglePanel: (id: PanelId) => {
    const state = get();
    const panel = state.panels.get(id);
    if (!panel) return;
    
    const newIsOpen = !panel.isOpen;
    
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
    
    // Save to localStorage
    savePanelStates(updatedPanels);
    
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
        currentState.resetManualOverride();
      }
    }, 30000);
  },
  
  openPanel: (id: PanelId) => {
    const state = get();
    const panel = state.panels.get(id);
    if (!panel || panel.isOpen) return;
    
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
    
    // Save to localStorage
    savePanelStates(updatedPanels);
    
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
    
    const updatedPanels = new Map(state.panels);
    updatedPanels.set(id, {
      ...panel,
      isOpen: false
    });
    
    // Save to localStorage
    savePanelStates(updatedPanels);
    
    set({
      panels: updatedPanels,
      activePanelId: state.activePanelId === id ? null : state.activePanelId,
      lastInteractionTime: Date.now()
    });
  },
  
  closeAllPanels: () => {
    const state = get();
    const updatedPanels = new Map(state.panels);
    
    updatedPanels.forEach((panel, id) => {
      if (panel.isOpen) {
        updatedPanels.set(id, { ...panel, isOpen: false });
      }
    });
    
    // Save to localStorage
    savePanelStates(updatedPanels);
    
    set({
      panels: updatedPanels,
      activePanelId: null,
      lastInteractionTime: Date.now()
    });
  },
  
  resetManualOverride: () => {
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