import { useState } from "react";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useCredits } from "../lib/stores/useCredits";
import { useShipStatus } from "../lib/stores/useShipStatus";
import { useRewards } from "../lib/stores/useRewards";
import { useMissions } from "../lib/stores/useMissions";
import { useAudio } from "../lib/stores/useAudio";
import { useGame } from "../lib/stores/useGame";
import { planets } from "../lib/planetData";

export function CockpitHUD() {
  const [activePanel, setActivePanel] = useState<'nav' | 'missions' | 'none'>('none');
  const [showControls, setShowControls] = useState(false);
  const { selectedPlanet, cameraPosition } = useSolarSystem();
  const { credits } = useCredits();
  const { fuel, shield, hull } = useShipStatus();
  const { visitedPlanets, landingCount } = useRewards();
  const { missions, bounties } = useMissions();
  const { toggleMute, isMuted } = useAudio();
  const { showSplash } = useGame();

  const selectedPlanetData = selectedPlanet ? planets.find(p => p.name === selectedPlanet) : null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Central HUD */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-gray-900/90 border border-cyan-400/50 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center space-x-6 text-sm">
            {/* Crosshair/Target */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border border-cyan-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              </div>
              <span className="text-cyan-400 font-mono">TGT</span>
            </div>

            {/* Selected Target */}
            {selectedPlanet && (
              <div className="text-center">
                <div className="text-cyan-400 text-xs">TARGET</div>
                <div className="text-white font-semibold">{selectedPlanet}</div>
                {selectedPlanetData && (
                  <div className="text-xs text-gray-400">
                    {Math.round(selectedPlanetData.distance)} AU
                  </div>
                )}
              </div>
            )}

            {/* Velocity/Status */}
            <div className="text-center">
              <div className="text-green-400 text-xs">STATUS</div>
              <div className="text-white font-mono text-sm">NOMINAL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Navigation Panel */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-auto mobile-nav-left">
        <button
          onClick={() => setActivePanel(activePanel === 'nav' ? 'none' : 'nav')}
          className={`mb-2 w-12 h-12 rounded-lg border transition-all ${
            activePanel === 'nav' 
              ? 'bg-cyan-600 border-cyan-400 text-white' 
              : 'bg-gray-900/90 border-gray-600 text-gray-400 hover:text-white'
          }`}
        >
          🗺️
        </button>

        {activePanel === 'nav' && (
          <div className="bg-gray-900/95 border border-cyan-400/50 rounded-lg p-4 w-80 max-h-96 overflow-y-auto backdrop-blur-sm cockpit-panel">
            <h3 className="text-cyan-400 font-semibold mb-3">NAVIGATION</h3>
            
            {/* Coordinates */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded border border-gray-600">
              <div className="text-xs text-gray-400 mb-1">COORDINATES</div>
              <div className="font-mono text-sm text-white">
                X: {Math.round(cameraPosition.x)} | Y: {Math.round(cameraPosition.y)} | Z: {Math.round(cameraPosition.z)}
              </div>
            </div>

            {/* Planetary Information */}
            {selectedPlanet && selectedPlanetData && (
              <div className="mb-4 p-3 bg-gray-800/50 rounded border border-gray-600">
                <div className="text-xs text-gray-400 mb-1">PLANETARY DATA</div>
                <div className="text-white">
                  <div className="font-semibold">{selectedPlanet}</div>
                  <div className="text-sm text-gray-300 mt-1">{selectedPlanetData.description}</div>
                  <div className="text-xs text-cyan-400 mt-2">
                    Distance: {Math.round(selectedPlanetData.distance)} AU
                  </div>
                  {visitedPlanets.has(selectedPlanet) && (
                    <div className="text-xs text-green-400 mt-1">✓ Previously Visited</div>
                  )}
                </div>
              </div>
            )}

            {/* Mini System Map */}
            <div className="p-3 bg-gray-800/50 rounded border border-gray-600">
              <div className="text-xs text-gray-400 mb-2">SYSTEM MAP</div>
              <div className="relative w-full h-24 bg-black/50 rounded border">
                {/* Simple representation of planets */}
                {planets.slice(0, 6).map((planet, index) => (
                  <div
                    key={planet.name}
                    className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
                      planet.name === selectedPlanet ? 'bg-cyan-400 ring-2 ring-cyan-400/50' : 'bg-gray-500'
                    }`}
                    style={{
                      left: `${20 + (index * 60 / 6)}%`,
                      top: '50%',
                      backgroundColor: planet.name === selectedPlanet ? '#22d3ee' : planet.color
                    }}
                    title={planet.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Missions Panel */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto mobile-nav-right">
        <button
          onClick={() => setActivePanel(activePanel === 'missions' ? 'none' : 'missions')}
          className={`mb-2 w-12 h-12 rounded-lg border transition-all ${
            activePanel === 'missions' 
              ? 'bg-blue-600 border-blue-400 text-white' 
              : 'bg-gray-900/90 border-gray-600 text-gray-400 hover:text-white'
          }`}
        >
          📋
        </button>

        {activePanel === 'missions' && (
          <div className="bg-gray-900/95 border border-blue-400/50 rounded-lg p-4 w-80 max-h-96 overflow-y-auto backdrop-blur-sm cockpit-panel">
            <h3 className="text-blue-400 font-semibold mb-3">MISSION CONTROL</h3>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2 bg-gray-800/50 rounded border border-gray-600 text-center">
                <div className="text-xs text-gray-400">ACTIVE</div>
                <div className="text-white font-semibold">{missions.length}</div>
              </div>
              <div className="p-2 bg-gray-800/50 rounded border border-gray-600 text-center">
                <div className="text-xs text-gray-400">BOUNTIES</div>
                <div className="text-white font-semibold">{bounties.length}</div>
              </div>
            </div>

            {/* Active Missions */}
            <div className="space-y-2">
              {missions.slice(0, 3).map((mission) => (
                <div key={mission.id} className="p-3 bg-gray-800/50 rounded border border-gray-600">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{mission.title}</span>
                    <span className="text-yellow-400 text-xs">+{mission.reward}</span>
                  </div>
                  <div className="text-xs text-gray-300 mb-2">{mission.description}</div>
                  {mission.progress > 0 && (
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all"
                        style={{ width: `${mission.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-gray-900/90 border border-gray-600 rounded-lg p-4 backdrop-blur-sm status-bar">
          <div className="flex items-center space-x-8">
            {/* Ship Systems */}
            <div className="flex items-center space-x-4">
              {/* Fuel */}
              <div className="text-center">
                <div className="text-xs text-gray-400">FUEL</div>
                <div className="flex items-center space-x-1">
                  <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${fuel > 30 ? 'bg-green-400' : fuel > 15 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${fuel}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-mono">{Math.round(fuel)}%</span>
                </div>
              </div>

              {/* Shields */}
              <div className="text-center">
                <div className="text-xs text-gray-400">SHIELDS</div>
                <div className="flex items-center space-x-1">
                  <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${shield > 50 ? 'bg-cyan-400' : shield > 25 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${shield}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-mono">{Math.round(shield)}%</span>
                </div>
              </div>

              {/* Hull */}
              <div className="text-center">
                <div className="text-xs text-gray-400">HULL</div>
                <div className="flex items-center space-x-1">
                  <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${hull > 60 ? 'bg-green-400' : hull > 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${hull}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-mono">{Math.round(hull)}%</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-600"></div>

            {/* Credits */}
            <div className="text-center">
              <div className="text-xs text-gray-400">CREDITS</div>
              <div className="text-yellow-400 font-mono font-semibold">{credits.toLocaleString()}</div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-600"></div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition-colors"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                <span className="text-xs">{isMuted ? "🔇" : "🔊"}</span>
              </button>
              
              <button
                onClick={showSplash}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded border border-gray-600 transition-colors text-xs"
                title="Main Menu (ESC)"
              >
                MENU
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Flight Controls Toggle */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={() => setShowControls(!showControls)}
          className="bg-gray-900/90 border border-gray-600 rounded-lg p-2 text-gray-400 hover:text-white transition-colors backdrop-blur-sm"
          title="Toggle Flight Controls"
        >
          ?
        </button>
        
        {showControls && (
          <div className="absolute top-12 right-0 bg-gray-900/90 border border-gray-600 rounded-lg p-3 text-xs backdrop-blur-sm w-48">
            <div className="text-gray-400 mb-2">FLIGHT CONTROLS</div>
            <div className="space-y-1 text-white">
              <div>WASD - Navigation</div>
              <div>QE - Up/Down</div>
              <div>SPACE - Fire Lasers</div>
              <div>L - Land</div>
              <div>C - Center View</div>
              <div>I - Toggle Info</div>
              <div>ESC - Menu</div>
            </div>
            <button
              onClick={() => setShowControls(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Click to hide
            </button>
          </div>
        )}
      </div>
    </div>
  );
}