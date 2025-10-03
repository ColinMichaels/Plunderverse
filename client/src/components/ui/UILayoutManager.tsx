import React, {
  useState,
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";

export type UIZone = "left-sidebar" | "right-sidebar";

export type UIPanel = {
  id: string;
  zone: UIZone;
  priority: number;
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
    throw new Error("useUILayout must be used within a UILayoutProvider");
  }
  return context;
}

function SidebarButton({
  panel,
  onToggle,
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
      {panel.icon && (
        <span className="text-lg" title={panel.title}>
          {panel.icon}
        </span>
      )}
    </button>
  );
}

function ExpandedPanel({
  panel,
  onToggle,
}: {
  panel: UIPanel;
  onToggle: () => void;
}) {
  return (
    <div className="expanded-panel-overlay">
      <div
        className={`expanded-panel ${panel.zone === "left-sidebar" ? "expanded-panel-left" : "expanded-panel-right"}`}
      >
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
                <path d="M19 13H5v-2h14v2z" />
              </svg>
            </button>
          )}
        </div>

        <div className="space-panel-content max-h-[70vh] opacity-100 overflow-y-auto">
          {panel.children}
        </div>
      </div>
    </div>
  );
}

export function UILayoutProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<UIPanel[]>([]);
  const STORAGE_KEY = 'ui-layout-panel-states';

  // Load panel states from localStorage
  const loadPanelStates = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to load panel states:', e);
      return {};
    }
  }, []);

  // Save panel states to localStorage
  const savePanelStates = useCallback((currentPanels: UIPanel[]) => {
    try {
      const states: Record<string, boolean> = {};
      currentPanels.forEach(p => {
        if (p.canCollapse !== false) {
          states[p.id] = p.isExpanded;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
    } catch (e) {
      console.error('Failed to save panel states:', e);
    }
  }, []);

  const registerPanel = useCallback((panel: UIPanel) => {
    setPanels((prev) => {
      const existing = prev.find((p) => p.id === panel.id);
      const savedStates = loadPanelStates();
      
      if (existing) {
        const hasMetadataChanges = 
          existing.title !== panel.title ||
          existing.icon !== panel.icon ||
          existing.zone !== panel.zone ||
          existing.priority !== panel.priority ||
          existing.canCollapse !== panel.canCollapse;
        
        if (!hasMetadataChanges) {
          return prev;
        }
        
        return prev.map((p) =>
          p.id === panel.id ? { ...p, ...panel, isExpanded: p.isExpanded } : p,
        );
      }
      
      // Use saved state if available and panel is collapsible
      const isExpanded = (panel.canCollapse !== false && savedStates[panel.id] !== undefined) 
        ? savedStates[panel.id] 
        : panel.isExpanded;
      
      const newPanel = { ...panel, isExpanded };
      return [...prev, newPanel].sort((a, b) => a.priority - b.priority);
    });
  }, [loadPanelStates]);

  const unregisterPanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePanel = useCallback((id: string, updates: Partial<UIPanel>) => {
    setPanels((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      savePanelStates(updated);
      return updated;
    });
  }, [savePanelStates]);

  const togglePanel = useCallback((id: string) => {
    setPanels((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id && p.canCollapse !== false) {
          return { ...p, isExpanded: !p.isExpanded };
        }
        return p;
      });
      savePanelStates(updated);
      return updated;
    });
  }, [savePanelStates]);

  // Add function to collapse all panels
  const collapseAllPanels = useCallback(() => {
    setPanels((prev) => {
      const updated = prev.map((p) => 
        p.canCollapse !== false ? { ...p, isExpanded: false } : p
      );
      savePanelStates(updated);
      return updated;
    });
  }, [savePanelStates]);

  // Add ESC key handler to collapse all panels
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if ESC key is pressed and any panels are expanded
      if (event.key === 'Escape') {
        const hasExpandedPanels = panels.some(p => p.isExpanded && p.canCollapse !== false);
        if (hasExpandedPanels) {
          event.preventDefault();
          event.stopPropagation();
          collapseAllPanels();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [panels, collapseAllPanels]);

  const leftSidebarPanels = panels.filter((p) => p.zone === "left-sidebar");
  const rightSidebarPanels = panels.filter((p) => p.zone === "right-sidebar");

  return (
    <UILayoutContext.Provider
      value={{
        panels,
        registerPanel,
        unregisterPanel,
        togglePanel,
        updatePanel,
      }}
    >
      {children}

      <div className="ui-sidebar ui-sidebar-left">
        {leftSidebarPanels.map((panel) => (
          <SidebarButton
            key={panel.id}
            panel={panel}
            onToggle={() => togglePanel(panel.id)}
          />
        ))}
      </div>

      <div className="ui-sidebar ui-sidebar-right">
        {rightSidebarPanels.map((panel) => (
          <SidebarButton
            key={panel.id}
            panel={panel}
            onToggle={() => togglePanel(panel.id)}
          />
        ))}
      </div>

      {panels.map((panel) => (
        <div 
          key={panel.id}
          style={{ display: panel.isExpanded ? 'block' : 'none' }}
        >
          <ExpandedPanel
            panel={panel}
            onToggle={() => togglePanel(panel.id)}
          />
        </div>
      ))}
    </UILayoutContext.Provider>
  );
}
