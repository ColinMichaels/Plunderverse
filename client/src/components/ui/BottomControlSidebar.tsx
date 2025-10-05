import { useState } from 'react';
import { ChevronUp, ChevronDown, Flashlight, Rocket, MapPin, Navigation, Zap, Target, Compass } from 'lucide-react';
import { useLandedState } from '@/lib/stores/surface/useLandedState';
import { useHUDContext } from '@/lib/stores/ui/useHUDContext';
import { useFlashlight } from '@/lib/stores/surface/useFlashlight';
import { useMining } from '@/lib/stores/economy/useMining';
import { useAutopilot } from '@/lib/stores/navigation/useAutopilot';
import { useShipStatus } from '@/lib/stores/ship/useShipStatus';
import { useSolarSystem } from '@/lib/stores/space/useSolarSystem';
import { motion, AnimatePresence } from 'framer-motion';

export function BottomControlSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('bottomSidebar_collapsed');
    return saved === 'true';
  });

  const { isLanded, landedPlanet, setIsTakingOff, isTakingOff } = useLandedState();
  const { isDocked, dockedStationName, currentContext } = useHUDContext();
  const { isActive: isMining, stopMining } = useMining();
  const { isOn: flashlightOn, batteryLevel, toggle: toggleFlashlight, getBatteryStatus } = useFlashlight();
  const { isActive: isAutopilotActive, deactivate: deactivateAutopilot } = useAutopilot();
  const { isWarpMode, isThrusting } = useShipStatus();
  const { selectedPlanet } = useSolarSystem();

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

  // Determine location text based on context
  const getLocationText = () => {
    if (isLanded) return `Surface: ${landedPlanet}`;
    if (isDocked) return `Docked: ${dockedStationName || 'Station'}`;
    if (selectedPlanet) return `Near: ${selectedPlanet}`;
    return 'Deep Space';
  };

  // Determine status indicators for space
  const getSpaceStatus = () => {
    const statuses = [];
    if (isAutopilotActive) statuses.push({ text: 'Autopilot', color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-400/50' });
    if (isWarpMode) statuses.push({ text: 'Warp Drive', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-400/50' });
    if (isThrusting && !isWarpMode) statuses.push({ text: 'Thrusting', color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-400/50' });
    if (isMining) statuses.push({ text: 'Mining', color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-400/50' });
    return statuses;
  };

  const spaceStatuses = getSpaceStatus();

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
            // Collapsed view - just show location and key statuses
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center h-full px-4"
            >
              <div className="flex items-center space-x-3 text-orange-400">
                <MapPin size={18} />
                <span className="text-sm font-medium">{getLocationText()}</span>
                {spaceStatuses.length > 0 && (
                  <div className="flex items-center space-x-2 ml-4">
                    {spaceStatuses.map((status, idx) => (
                      <div key={idx} className={`px-2 py-0.5 ${status.bg} border ${status.border} rounded text-xs ${status.color}`}>
                        {status.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // Expanded view - show all controls based on context
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full px-4 py-2"
            >
              <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
                {/* Location Status & Active Systems */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-gray-900/50 px-4 py-2 rounded-lg border border-orange-500/30">
                    <MapPin size={20} className="text-orange-400" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Location</p>
                      <p className="text-sm text-orange-400 font-semibold">
                        {getLocationText()}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  {spaceStatuses.map((status, idx) => (
                    <div key={idx} className={`px-3 py-1 ${status.bg} border ${status.border} rounded ${status.color} text-xs font-mono`}>
                      {status.text}
                    </div>
                  ))}
                </div>

                {/* Context-Specific Control Buttons */}
                <div className="flex items-center space-x-3">
                  {/* SURFACE CONTROLS - Show when landed */}
                  {isLanded && (
                    <>
                      {/* Flashlight Control */}
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

                      {/* Takeoff Button */}
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
                    </>
                  )}

                  {/* SPACE CONTROLS - Show when in space */}
                  {!isLanded && !isDocked && (
                    <>
                      {/* Autopilot Control */}
                      {isAutopilotActive && (
                        <button
                          onClick={deactivateAutopilot}
                          className="flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all bg-cyan-500/20 border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-400"
                          title="Cancel Autopilot"
                        >
                          <Navigation size={20} />
                          <span className="text-sm font-semibold">Cancel Autopilot</span>
                        </button>
                      )}

                      {/* Target Indicator */}
                      {selectedPlanet && (
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg border bg-purple-900/20 border-purple-400/30 text-purple-400">
                          <Target size={20} />
                          <div className="text-left">
                            <p className="text-xs uppercase">Target</p>
                            <p className="text-xs font-semibold">{selectedPlanet}</p>
                          </div>
                        </div>
                      )}
                    </>
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
