import React from 'react';
import { useHUDContext } from '../../lib/stores/ui/useHUDContext';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useAutopilot } from '../../lib/stores/navigation/useAutopilot';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useMining } from '../../lib/stores/economy/useMining';
import { useShooting } from '../../lib/stores/combat/useShooting';
import { useEquipment } from '../../lib/stores/ship/useEquipment';

export function PrimaryControlsHUD() {
  const { currentContext } = useHUDContext();
  const { isThrusting, isWarpMode } = useShipStatus();
  const { isActive: isAutopilotActive, target: autopilotTarget } = useAutopilot();
  const { landedPlanet } = useLandedState();
  const { isActive: isMining, clicksCompleted, clicksRequired, targetResource } = useMining();
  const { projectiles } = useShooting();
  const { getEquipment } = useEquipment();
  
  // Get current speed/thrust info
  const fuelTank = getEquipment('fuel-tank');
  const fuelPercentage = fuelTank ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100 : 0;
  
  // Render different controls based on context
  const renderContextControls = () => {
    switch (currentContext) {
      case 'space-flight':
      case 'autopilot':
        return (
          <div className="flex flex-col items-center gap-2">
            {/* Flight Mode Indicator */}
            <div className="flex items-center gap-3">
              {isWarpMode && (
                <div className="bg-purple-900/50 border border-purple-400 rounded px-2 py-1">
                  <span className="text-xs text-purple-300 font-semibold animate-pulse">
                    ⚡ WARP MODE
                  </span>
                </div>
              )}
              
              {isAutopilotActive && (
                <div className="bg-cyan-900/50 border border-cyan-400 rounded px-2 py-1">
                  <span className="text-xs text-cyan-300 font-semibold">
                    🎯 AUTOPILOT ACTIVE
                  </span>
                </div>
              )}
              
              {isThrusting && !isAutopilotActive && (
                <div className="bg-green-900/50 border border-green-400 rounded px-2 py-1">
                  <span className="text-xs text-green-300 font-semibold">
                    🚀 THRUSTING
                  </span>
                </div>
              )}
            </div>
            
            {/* Thrust/Fuel Meter */}
            <div className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-400">FUEL</span>
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    fuelPercentage > 50 ? 'bg-cyan-500' : 
                    fuelPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${fuelPercentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-300 font-mono">
                {Math.round(fuelPercentage)}%
              </span>
            </div>
            
            {/* Control Hints */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>W - Thrust</span>
              <span>•</span>
              <span>L - Land</span>
              <span>•</span>
              <span>Space - Fire</span>
            </div>
          </div>
        );
        
      case 'planet-surface':
        return (
          <div className="flex flex-col items-center gap-2">
            {/* Surface Status */}
            <div className="bg-green-900/50 border border-green-400 rounded px-3 py-1">
              <span className="text-sm text-green-300 font-semibold">
                🌍 Landed on {landedPlanet}
              </span>
            </div>
            
            {/* Surface Controls */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>WASD - Move</span>
              <span>•</span>
              <span>T - Takeoff</span>
              <span>•</span>
              <span>F - Flashlight</span>
            </div>
          </div>
        );
        
      case 'mining':
        return (
          <div className="flex flex-col items-center gap-2">
            {/* Mining Progress */}
            <div className="bg-yellow-900/50 border border-yellow-400 rounded px-3 py-2 min-w-[200px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-yellow-300 font-semibold">
                  ⛏️ Mining {targetResource?.type || 'Resource'}
                </span>
                <span className="text-xs text-yellow-300 font-mono">
                  {clicksCompleted}/{clicksRequired}
                </span>
              </div>
              
              {/* Mining Progress Bar */}
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-200"
                  style={{ width: `${(clicksCompleted / clicksRequired) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Mining Instructions */}
            <div className="text-xs text-gray-500">
              Click on resource to extract • ESC to cancel
            </div>
          </div>
        );
        
      case 'combat':
        return (
          <div className="flex flex-col items-center gap-2">
            {/* Combat Indicator */}
            <div className="bg-red-900/50 border border-red-400 rounded px-3 py-1 animate-pulse">
              <span className="text-sm text-red-300 font-semibold">
                ⚔️ COMBAT ENGAGED
              </span>
            </div>
            
            {/* Active Weapons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Projectiles:</span>
              <span className="text-xs text-red-400 font-mono">{projectiles.length}</span>
            </div>
            
            {/* Combat Controls */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Space - Fire</span>
              <span>•</span>
              <span>W - Evade</span>
              <span>•</span>
              <span>Mouse - Aim</span>
            </div>
          </div>
        );
        
      case 'docked':
        return (
          <div className="flex flex-col items-center gap-2">
            {/* Docked Status */}
            <div className="bg-blue-900/50 border border-blue-400 rounded px-3 py-1">
              <span className="text-sm text-blue-300 font-semibold">
                🏢 Docked at Station
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 rounded text-xs text-gray-300 transition-colors">
                🔧 Repair
              </button>
              <button className="px-2 py-1 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 rounded text-xs text-gray-300 transition-colors">
                ⚡ Refuel
              </button>
              <button className="px-2 py-1 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 rounded text-xs text-gray-300 transition-colors">
                💱 Trade
              </button>
              <button className="px-2 py-1 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 rounded text-xs text-gray-300 transition-colors">
                👥 Crew
              </button>
            </div>
          </div>
        );
        
      case 'minigame':
        return (
          <div className="flex flex-col items-center gap-2">
            {/* Minigame Active */}
            <div className="bg-purple-900/50 border border-purple-400 rounded px-3 py-1">
              <span className="text-sm text-purple-300 font-semibold">
                🎮 Minigame Active
              </span>
            </div>
            
            {/* Context-specific minigame controls would go here */}
            <div className="text-xs text-gray-500">
              Follow on-screen instructions
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-3 pointer-events-auto">
        {renderContextControls()}
      </div>
    </div>
  );
}