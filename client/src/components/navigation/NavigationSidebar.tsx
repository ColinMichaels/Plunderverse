import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { usePanelManager } from '../../lib/stores/ui/usePanelManager';
import { AutopilotPanel } from './AutopilotPanel';
import { ShipSystemsPanel } from '../../components/ship/ShipSystemsPanel';
import { ShipUpgradesPanel } from '../../components/ship/ShipUpgradesPanel';
import { QuickRepairPanel } from '../../components/ship/QuickRepairPanel';
import {
  Navigation,
  Settings,
  Wrench,
  Zap,
  ChevronLeft,
  ChevronRight,
  Compass,
  Shield,
  Package,
  Activity
} from 'lucide-react';

interface PanelConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  color: string;
  shortcut?: string;
}

export const NavigationSidebar: React.FC = () => {
  const { isLanded } = useLandedState();
  const [expandedPanel, setExpandedPanel] = useState<string | null>('navigation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Don't show sidebar when landed on planet surface
  if (isLanded) return null;
  
  const panels: PanelConfig[] = [
    {
      id: 'navigation',
      label: 'Autopilot',
      icon: <Navigation className="w-5 h-5" />,
      component: <AutopilotPanel />,
      color: 'from-orange-500 to-yellow-500',
      shortcut: 'A'
    },
    {
      id: 'systems',
      label: 'Ship Systems',
      icon: <Activity className="w-5 h-5" />,
      component: <ShipSystemsPanel />,
      color: 'from-cyan-500 to-blue-500',
      shortcut: 'S'
    },
    {
      id: 'upgrades',
      label: 'Upgrades',
      icon: <Zap className="w-5 h-5" />,
      component: <ShipUpgradesPanel />,
      color: 'from-purple-500 to-pink-500',
      shortcut: 'U'
    },
    {
      id: 'repair',
      label: 'Quick Repair',
      icon: <Wrench className="w-5 h-5" />,
      component: <QuickRepairPanel />,
      color: 'from-green-500 to-emerald-500',
      shortcut: 'R'
    }
  ];
  
  const handlePanelToggle = (panelId: string) => {
    if (expandedPanel === panelId) {
      setExpandedPanel(null);
    } else {
      setExpandedPanel(panelId);
    }
  };
  
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    if (!sidebarCollapsed) {
      setExpandedPanel(null);
    }
  };
  
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const key = e.key.toUpperCase();
      const panel = panels.find(p => p.shortcut === key);
      
      if (panel) {
        e.preventDefault();
        handlePanelToggle(panel.id);
        if (sidebarCollapsed) {
          setSidebarCollapsed(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [expandedPanel, sidebarCollapsed]);
  
  return (
    <div className="ui-sidebar ui-sidebar-left">
      <motion.div
        className="relative flex"
        initial={{ x: 0 }}
        animate={{ x: sidebarCollapsed ? -60 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Icon Panel */}
        <div className="flex flex-col gap-2 p-2 bg-slate-900/90 backdrop-blur-md border-r border-orange-500/30">
          {/* Sidebar Toggle Button */}
          <motion.button
            onClick={handleSidebarToggle}
            className="p-3 rounded-lg bg-slate-800/50 border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronLeft className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
            </motion.div>
          </motion.button>
          
          <div className="w-full h-px bg-orange-500/20 my-1" />
          
          {/* Panel Icons */}
          {panels.map((panel) => (
            <motion.button
              key={panel.id}
              onClick={() => handlePanelToggle(panel.id)}
              className={`relative p-3 rounded-lg transition-all group ${
                expandedPanel === panel.id
                  ? 'bg-gradient-to-r ' + panel.color + ' shadow-lg'
                  : 'bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800/70 hover:border-orange-500/30'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={expandedPanel === panel.id ? 'text-white' : 'text-gray-400 group-hover:text-orange-400'}>
                {panel.icon}
              </div>
              
              {/* Tooltip */}
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none z-50"
                  >
                    <div className="bg-slate-900 border border-orange-500/30 rounded-lg px-3 py-1.5 whitespace-nowrap">
                      <div className="text-xs text-orange-400 font-mono">
                        {panel.label}
                        {panel.shortcut && (
                          <span className="ml-2 text-gray-500">({panel.shortcut})</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Active Indicator */}
              {expandedPanel === panel.id && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-400 rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>
        
        {/* Expanded Panel Content */}
        <AnimatePresence mode="wait">
          {expandedPanel && !sidebarCollapsed && (
            <motion.div
              key={expandedPanel}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="ml-2"
            >
              {panels.find(p => p.id === expandedPanel)?.component}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Collapsed State Expand Button */}
      <AnimatePresence>
        {sidebarCollapsed && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={handleSidebarToggle}
            className="fixed left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-slate-900/90 border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all z-50"
          >
            <ChevronRight className="w-5 h-5 text-orange-400" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};