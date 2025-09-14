import React, { useState, createContext, useContext, ReactNode } from 'react';

// Define UI zones for sidebar layout
export type UIZone = 'left-sidebar' | 'right-sidebar';

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

// Sidebar button component for collapsed panels
function SidebarButton({ 
  panel, 
  onToggle 
}: { 
  panel: UIPanel; 
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="sidebar-panel-button"
      title={panel.title}
      aria-label={`Toggle ${panel.title} panel`}
    >
      {panel.icon && <span className="text-lg">{panel.icon}</span>}
      <span className="sidebar-panel-label">{panel.title}</span>
    </button>
  );
}

// Expanded panel overlay component
function ExpandedPanel({ 
  panel, 
  onToggle 
}: { 
  panel: UIPanel; 
  onToggle: () => void;
}) {
  return (
    <div className="expanded-panel-overlay">
      <div className={`expanded-panel ${panel.zone === 'left-sidebar' ? 'expanded-panel-left' : 'expanded-panel-right'}`}>
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
              aria-label="Collapse panel"
            >
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="transition-transform duration-200"
              >
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Panel content */}
        <div className="space-panel-content max-h-[70vh] opacity-100 overflow-y-auto">
          {panel.children}
        </div>
      </div>
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

  const updatePanel = (id: string, updates: Partial<UIPanel>) => {
    setPanels(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const togglePanel = (id: string) => {
    setPanels(prev => prev.map(p => 
      p.id === id ? { ...p, isExpanded: !p.isExpanded } : p
    ));
  };

  // Group panels by sidebar
  const leftSidebarPanels = panels.filter(p => p.zone === 'left-sidebar');
  const rightSidebarPanels = panels.filter(p => p.zone === 'right-sidebar');
  const expandedPanel = panels.find(p => p.isExpanded);

  return (
    <UILayoutContext.Provider value={{
      panels,
      registerPanel,
      unregisterPanel,
      togglePanel,
      updatePanel
    }}>
      {children}
      
      {/* Left Sidebar */}
      <div className="ui-sidebar ui-sidebar-left">
        {leftSidebarPanels.map((panel) => (
          <SidebarButton
            key={panel.id}
            panel={panel}
            onToggle={() => togglePanel(panel.id)}
          />
        ))}
      </div>

      {/* Right Sidebar */}
      <div className="ui-sidebar ui-sidebar-right">
        {rightSidebarPanels.map((panel) => (
          <SidebarButton
            key={panel.id}
            panel={panel}
            onToggle={() => togglePanel(panel.id)}
          />
        ))}
      </div>

      {/* Expanded Panel Overlay */}
      {expandedPanel && (
        <ExpandedPanel
          panel={expandedPanel}
          onToggle={() => togglePanel(expandedPanel.id)}
        />
      )}
    </UILayoutContext.Provider>
  );
}