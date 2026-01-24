import { useState } from 'react';
import { X, Info, Navigation, Zap, Settings, Target, Shield, Fuel } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useCreditsData } from '../../domain/economy/selectors';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { ActionBar } from './ActionBar';
import { ControlPanel } from './ControlPanel';
import { CleanViewToggle } from './CleanViewToggle';
import { NavigationPanel } from './panels/NavigationPanel';
import { ShipStatusPanel } from './panels/ShipStatusPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { MissionsPanel } from './panels/MissionsPanel';
import { WantedLevelIndicator } from '../ui/WantedLevelIndicator';

type ActivePanel = 'none' | 'navigation' | 'status' | 'missions' | 'settings';

export function MobileHUD() {
  const { isMobile } = useInput();
  const { config, isCleanViewMode } = useMobileLayout();
  const [showInstructions, setShowInstructions] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');

  const { selectedPlanet, distanceToTarget } = useSolarSystem();
  const { shield, hull, isThrusting } = useShipStatus();
  const { getEquipment } = useEquipment();
  const { credits } = useCreditsData();
  const { currentHeat } = useHeatSystem();

  const fuelTank = getEquipment("fuel-tank");
  const fuel = fuelTank
    ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100
    : 0;

  const getBarColor = (value: number, thresholds: [number, number] = [30, 60]) => {
    if (value > thresholds[1]) return 'bg-green-400';
    if (value > thresholds[0]) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  if (!isMobile) return null;

  const openPanel = (panel: ActivePanel) => {
    setActivePanel(panel);
  };

  const closePanel = () => {
    setActivePanel('none');
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: config.zIndex.hud }}>
        {/* Top Left - Control Panel (Gyro/Touch) */}
        {!isCleanViewMode && (
          <div 
            className="absolute top-4 left-4 pointer-events-auto"
            data-ui
          >
            <ControlPanel />
          </div>
        )}

        {/* Top Center - Target & Status Bar */}
        {!isCleanViewMode && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
            <div className="bg-slate-900/90 border border-slate-600/50 rounded-lg px-3 py-2 backdrop-blur-sm">
              {/* Target info */}
              <div className="flex items-center gap-3 text-xs">
                {selectedPlanet ? (
                  <button 
                    onClick={() => openPanel('navigation')}
                    className="flex items-center gap-1 text-cyan-400 font-mono"
                  >
                    <Target className="w-3 h-3" />
                    <span>{selectedPlanet}</span>
                    <span className="text-slate-400">• {Math.round(distanceToTarget)}u</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => openPanel('navigation')}
                    className="flex items-center gap-1 text-slate-400 font-mono"
                  >
                    <Target className="w-3 h-3" />
                    <span>NO TARGET</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top Right - Clean View Toggle & Wanted Level */}
        <div className="absolute top-4 right-4 pointer-events-auto flex flex-col gap-2 items-end">
          <CleanViewToggle />
          {currentHeat > 0 && <WantedLevelIndicator />}
        </div>

        {/* Left Side - Quick Access Buttons */}
        {!isCleanViewMode && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => openPanel('navigation')}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
                  activePanel === 'navigation'
                    ? 'bg-cyan-500 border-cyan-400 text-slate-900'
                    : 'bg-slate-800/90 border-slate-600 text-slate-400 active:bg-slate-700'
                }`}
              >
                <Navigation className="w-5 h-5" />
              </button>
              <button
                onClick={() => openPanel('status')}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
                  activePanel === 'status'
                    ? 'bg-cyan-500 border-cyan-400 text-slate-900'
                    : 'bg-slate-800/90 border-slate-600 text-slate-400 active:bg-slate-700'
                }`}
              >
                <Zap className="w-5 h-5" />
              </button>
              <button
                onClick={() => openPanel('missions')}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
                  activePanel === 'missions'
                    ? 'bg-cyan-500 border-cyan-400 text-slate-900'
                    : 'bg-slate-800/90 border-slate-600 text-slate-400 active:bg-slate-700'
                }`}
              >
                📋
              </button>
            </div>
          </div>
        )}

        {/* Right Side - Settings */}
        {!isCleanViewMode && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
            <button
              onClick={() => openPanel('settings')}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
                activePanel === 'settings'
                  ? 'bg-cyan-500 border-cyan-400 text-slate-900'
                  : 'bg-slate-800/90 border-slate-600 text-slate-400 active:bg-slate-700'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Bottom Status Bar - Compact ship stats */}
        {!isCleanViewMode && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-auto">
            <button 
              onClick={() => openPanel('status')}
              className="bg-slate-900/90 border border-slate-600/50 rounded-lg px-3 py-2 backdrop-blur-sm active:bg-slate-800"
            >
              <div className="flex items-center gap-4 text-xs">
                {/* Fuel */}
                <div className="flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-green-400" />
                  <div className="w-8 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${getBarColor(fuel, [15, 30])}`} style={{ width: `${fuel}%` }} />
                  </div>
                </div>
                {/* Shields */}
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <div className="w-8 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${getBarColor(shield, [25, 50])}`} style={{ width: `${shield}%` }} />
                  </div>
                </div>
                {/* Credits */}
                <div className="text-cyan-400 font-mono">
                  {credits.toLocaleString()}💰
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Bottom Center - Action Bar */}
        {!isCleanViewMode && (
          <div 
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto"
            data-ui
          >
            <ActionBar />
          </div>
        )}

        {/* Instructions */}
        {!isCleanViewMode && showInstructions ? (
          <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.radius} px-3 py-2 ${config.text.label} flex items-center gap-2`}>
              <span>Touch & hold anywhere to thrust</span>
              <button
                onClick={() => setShowInstructions(false)}
                className="pointer-events-auto w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors active:scale-95"
                title="Hide instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !isCleanViewMode && (
          <button
            onClick={() => setShowInstructions(true)}
            className="absolute bottom-36 left-1/2 transform -translate-x-1/2 pointer-events-auto w-8 h-8 flex items-center justify-center bg-slate-800/80 border border-slate-600 rounded-full hover:bg-slate-700/80 transition-colors active:scale-95"
            title="Show instructions"
          >
            <Info className="w-4 h-4 text-cyan-400" />
          </button>
        )}
      </div>

      {/* Panels */}
      <AnimatePresence>
        {activePanel === 'navigation' && (
          <NavigationPanel onClose={closePanel} />
        )}
        {activePanel === 'status' && (
          <ShipStatusPanel onClose={closePanel} />
        )}
        {activePanel === 'missions' && (
          <MissionsPanel onClose={closePanel} />
        )}
        {activePanel === 'settings' && (
          <SettingsPanel onClose={closePanel} />
        )}
      </AnimatePresence>
    </>
  );
}
