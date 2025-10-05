import { useState } from 'react';
import { ChevronUp, ChevronDown, Flashlight, Rocket, MapPin } from 'lucide-react';
import { useLandedState } from '@/lib/stores/surface/useLandedState';
import { useHUDContext } from '@/lib/stores/ui/useHUDContext';
import { useFlashlight } from '@/lib/stores/surface/useFlashlight';
import { useMining } from '@/lib/stores/economy/useMining';
import { motion, AnimatePresence } from 'framer-motion';

export function BottomControlSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('bottomSidebar_collapsed');
    return saved === 'true';
  });

  const { isLanded, landedPlanet, setIsTakingOff, isTakingOff } = useLandedState();
  const { isDocked, dockedStationName } = useHUDContext();
  const { isActive: isMining, stopMining } = useMining();
  const { isOn: flashlightOn, batteryLevel, toggle: toggleFlashlight, getBatteryStatus } = useFlashlight();

  // Save collapse state
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('bottomSidebar_collapsed', newState.toString());
  };

  const handleTakeoff = () => {
    if (isMining) {
      stopMining();
      console.log('Mining operations stopped for takeoff');
    }
    setIsTakingOff(true);
    console.log(`Initiating takeoff sequence from ${landedPlanet}`);
  };

  const getBatteryColor = () => {
    const status = getBatteryStatus();
    switch (status) {
      case 'full':
      case 'good':
        return 'text-green-400';
      case 'low':
        return 'text-yellow-400';
      case 'critical':
        return 'text-orange-400';
      case 'dead':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Only show if landed or docked
  if (!isLanded && !isDocked) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-30"
    >
      <div
        className={`bg-black/70 backdrop-blur-md border-t border-orange-600/30 transition-all duration-300 ${
          isCollapsed ? 'h-10' : 'h-24'
        }`}
      >
        {/* Toggle button */}
        <button
          onClick={handleToggleCollapse}
          className="absolute right-2 top-1 p-1 text-orange-400 hover:text-orange-300 transition-colors z-10"
          aria-label={isCollapsed ? 'Expand control sidebar' : 'Collapse control sidebar'}
        >
          {isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        <AnimatePresence mode="wait">
          {isCollapsed ? (
            // Collapsed view - just show location
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center h-full px-4"
            >
              <div className="flex items-center space-x-3 text-orange-400">
                <MapPin size={18} />
                <span className="text-sm font-medium">
                  {isLanded && `On Surface: ${landedPlanet}`}
                  {isDocked && `Docked at ${dockedStationName || 'Station'}`}
                </span>
              </div>
            </motion.div>
          ) : (
            // Expanded view - show all controls
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full px-4 py-2"
            >
              <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
                {/* Location Status */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-gray-900/50 px-4 py-2 rounded-lg border border-orange-500/30">
                    <MapPin size={20} className="text-orange-400" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Location</p>
                      <p className="text-sm text-orange-400 font-semibold">
                        {isLanded && landedPlanet}
                        {isDocked && dockedStationName}
                      </p>
                    </div>
                  </div>

                  {isMining && (
                    <div className="px-3 py-1 bg-yellow-900/30 border border-yellow-400/50 rounded text-yellow-400 text-xs font-mono">
                      ⚠️ Mining in progress
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="flex items-center space-x-3">
                  {/* Flashlight Control - only show when landed */}
                  {isLanded && (
                    <button
                      onClick={toggleFlashlight}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                        flashlightOn
                          ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-400'
                          : 'bg-gray-900/50 border-gray-600/30 text-gray-400 hover:border-gray-500/50'
                      }`}
                      title={`Flashlight (F) - Battery: ${Math.round(batteryLevel)}%`}
                    >
                      <Flashlight size={20} />
                      <div className="text-left">
                        <p className="text-xs uppercase">Flashlight</p>
                        <p className={`text-xs font-mono ${getBatteryColor()}`}>
                          {Math.round(batteryLevel)}%
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Takeoff Button - only show when landed */}
                  {isLanded && (
                    <button
                      onClick={handleTakeoff}
                      disabled={isTakingOff}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                        isTakingOff
                          ? 'bg-gray-900/50 border-gray-600/30 text-gray-600 cursor-not-allowed'
                          : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-400'
                      }`}
                      title={isTakingOff ? 'Taking off...' : 'Take Off'}
                    >
                      <Rocket size={20} />
                      <span className="text-sm font-semibold">
                        {isTakingOff ? 'Taking Off...' : 'Take Off'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
