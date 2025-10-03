import React, { useState } from 'react';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useCredits } from '../../lib/stores/economy/useCredits';
import { useInventory } from '../../lib/stores/economy/useInventory';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useMobileLayout } from '../../stores/useMobileLayout';

type TabType = 'overview' | 'trade' | 'crew' | 'missions' | 'ship';

/**
 * StationDashboard - Main mobile UI for station management
 * Provides touch-friendly interface for all station activities
 */
export const StationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Store hooks for shared state
  const player = usePlayer();
  const ship = useShipStatus();
  const equipment = useEquipment();
  const { credits } = useCredits();
  const inventory = useInventory();
  const { landedPlanet } = useLandedState();
  const { config } = useMobileLayout();
  
  // Get fuel data from equipment store
  const fuelTank = equipment.getEquipment('fuel-tank');
  const fuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  
  // Get current location name
  const locationName = landedPlanet || 'Unknown Station';

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header Bar */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 border-b-2 border-orange-600/30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600/20 border border-orange-600 
                            flex items-center justify-center">
                <span className="text-orange-400 font-bold text-sm">
                  {player.level}
                </span>
              </div>
              <div>
                <h1 className="text-white font-semibold">Commander</h1>
                <p className="text-xs text-orange-400">{player.rankTitle}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Credits</p>
              <p className="text-lg font-mono text-cyan-400">{credits.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded px-2 py-1">
            <p className="text-xs text-gray-400">
              📍 {locationName}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Resource Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Fuel Card */}
              <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Fuel</span>
                  <span className="text-xl">⛽</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-white">
                      {Math.round(fuel)}
                    </span>
                    <span className="text-xs text-gray-500">
                      / {maxFuel}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                      style={{ width: `${(fuel / maxFuel) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Cargo Card */}
              <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Cargo</span>
                  <span className="text-xl">📦</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-white">
                      {inventory.getStorageUsed()}
                    </span>
                    <span className="text-xs text-gray-500">
                      / {inventory.storageCapacity}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      style={{ width: `${(inventory.getStorageUsed() / inventory.storageCapacity) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Hull Integrity Card */}
              <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Hull</span>
                  <span className="text-xl">🛡️</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-white">
                      {Math.round(ship.hull)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        ship.hull > 70 ? 'bg-green-500' :
                        ship.hull > 30 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${ship.hull}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Heat Level Card */}
              <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Heat</span>
                  <span className="text-xl">🔥</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-white">
                      {player.heat}
                    </span>
                    <span className="text-xs text-gray-500">
                      / 100
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        player.heat < 30 ? 'bg-blue-500' :
                        player.heat < 70 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${player.heat}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('trade')}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]"
                >
                  <span className="text-2xl">💰</span>
                  <span>Trade</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('ship')}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]"
                >
                  <span className="text-2xl">🔧</span>
                  <span>Repair</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('crew')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]"
                >
                  <span className="text-2xl">👥</span>
                  <span>Crew</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('missions')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]"
                >
                  <span className="text-2xl">📋</span>
                  <span>Missions</span>
                </button>
              </div>
            </div>

            {/* Player Stats */}
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Commander Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Experience</span>
                  <span className="text-cyan-400">{player.experience} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Notoriety</span>
                  <span className="text-orange-400">{player.notoriety}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Planets Visited</span>
                  <span className="text-green-400">{player.planetsVisited.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Jumps</span>
                  <span className="text-purple-400">{player.totalJumps}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trade' && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Trading Post</h2>
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <p className="text-gray-400">Trading interface coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'crew' && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Crew Management</h2>
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <p className="text-gray-400">Crew management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Mission Board</h2>
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <p className="text-gray-400">Mission board coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'ship' && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Ship Maintenance</h2>
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Hull Integrity</span>
                  <span className="text-white">{Math.round(ship.hull)}%</span>
                </div>
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold
                                 active:bg-blue-700 transition-colors min-h-[44px]">
                  Repair Hull (500 credits)
                </button>
                <button className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold
                                 active:bg-orange-700 transition-colors min-h-[44px]">
                  Refuel (100 credits)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-900 border-t-2 border-slate-700">
        <div className="grid grid-cols-5 h-16">
          {[
            { id: 'overview', icon: '🏠', label: 'Overview' },
            { id: 'trade', icon: '💰', label: 'Trade' },
            { id: 'crew', icon: '👥', label: 'Crew' },
            { id: 'missions', icon: '📋', label: 'Missions' },
            { id: 'ship', icon: '🚀', label: 'Ship' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors
                        ${activeTab === tab.id 
                          ? 'text-orange-400 bg-slate-800' 
                          : 'text-gray-400 active:bg-slate-800'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};