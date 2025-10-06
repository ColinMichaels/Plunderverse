import React, { useEffect, useState } from 'react';
import { StationDashboard } from './StationDashboard';
import { MobileMinigame } from './MobileMinigame';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useGame } from '../../lib/stores/ui/useGame';
import { usePlatform } from '../../lib/stores/ui/usePlatform';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useCredits } from '../../lib/stores/economy/useCredits';
import { useInventory } from '../../lib/stores/economy/useInventory';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';

type MobileViewState = 'status' | 'station' | 'minigame';

/**
 * MobileGame - Main entry point for mobile experience
 * Provides a comprehensive interface optimized for touch devices
 * Syncs with desktop game state through Zustand stores
 */
export const MobileGame: React.FC = () => {
  const { phase } = useGame();
  const { isLanded, landedPlanet } = useLandedState();
  const { viewport, orientation } = usePlatform();
  const player = usePlayer();
  const shipStatus = useShipStatus();
  const equipment = useEquipment();
  const { credits } = useCredits();
  const inventory = useInventory();
  const missions = usePlunderverseMissions();
  const { selectedPlanet, playerPosition } = useSolarSystem();
  const heatSystem = useHeatSystem();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timer | null>(null);
  const [viewState, setViewState] = useState<MobileViewState>('status');

  // Mobile platform initialization and state refresh
  useEffect(() => {
    // Set up periodic state refresh to ensure sync with desktop
    const interval = setInterval(() => {
      // This triggers re-render to update displayed values
      // Stores are already synced via Zustand
    }, 1000); // Refresh every second
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Mobile splash screen
  if (phase === 'splash') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-4xl font-bold text-orange-500 mb-4">
            Solar Plunder
          </h1>
          <p className="text-gray-400 mb-8">Mobile Commander Interface</p>
          <button
            onClick={() => useGame.getState().start()}
            className="px-8 py-4 bg-orange-600 text-white rounded-lg font-semibold
                     active:bg-orange-700 transition-colors min-h-[44px]"
          >
            Launch Game
          </button>
        </div>
      </div>
    );
  }

  // Get fuel data
  const fuelTank = equipment.getEquipment('fuel-tank');
  const fuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  const fuelPercentage = (fuel / maxFuel) * 100;

  // Get current mission
  const activeMission = missions.missions.find(m => !m.completed && m.status === 'active');

  // Show comprehensive status screen when not at a station
  if (!isLanded) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 border-b border-orange-600/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600/20 border border-orange-600 
                            flex items-center justify-center">
                <span className="text-orange-400 font-bold text-sm">{player.level}</span>
              </div>
              <div>
                <h2 className="text-white font-semibold">Commander</h2>
                <p className="text-xs text-orange-400">{player.rankTitle}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Credits</p>
              <p className="text-lg font-mono text-cyan-400">{credits.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Main content - Ship Status Dashboard */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Location & Navigation */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-cyan-400 mb-3">NAVIGATION STATUS</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Current Location:</span>
                <span className="text-cyan-300 text-sm font-medium">
                  {selectedPlanet || 'Deep Space'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Coordinates:</span>
                <span className="text-gray-300 text-sm font-mono">
                  [{Math.round(playerPosition?.x || 0)}, {Math.round(playerPosition?.y || 0)}, {Math.round(playerPosition?.z || 0)}]
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Ship Status:</span>
                <span className={`text-sm font-medium ${
                  shipStatus.hull > 70 ? 'text-green-400' : 
                  shipStatus.hull > 30 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {shipStatus.hull > 70 ? 'Operational' : shipStatus.hull > 30 ? 'Damaged' : 'Critical'}
                </span>
              </div>
            </div>
          </div>

          {/* Ship Systems */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-green-400 mb-3">SHIP SYSTEMS</h3>
            <div className="space-y-3">
              {/* Hull */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Hull Integrity</span>
                  <span className="text-gray-300">{Math.round(shipStatus.hull)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      shipStatus.hull > 70 ? 'bg-green-500' :
                      shipStatus.hull > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${shipStatus.hull}%` }}
                  />
                </div>
              </div>

              {/* Shields */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Shield Strength</span>
                  <span className="text-gray-300">{Math.round(shipStatus.shield)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${shipStatus.shield}%` }}
                  />
                </div>
              </div>

              {/* Fuel */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Fuel Reserves</span>
                  <span className="text-gray-300">{Math.round(fuel)}/{maxFuel}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      fuelPercentage > 50 ? 'bg-yellow-500' :
                      fuelPercentage > 20 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${fuelPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Player Stats */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-purple-400 mb-3">COMMANDER STATS</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded p-2">
                <p className="text-xs text-gray-400 mb-1">Experience</p>
                <p className="text-lg font-bold text-purple-300">{player.experience.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/50 rounded p-2">
                <p className="text-xs text-gray-400 mb-1">Notoriety</p>
                <p className="text-lg font-bold text-orange-300">{player.notoriety}</p>
              </div>
              <div className="bg-slate-700/50 rounded p-2">
                <p className="text-xs text-gray-400 mb-1">Heat Level</p>
                <p className={`text-lg font-bold ${
                  player.heat < 30 ? 'text-blue-300' :
                  player.heat < 70 ? 'text-orange-300' : 'text-red-300'
                }`}>{player.heat}%</p>
              </div>
              <div className="bg-slate-700/50 rounded p-2">
                <p className="text-xs text-gray-400 mb-1">Wanted Level</p>
                <p className={`text-lg font-bold text-[${heatSystem.wantedLevelInfo.color}]`}>
                  {heatSystem.wantedLevelInfo.name}
                </p>
              </div>
            </div>
          </div>

          {/* Faction Reputation */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-amber-400 mb-3">FACTION STANDINGS</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Corporations</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    player.reputation.corporations >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>{player.reputation.corporations}</span>
                  <span className="text-xs text-gray-500">
                    ({player.getReputationStatus('corporations')})
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Independents</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    player.reputation.independents >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>{player.reputation.independents}</span>
                  <span className="text-xs text-gray-500">
                    ({player.getReputationStatus('independents')})
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Outlaws</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    player.reputation.outlaws >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>{player.reputation.outlaws}</span>
                  <span className="text-xs text-gray-500">
                    ({player.getReputationStatus('outlaws')})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Mission */}
          {activeMission && (
            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-600/50 rounded-lg p-4">
              <h3 className="text-sm font-bold text-orange-400 mb-3">ACTIVE MISSION</h3>
              <h4 className="text-white font-medium mb-1">{activeMission.title}</h4>
              <p className="text-gray-400 text-sm mb-3">{activeMission.description}</p>
              {activeMission.objectives && activeMission.objectives.length > 0 && (
                <div className="space-y-1">
                  {activeMission.objectives.map((obj, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        obj.completed ? 'bg-green-500 border-green-500' : 'border-gray-500'
                      }`} />
                      <span className={`text-sm ${obj.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                        {obj.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {activeMission.reward && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs text-gray-400">Reward: 
                    <span className="text-cyan-400 font-bold ml-2">{activeMission.reward.credits}c</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cargo Summary */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-400 mb-3">CARGO HOLD</h3>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400 text-sm">Capacity</span>
              <span className="text-gray-300 text-sm">
                {inventory.getStorageUsed()}/{inventory.storageCapacity} tons
              </span>
            </div>
            {inventory.items.length > 0 ? (
              <div className="space-y-1">
                {inventory.items.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-gray-500">{item.type}</span>
                    <span className="text-gray-400">×{item.quantity}</span>
                  </div>
                ))}
                {inventory.items.length > 5 && (
                  <p className="text-xs text-gray-500 italic">
                    +{inventory.items.length - 5} more items...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">Cargo hold empty</p>
            )}
          </div>
        </div>

        {/* Bottom info */}
        <div className="bg-slate-900 border-t border-slate-700 px-4 py-3">
          <p className="text-xs text-center text-cyan-400">
            Land at any station to access trading and upgrade features
          </p>
        </div>
      </div>
    );
  }

  // Update viewState based on landing status
  useEffect(() => {
    if (isLanded && viewState === 'status') {
      setViewState('station');
    } else if (!isLanded && viewState === 'station') {
      setViewState('status');
    }
  }, [isLanded, viewState]);

  // Handle mini-game navigation
  if (viewState === 'minigame') {
    return (
      <MobileMinigame 
        onBack={() => setViewState(isLanded ? 'station' : 'status')}
      />
    );
  }

  // Main mobile game interface when landed
  return (
    <StationDashboard 
      onOpenMinigame={() => setViewState('minigame')}
    />
  );
};