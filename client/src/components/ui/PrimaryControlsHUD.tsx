import React, { useState, useEffect } from 'react';
import { useHUDContext } from '../../lib/stores/ui/useHUDContext';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useAutopilot } from '../../lib/stores/navigation/useAutopilot';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useMining } from '../../lib/stores/economy/useMining';
import { useShooting } from '../../lib/stores/combat/useShooting';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { useWeaponSystems } from '../../lib/stores/combat/useWeaponSystems';
import { Target, Crosshair } from 'lucide-react';

export function PrimaryControlsHUD() {
  const { 
    currentContext, 
    isTransitioning, 
    nearestPlanet, 
    distanceToNearest,
    dockedStationName,
    registerShot 
  } = useHUDContext();
  const { isThrusting, isWarpMode, shield, hull } = useShipStatus();
  const { isActive: isAutopilotActive, target: autopilotTarget } = useAutopilot();
  const { landedPlanet } = useLandedState();
  const { 
    isActive: isMining, 
    clicksCompleted, 
    clicksRequired, 
    targetResource,
    miningEfficiency 
  } = useMining();
  const { projectiles } = useShooting();
  const { getEquipment } = useEquipment();
  const { cameraPosition } = useSolarSystem();
  const { wantedLevel, patrolEncounter } = useHeatSystem();
  const { 
    isLocking, 
    currentTarget, 
    torpedoCooldown, 
    missileCooldown,
    weaponStats 
  } = useWeaponSystems();
  
  // Calculate distance to autopilot target if active
  const distanceToTarget = autopilotTarget && cameraPosition
    ? cameraPosition.distanceTo(autopilotTarget)
    : null;
  
  // Track recent damage for visual feedback
  const [recentDamage, setRecentDamage] = useState(false);
  const [damageAmount, setDamageAmount] = useState(0);
  
  // Get current speed/thrust info
  const fuelTank = getEquipment('fuel-tank');
  const fuelPercentage = fuelTank ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100 : 0;
  
  // Calculate coordinates (simplified grid system)
  const coordinates = cameraPosition 
    ? `${Math.round(cameraPosition.x)}, ${Math.round(cameraPosition.y)}, ${Math.round(cameraPosition.z)}`
    : '0, 0, 0';
    
  // Format distance
  const formatDistance = (dist: number) => {
    if (dist < 1000) return `${Math.round(dist)}m`;
    return `${(dist / 1000).toFixed(1)}km`;
  };
  
  // Mining yield rate calculation
  const yieldRate = isMining && miningEfficiency 
    ? Math.round(100 * (miningEfficiency || 1))
    : 100;
  
  // Handle shield/hull changes for damage indication
  useEffect(() => {
    let prevShield = shield;
    let prevHull = hull;
    
    const checkDamage = setInterval(() => {
      const shipStatus = useShipStatus.getState();
      const shieldDiff = prevShield - shipStatus.shield;
      const hullDiff = prevHull - shipStatus.hull;
      
      if (shieldDiff > 0 || hullDiff > 0) {
        setRecentDamage(true);
        setDamageAmount(Math.round(shieldDiff + hullDiff));
        useHUDContext.getState().registerDamage();
        
        setTimeout(() => setRecentDamage(false), 2000);
      }
      
      prevShield = shipStatus.shield;
      prevHull = shipStatus.hull;
    }, 100);
    
    return () => clearInterval(checkDamage);
  }, [shield, hull]);
  
  // Handle shooting detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        registerShot();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [registerShot]);
  
  // Render different controls based on context
  const renderContextControls = () => {
    switch (currentContext) {
      case 'space-flight':
      case 'autopilot':
        return (
          <div className="flex flex-col items-center gap-2 animate-fadeIn">
            {/* Coordinates and Location */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">📍</span>
                <span className="text-gray-400 font-mono">{coordinates}</span>
              </div>
              {nearestPlanet && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">→</span>
                  <span className="text-cyan-400">{nearestPlanet}</span>
                  <span className="text-gray-500">{formatDistance(distanceToNearest)}</span>
                </div>
              )}
            </div>
            
            {/* Flight Mode Indicator */}
            <div className="flex items-center gap-3">
              {isWarpMode && (
                <div className="bg-purple-900/50 border border-purple-400 rounded px-2 py-1 animate-pulse">
                  <span className="text-xs text-purple-300 font-semibold">
                    ⚡ WARP MODE
                  </span>
                </div>
              )}
              
              {isAutopilotActive && (
                <div className="bg-cyan-900/50 border border-cyan-400 rounded px-2 py-1">
                  <span className="text-xs text-cyan-300 font-semibold">
                    🎯 AUTOPILOT
                  </span>
                  {distanceToTarget && (
                    <span className="text-xs text-cyan-300 ml-2">
                      {formatDistance(distanceToTarget)}
                    </span>
                  )}
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
              {wantedLevel > 0 && <span className="text-orange-400">• ⚠ Heat {wantedLevel}</span>}
            </div>
          </div>
        );
        
      case 'planet-surface':
        return (
          <div className="flex flex-col items-center gap-2 animate-fadeIn">
            {/* Surface Status */}
            <div className="bg-green-900/50 border border-green-400 rounded px-3 py-1">
              <span className="text-sm text-green-300 font-semibold">
                🌍 Landed on {landedPlanet}
              </span>
            </div>
            
            {/* Coordinates on Surface */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Surface Position:</span>
              <span className="text-gray-400 font-mono">{coordinates}</span>
            </div>
            
            {/* Surface Controls */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>WASD - Move</span>
              <span>•</span>
              <span>T - Takeoff</span>
              <span>•</span>
              <span>F - Flashlight</span>
              <span>•</span>
              <span>Click - Mine</span>
            </div>
          </div>
        );
        
      case 'mining':
        return (
          <div className="flex flex-col items-center gap-2 animate-fadeIn">
            {/* Mining Progress */}
            <div className="bg-yellow-900/50 border border-yellow-400 rounded px-3 py-2 min-w-[250px]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-300 font-semibold">
                    ⛏️ Mining {targetResource?.type || 'Resource'}
                  </span>
                  <span className="text-xs text-yellow-400">
                    ({yieldRate}% yield)
                  </span>
                </div>
                <span className="text-xs text-yellow-300 font-mono">
                  {clicksCompleted}/{clicksRequired}
                </span>
              </div>
              
              {/* Mining Progress Bar */}
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-200 animate-pulse"
                  style={{ width: `${(clicksCompleted / clicksRequired) * 100}%` }}
                />
              </div>
              
              {/* Resource Details */}
              {targetResource && (
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-yellow-400">
                    Value: {targetResource.value} CR
                  </span>
                  <span className="text-gray-400">
                    Complexity: {targetResource.complexity} clicks
                  </span>
                </div>
              )}
            </div>
            
            {/* Mining Instructions */}
            <div className="text-xs text-gray-500">
              Click on resource to extract • ESC to cancel
            </div>
          </div>
        );
        
      case 'combat':
        return (
          <div className="flex flex-col items-center gap-2 animate-fadeIn relative">
            {/* Combat Indicator */}
            <div className="bg-red-900/50 border border-red-400 rounded px-3 py-1 animate-pulse">
              <span className="text-sm text-red-300 font-semibold">
                ⚔️ COMBAT ENGAGED
              </span>
            </div>
            
            {/* Weapon Lock Indicator - Centered and Prominent */}
            {isLocking && currentTarget && (
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="relative w-24 h-24">
                  {/* Lock Progress Circle */}
                  <svg className="w-24 h-24 -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="44"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-600"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="44"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      strokeDashoffset={`${2 * Math.PI * 44 * (1 - currentTarget.lockProgress)}`}
                      className={currentTarget.lockProgress >= 1 ? 'text-green-400' : 'text-yellow-400'}
                      style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                    />
                  </svg>
                  
                  {/* Crosshair Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Crosshair 
                      className={currentTarget.lockProgress >= 1 ? 'text-green-400' : 'text-yellow-400'} 
                      size={32} 
                    />
                  </div>
                </div>
                
                {/* Lock Status Text */}
                <div className="text-xs font-mono">
                  {currentTarget.lockProgress >= 1 ? (
                    <span className="text-green-400 font-bold">🎯 LOCK ACQUIRED - FIRE!</span>
                  ) : (
                    <span className="text-yellow-400">
                      Locking... {Math.round(currentTarget.lockProgress * 100)}%
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Combat Stats */}
            <div className="flex items-center gap-4 text-xs">
              {/* Shield/Hull Status */}
              <div className="flex items-center gap-1">
                <span className="text-gray-400">🛡️</span>
                <span className={`font-mono ${shield < 30 ? 'text-red-400' : 'text-cyan-400'}`}>
                  {Math.round(shield)}%
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-gray-400">🚀</span>
                <span className={`font-mono ${hull < 30 ? 'text-red-400' : 'text-green-400'}`}>
                  {Math.round(hull)}%
                </span>
              </div>
              
              {/* Active Weapons */}
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Shots:</span>
                <span className="text-red-400 font-mono">{projectiles.length}</span>
              </div>
            </div>
            
            {/* Weapon Reload Timers */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Torpedo:</span>
                <span className={torpedoCooldown > 0 ? 'text-red-400' : 'text-green-400'}>
                  {torpedoCooldown > 0 ? `${Math.ceil(torpedoCooldown)}s` : 'Ready'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Missile:</span>
                <span className={missileCooldown > 0 ? 'text-red-400' : 'text-green-400'}>
                  {missileCooldown > 0 ? `${Math.ceil(missileCooldown)}s` : 'Ready'}
                </span>
              </div>
            </div>
            
            {/* Damage Indicator */}
            {recentDamage && (
              <div className="absolute -top-8 animate-damageFloat">
                <span className="text-red-500 font-bold text-lg">
                  -{damageAmount}
                </span>
              </div>
            )}
            
            {/* Combat Controls */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="text-red-400">Space - Laser</span>
              <span>•</span>
              <span className="text-cyan-400">T - Torpedo</span>
              <span>•</span>
              <span className="text-yellow-400">M - Missile</span>
              <span>•</span>
              <span>W - Evade</span>
              <span>•</span>
              <span>Mouse - Aim</span>
            </div>
          </div>
        );
        
      case 'docked':
        return (
          <div className="flex flex-col items-center gap-2 animate-fadeIn">
            {/* Station Services */}
            <div className="grid grid-cols-4 gap-2">
              <button className="station-service-btn flex flex-col items-center justify-center p-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 hover:border-blue-400 rounded transition-all group">
                <span className="text-lg group-hover:scale-110 transition-transform">🔧</span>
                <span className="text-xs">Repair</span>
                <span className="text-xs text-gray-500">100 CR</span>
              </button>
              
              <button className="station-service-btn flex flex-col items-center justify-center p-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 hover:border-blue-400 rounded transition-all group">
                <span className="text-lg group-hover:scale-110 transition-transform">⚡</span>
                <span className="text-xs">Refuel</span>
                <span className="text-xs text-gray-500">50 CR</span>
              </button>
              
              <button className="station-service-btn flex flex-col items-center justify-center p-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 hover:border-blue-400 rounded transition-all group">
                <span className="text-lg group-hover:scale-110 transition-transform">💱</span>
                <span className="text-xs">Trade</span>
                <span className="text-xs text-gray-500">Market</span>
              </button>
              
              <button className="station-service-btn flex flex-col items-center justify-center p-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600 hover:border-blue-400 rounded transition-all group">
                <span className="text-lg group-hover:scale-110 transition-transform">👥</span>
                <span className="text-xs">Crew</span>
                <span className="text-xs text-gray-500">Hire</span>
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              U - Undock • Tab - Station Menu
            </div>
          </div>
        );
        
      case 'minigame':
        return (
          <div className="flex flex-col items-center gap-2 animate-fadeIn">
            {/* Minigame Active */}
            <div className="bg-purple-900/50 border border-purple-400 rounded px-3 py-1 animate-pulse">
              <span className="text-sm text-purple-300 font-semibold">
                🎮 Minigame Active
              </span>
            </div>
            
            {/* Context-specific minigame controls would go here */}
            <div className="text-xs text-gray-500">
              Follow on-screen instructions • ESC to exit
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <>
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-300 ${
        isTransitioning ? 'opacity-50' : 'opacity-100'
      }`}>
        <div className="bg-black/70 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-3 pointer-events-auto">
          {renderContextControls()}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes damageFloat {
          0% { 
            opacity: 1; 
            transform: translateY(0);
          }
          100% { 
            opacity: 0; 
            transform: translateY(-30px);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-damageFloat {
          animation: damageFloat 1s ease-out;
        }
      `}</style>
    </>
  );
}