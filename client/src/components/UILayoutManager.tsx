import React, { useState, createContext, useContext, ReactNode } from 'react';

// Define UI zones around the screen edges
export type UIZone = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center-right' 
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type UIPanel = {
  id: string;
  zone: UIZone;
  priority: number; // Lower numbers have higher priority
  isExpanded: boolean;
  children: ReactNode;
  title: string;
  icon?: string;
  canCollapse?: boolean;
};

type UILayoutContextType = {
  panels: UIPanel[];
  registerPanel: (panel: UIPanel) => void;
  unregisterPanel: (id: string) => void;
  togglePanel: (id: string) => void;
  updatePanel: (id: string, updates: Partial<UIPanel>) => void;
};

const UILayoutContext = createContext<UILayoutContextType | null>(null);

export function useUILayout() {
  const context = useContext(UILayoutContext);
  if (!context) {
    throw new Error('useUILayout must be used within a UILayoutProvider');
  }
  return context;
}

// Get position styles for each zone
function getZoneStyles(zone: UIZone, panelIndex: number): React.CSSProperties {
  const spacing = 8; // Base spacing
  const offset = panelIndex * 4; // Slight offset for stacked panels
  
  const baseStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 40 + panelIndex,
  };

  switch (zone) {
    case 'top-left':
      return { ...baseStyles, top: spacing + offset, left: spacing + offset };
    case 'top-center':
      return { ...baseStyles, top: spacing + offset, left: '50%', transform: 'translateX(-50%)' };
    case 'top-right':
      return { ...baseStyles, top: spacing + offset, right: spacing + offset };
    case 'center-left':
      return { ...baseStyles, top: '50%', left: spacing + offset, transform: 'translateY(-50%)' };
    case 'center-right':
      return { ...baseStyles, top: '50%', right: spacing + offset, transform: 'translateY(-50%)' };
    case 'bottom-left':
      return { ...baseStyles, bottom: spacing + offset, left: spacing + offset };
    case 'bottom-center':
      return { ...baseStyles, bottom: spacing + offset, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-right':
      return { ...baseStyles, bottom: spacing + offset, right: spacing + offset };
    default:
      return baseStyles;
  }
}

// Space-like panel styling
function SpacePanel({ 
  panel, 
  style, 
  onToggle 
}: { 
  panel: UIPanel; 
  style: React.CSSProperties; 
  onToggle: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={style}
      className={`space-panel transition-all duration-300 pointer-events-auto ${
        panel.isExpanded ? 'space-panel-expanded' : 'space-panel-collapsed'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Panel header */}
      <div className="space-panel-header">
        <div className="flex items-center space-x-2">
          {panel.icon && <span className="text-cyan-400">{panel.icon}</span>}
          <span className="text-cyan-400 font-mono text-sm font-semibold">
            {panel.title}
          </span>
        </div>
        
        {panel.canCollapse !== false && (
          <button
            onClick={onToggle}
            className="space-panel-toggle"
            aria-label={panel.isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className={`transition-transform duration-200 ${
                panel.isExpanded ? 'rotate-180' : ''
              }`}
            >
              <path d="M7 14l5-5 5 5z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Panel content */}
      <div className={`space-panel-content ${
        panel.isExpanded ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        {panel.children}
      </div>

      {/* Collapsed indicator */}
      {!panel.isExpanded && (
        <div className="space-panel-indicator">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
}

export function UILayoutProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<UIPanel[]>([]);

  const registerPanel = (panel: UIPanel) => {
    setPanels(prev => {
      const existing = prev.find(p => p.id === panel.id);
      if (existing) {
        return prev.map(p => p.id === panel.id ? panel : p);
      }
      return [...prev, panel].sort((a, b) => a.priority - b.priority);
    });
  };

  const unregisterPanel = (id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id));
  };

  const togglePanel = (id: string) => {
    setPanels(prev => prev.map(p => 
      p.id === id ? { ...p, isExpanded: !p.isExpanded } : p
    ));
  };

  const updatePanel = (id: string, updates: Partial<UIPanel>) => {
    setPanels(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  // Group panels by zone
  const panelsByZone = panels.reduce((acc, panel) => {
    if (!acc[panel.zone]) acc[panel.zone] = [];
    acc[panel.zone].push(panel);
    return acc;
  }, {} as Record<UIZone, UIPanel[]>);

  return (
    <UILayoutContext.Provider value={{
      panels,
      registerPanel,
      unregisterPanel,
      togglePanel,
      updatePanel
    }}>
      {children}
      
      {/* Render all registered panels */}
      <div className="ui-layout-panels pointer-events-none">
        {Object.entries(panelsByZone).map(([zone, zonePanels]) =>
          zonePanels.map((panel, index) => (
            <SpacePanel
              key={panel.id}
              panel={panel}
              style={getZoneStyles(zone as UIZone, index)}
              onToggle={() => togglePanel(panel.id)}
            />
          ))
        )}
      </div>
    </UILayoutContext.Provider>
  );
}