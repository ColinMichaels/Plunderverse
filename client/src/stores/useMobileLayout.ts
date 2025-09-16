import { create } from 'zustand';

export interface MobileLayoutConfig {
  // Z-index layers (following design system)
  zIndex: {
    canvas: 0;
    hud: 20;
    modal: 40;
    tooltip: 50;
  };
  
  // Standard spacing and sizing
  spacing: {
    edge: '1rem';        // 16px from screen edges
    button: '0.75rem';   // 12px between buttons
    panel: '1rem';       // 16px panel padding
  };
  
  // Button sizing (44px minimum touch target)
  button: {
    size: '3rem';        // 48px for primary actions
    sizeSmall: '2.5rem'; // 40px for secondary actions
    radius: '0.75rem';   // 12px border radius
  };
  
  // Panel styling
  panel: {
    bg: 'bg-slate-900/90';
    border: 'border border-slate-600/50';
    backdrop: 'backdrop-blur-sm';
    radius: 'rounded-xl';
  };
  
  // Typography
  text: {
    button: 'text-sm font-medium';
    label: 'text-xs text-slate-400';
    value: 'text-sm text-cyan-400 font-mono';
  };
}

export interface MobileLayoutState {
  config: MobileLayoutConfig;
  
  // Dynamic layout state
  safeAreas: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  
  // Update safe areas (for notches, home indicators, etc.)
  setSafeAreas: (areas: Partial<MobileLayoutState['safeAreas']>) => void;
}

export const useMobileLayout = create<MobileLayoutState>((set) => ({
  config: {
    zIndex: { canvas: 0, hud: 20, modal: 40, tooltip: 50 },
    spacing: { edge: '1rem', button: '0.75rem', panel: '1rem' },
    button: { size: '3rem', sizeSmall: '2.5rem', radius: '0.75rem' },
    panel: {
      bg: 'bg-slate-900/90',
      border: 'border border-slate-600/50',
      backdrop: 'backdrop-blur-sm',
      radius: 'rounded-xl',
    },
    text: {
      button: 'text-sm font-medium',
      label: 'text-xs text-slate-400',
      value: 'text-sm text-cyan-400 font-mono',
    },
  },
  
  safeAreas: { top: 0, bottom: 0, left: 0, right: 0 },
  
  setSafeAreas: (areas) => set((state) => ({
    safeAreas: { ...state.safeAreas, ...areas }
  })),
}));