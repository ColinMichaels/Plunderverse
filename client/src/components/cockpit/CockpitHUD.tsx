import { useState } from "react";
import { useSolarSystem, vec3Distance } from "../../lib/stores/space/useSolarSystem";
import { useCreditsData } from "../../domain/economy/selectors";
import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useEquipment } from "../../lib/stores/ship/useEquipment";
import { useRewards } from "../../lib/stores/ui/useRewards";
import { useMissions } from "../../lib/stores/economy/useMissions";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { useGame } from "../../lib/stores/ui/useGame";
import { useAutopilot } from "../../lib/stores/navigation/useAutopilot";
import { useLandedState } from "../../lib/stores/surface/useLandedState";
import { useHeatSystem } from "../../lib/stores/player/useHeatSystem";
import { useInput } from "../../stores/useInput";
import { WantedLevelIndicator } from "../ui/WantedLevelIndicator";
import { planets } from "../../lib/planetData";
import * as THREE from "three";

export function CockpitHUD() {
  const [activePanel, setActivePanel] = useState<"nav" | "missions" | "none">(
    "none",
  );
  const [showControls, setShowControls] = useState(false);
  const {
    selectedPlanet,
    cameraPosition,
    distanceToTarget,
    time,
    setSelectedPlanet,
  } = useSolarSystem();
  const { credits, spendCredits } = useCreditsData();
  const { shield, hull, isThrusting, isWarpMode } = useShipStatus();
  const { getEquipment } = useEquipment();

  // Get fuel from equipment system
  const fuelTank = getEquipment("fuel-tank");
  const fuel = fuelTank
    ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100
    : 0;
  const { visitedPlanets, landingCount } = useRewards();
  const { missions, bounties } = useMissions();
  const audio = useAudio();
  const { showSplash } = useGame();
  const { activateCinematic: activateAutopilot, isActive: isAutopilotActive } =
    useAutopilot();
  const { isLanded } = useLandedState();
  const { currentHeat, wantedLevel } = useHeatSystem();
  const { isMouseSteering } = useInput();

  const selectedPlanetData = selectedPlanet
    ? planets.find((p) => p.name === selectedPlanet)
    : null;

  // Calculate distances to all planets and filter those within range
  const planetsWithDistance = planets
    .map((planet) => {
      const angle = time * planet.orbitalSpeed;
      const planetX = Math.cos(angle) * planet.distance;
      const planetZ = Math.sin(angle) * planet.distance;
      const planetPosition = new THREE.Vector3(planetX, 0, planetZ);
      const distance = vec3Distance(cameraPosition, planetPosition);

      return {
        ...planet,
        currentDistance: distance,
        position: planetPosition,
      };
    })
    .filter((planet) => planet.currentDistance <= 2000) // Only show planets within 2000 units
    .sort((a, b) => a.currentDistance - b.currentDistance); // Sort by distance

  const handleSelectPlanet = (planetName: string) => {
    // Prevent sun from being selected
    if (planetName === "Sun") {
      console.log("Cannot select the Sun - it's not a targetable object");
      return;
    }
    setSelectedPlanet(planetName);
    console.log(`Selected ${planetName} from navigation log`);
  };

  const handleAutopilot = (planet: (typeof planetsWithDistance)[0]) => {
    const autopilotCost = 100; // Cost 100 credits for autopilot

    if (credits < autopilotCost) {
      console.log(
        `Not enough credits for autopilot. Need ${autopilotCost} credits.`,
      );
      return;
    }

    if (isAutopilotActive) {
      console.log("Autopilot already active!");
      return;
    }

    if (spendCredits(autopilotCost)) {
      // Select the planet as target and close navigation panel
      setSelectedPlanet(planet.name);
      setActivePanel("none");

      const camVec = new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z);
      const approachDirection = camVec.sub(planet.position).normalize();
      const safeDistance = planet.size * 4;
      const targetPosition = planet.position
        .clone()
        .add(approachDirection.multiplyScalar(safeDistance));

      activateAutopilot(targetPosition);
      console.log(
        `Autopilot engaged to ${planet.name}! Cost: ${autopilotCost} credits`,
      );
    }
  };

  // Hide entire HUD when landed on surface
  if (isLanded) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Wanted Level Indicator - Always visible in top right */}
      {!isLanded && currentHeat > 0 && (
        <div className="absolute top-4 right-4 pointer-events-auto">
          <WantedLevelIndicator />
        </div>
      )}
      
      {/* Mobile: Hide large central HUD, Desktop: Show central HUD */}
      <div className="hidden md:block">
        <div
          className={`absolute top-16 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
            isThrusting
              ? "scale-75 opacity-40 pointer-events-none"
              : "scale-100 opacity-100 pointer-events-auto"
          }`}
        >
        <div
          className={`border border-cyan-400/50 rounded-lg backdrop-blur-sm transition-all duration-300 ${
            isThrusting ? "bg-slate-800/40 p-1 sm:p-2" : "bg-slate-800/70 p-2 sm:p-3"
          } max-w-xs sm:max-w-md text-xs sm:text-sm`}
        >
          {/* Targeting Computer Display */}
          {selectedPlanet && selectedPlanetData && !isLanded ? (
            <div className="w-full">
              {/* Target Header - Simplified for Mobile */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-cyan-400 font-mono font-semibold">
                    🎯 TARGET
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  📡 ACTIVE
                </div>
              </div>

              {/* Main Target Info Grid - compact layout */}
              <div
                className={`grid gap-2 text-xs transition-all duration-300 ${
                  isThrusting ? "grid-cols-2" : "grid-cols-2"
                }`}
              >
                {/* Primary Target Data - Simplified Icons */}
                <div className="bg-slate-700/50 rounded p-2 border border-slate-600">
                  <div className="text-cyan-400 font-mono text-xs mb-1">
                    🌍
                  </div>
                  <div className="text-white font-semibold text-sm">
                    {selectedPlanet}
                  </div>
                  <div className="text-slate-300 text-xs">
                    📏 {selectedPlanetData.diameter} km
                  </div>
                </div>

                {/* Distance & Status - Simplified Icons */}
                <div className="bg-slate-700/50 rounded p-2 border border-slate-600">
                  <div className="text-cyan-400 font-mono text-xs mb-1">
                    📐
                  </div>
                  <div className="text-white font-semibold text-sm">
                    {Math.round(distanceToTarget * 10) / 10}
                  </div>
                  <div className="text-slate-300 text-xs">
                    {visitedPlanets.has(selectedPlanet)
                      ? "✅"
                      : "🆕"}
                  </div>
                </div>
              </div>

              {/* Landing Status - Mobile Friendly */}
              <div className="mt-2 flex items-center justify-center space-x-2">
                <div className="flex items-center space-x-1 bg-slate-700/30 rounded px-2 py-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-xs font-mono">
                    🛬 OK
                  </span>
                </div>
                <div className="text-slate-400 text-xs font-mono bg-slate-700/30 rounded px-2 py-1">
                  L or 🛬 
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                </div>
                <div className="text-slate-400 font-mono text-sm">
                  🎯 NO TARGET
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  👆 Tap planet
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Mobile: Minimal target indicator - top edge */}
      <div className="md:hidden absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className="pointer-events-auto">
          {selectedPlanet && selectedPlanetData && !isLanded ? (
            <div className="bg-slate-900/80 border border-cyan-400/30 rounded px-3 py-1 text-xs text-cyan-400 font-mono">
              🎯 {selectedPlanet} • {Math.round(distanceToTarget)} units
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-600/30 rounded px-3 py-1 text-xs text-slate-400 font-mono">
              🎯 NO TARGET
            </div>
          )}
        </div>
      </div>

      {/* Left Navigation Panel */}
      <div className="absolute left-6 top-64 transform -translate-y-1/2 pointer-events-auto mobile-nav-left">
        <button
          onClick={() => setActivePanel(activePanel === "nav" ? "none" : "nav")}
          className={`mb-1 sm:mb-2 w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border transition-all text-xs sm:text-base ${
            activePanel === "nav"
              ? "bg-cyan-500 border-cyan-400 text-slate-900"
              : "bg-slate-800/90 border-slate-600 text-slate-400 hover:text-white"
          }`}
        >
          🗺️
        </button>

        {activePanel === "nav" && (
          <div className="bg-slate-800/95 border border-cyan-400/50 rounded-lg sm:rounded-xl p-2 sm:p-4 w-64 sm:w-80 max-h-72 sm:max-h-96 overflow-y-auto backdrop-blur-sm cockpit-panel">
            <h3 className="text-cyan-400 font-semibold mb-2 sm:mb-3 text-xs sm:text-sm">🗺️ NAV</h3>

            {/* Coordinates */}
            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="text-xs text-slate-400 mb-1">📍</div>
              <div className="font-mono text-sm text-white">
                X: {Math.round(cameraPosition.x)} | Y:{" "}
                {Math.round(cameraPosition.y)} | Z:{" "}
                {Math.round(cameraPosition.z)}
              </div>
            </div>

            {/* Planetary Information */}
            {selectedPlanet && selectedPlanetData && (
              <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="text-xs text-slate-400 mb-1">
                  🌌 DATA
                </div>
                <div className="text-white">
                  <div className="font-semibold">{selectedPlanet}</div>
                  <div className="text-sm text-slate-300 mt-1">
                    {selectedPlanetData.description}
                  </div>
                  <div className="text-xs text-cyan-400 mt-2">
                    Distance: {Math.round(selectedPlanetData.distance)} AU
                  </div>
                  {visitedPlanets.has(selectedPlanet) && (
                    <div className="text-xs text-cyan-400 mt-1">
                      ✓ Previously Visited
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Log */}
            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="text-xs text-slate-400 mb-2">📊 LOG</div>
              <div className="text-xs text-slate-500 mb-3">
                🌍 In range • 🤖 Auto: 100 💰
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {planetsWithDistance.length > 0 ? (
                  planetsWithDistance.map((planet) => (
                    <div
                      key={planet.name}
                      className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-600 hover:border-cyan-400/50 transition-colors"
                    >
                      <div className="flex-1">
                        <button
                          onClick={() => handleSelectPlanet(planet.name)}
                          className={`text-left w-full ${
                            planet.name === selectedPlanet
                              ? "text-cyan-400"
                              : "text-white hover:text-cyan-400"
                          }`}
                        >
                          <div className="font-semibold text-sm">
                            {planet.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {Math.round(planet.currentDistance * 10) / 10} units
                            {visitedPlanets.has(planet.name) && " • Visited"}
                          </div>
                        </button>
                      </div>

                      <button
                        onClick={() => handleAutopilot(planet)}
                        disabled={credits < 100 || isAutopilotActive}
                        className={`ml-2 px-3 py-1 text-xs rounded transition-colors ${
                          credits < 100 || isAutopilotActive
                            ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                            : "bg-cyan-600 hover:bg-cyan-500 text-white"
                        }`}
                        title={
                          isAutopilotActive
                            ? "Autopilot already active"
                            : "Engage autopilot (100 credits)"
                        }
                      >
                        {isAutopilotActive ? "ACTIVE" : "AUTO"}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 text-sm py-4">
                    No planets within range
                  </div>
                )}
              </div>
            </div>

            {/* Mini System Map */}
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="text-xs text-slate-400 mb-2">SYSTEM MAP</div>
              <div className="relative w-full h-24 bg-black/50 rounded border">
                {/* Simple representation of planets */}
                {planets.slice(0, 6).map((planet, index) => (
                  <div
                    key={planet.name}
                    className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
                      planet.name === selectedPlanet
                        ? "bg-cyan-400 ring-2 ring-cyan-400/50"
                        : "bg-gray-500"
                    }`}
                    style={{
                      left: `${20 + (index * 60) / 6}%`,
                      top: "50%",
                      backgroundColor:
                        planet.name === selectedPlanet
                          ? "#22d3ee"
                          : planet.color,
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
          onClick={() =>
            setActivePanel(activePanel === "missions" ? "none" : "missions")
          }
          className={`mb-1 sm:mb-2 w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border transition-all text-xs sm:text-base ${
            activePanel === "missions"
              ? "bg-cyan-500 border-cyan-400 text-slate-900"
              : "bg-slate-800/90 border-slate-600 text-slate-400 hover:text-white"
          }`}
        >
          📋
        </button>

        {activePanel === "missions" && (
          <div className="bg-slate-800/95 border border-cyan-400/50 rounded-lg sm:rounded-xl p-2 sm:p-4 w-64 sm:w-80 max-h-72 sm:max-h-96 overflow-y-auto backdrop-blur-sm cockpit-panel">
            <h3 className="text-cyan-400 font-semibold mb-3">
              MISSION CONTROL
            </h3>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2 bg-slate-700/50 rounded-lg border border-slate-600 text-center">
                <div className="text-xs text-slate-400">ACTIVE</div>
                <div className="text-white font-semibold">
                  {missions.length}
                </div>
              </div>
              <div className="p-2 bg-slate-700/50 rounded-lg border border-slate-600 text-center">
                <div className="text-xs text-slate-400">BOUNTIES</div>
                <div className="text-white font-semibold">
                  {bounties.length}
                </div>
              </div>
            </div>

            {/* Active Missions */}
            <div className="space-y-2">
              {missions.slice(0, 3).map((mission) => (
                <div
                  key={mission.id}
                  className="p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">
                      {mission.title}
                    </span>
                    <span className="text-cyan-400 text-xs">
                      +{mission.reward}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mb-2">
                    {mission.description}
                  </div>
                  {mission.progress > 0 && (
                    <div className="w-full bg-slate-600 rounded-full h-1">
                      <div
                        className="bg-cyan-500 h-1 rounded-full transition-all"
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

      {/* Mobile: Compact bottom status bar - edge positioned */}
      <div className="md:hidden absolute bottom-1 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-slate-900/80 border border-slate-600/30 rounded px-2 py-1">
          <div className="flex items-center space-x-3 text-xs">
            {/* Compact fuel indicator */}
            <div className="flex items-center space-x-1">
              <div className="w-1 h-4 bg-slate-700 rounded-full relative overflow-hidden">
                <div className={`w-full absolute bottom-0 ${fuel > 30 ? "bg-green-400" : fuel > 15 ? "bg-yellow-400" : "bg-red-400"}`} style={{ height: `${fuel}%` }} />
              </div>
              <span className="text-cyan-400 font-mono">⛽{Math.round(fuel)}%</span>
            </div>
            {/* Credits */}
            <div className="text-cyan-400 font-mono">{credits.toLocaleString()}💰</div>
            {/* Menu button */}
            <button onClick={showSplash} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs" title="Menu">
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Full bottom status bar */}
      <div className="hidden md:block">
        <div
          className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto transition-all duration-300 ${
            isThrusting ? "opacity-60" : "opacity-100"
          }`}
        >
          <div
            className={`border border-slate-600 rounded-xl backdrop-blur-sm status-bar transition-all duration-300 ${
              isThrusting ? "bg-slate-800/60 p-2" : "bg-slate-800/90 p-4"
            }`}
          >
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-6">
                {/* Desktop fuel, shields, hull - keep existing layout */}
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">FUEL</div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-2 h-8 bg-slate-700 rounded-full overflow-hidden relative">
                      <div className={`w-full transition-all absolute bottom-0 ${fuel > 30 ? "bg-green-400" : fuel > 15 ? "bg-yellow-400" : "bg-red-400"}`} style={{ height: `${fuel}%` }} />
                    </div>
                    <span className="text-cyan-400 text-sm font-mono font-bold">{Math.round(fuel)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">SHIELDS</div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-2 h-8 bg-slate-700 rounded-full overflow-hidden relative">
                      <div className={`w-full transition-all absolute bottom-0 ${shield > 50 ? "bg-cyan-400" : shield > 25 ? "bg-yellow-400" : "bg-red-400"}`} style={{ height: `${shield}%` }} />
                    </div>
                    <span className="text-cyan-400 text-sm font-mono font-bold">{Math.round(shield)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">HULL</div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-2 h-8 bg-slate-700 rounded-full overflow-hidden relative">
                      <div className={`w-full transition-all absolute bottom-0 ${hull > 60 ? "bg-green-400" : hull > 30 ? "bg-yellow-400" : "bg-red-400"}`} style={{ height: `${hull}%` }} />
                    </div>
                    <span className="text-orange-400 text-sm font-mono font-bold">{Math.round(hull)}%</span>
                  </div>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-600"></div>
              <div className="text-center">
                <div className="text-xs text-slate-400">CREDITS</div>
                <div className="text-cyan-400 font-mono font-semibold">{credits.toLocaleString()}</div>
              </div>
              <div className="w-px h-8 bg-slate-600"></div>
              <div className="text-center">
                <div className="text-xs text-slate-400">THRUST</div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isWarpMode ? "bg-cyan-400" : "bg-orange-400"}`} id="thrust-indicator" style={{ opacity: 0 }}></div>
                  <span className={`text-xs font-mono ${isWarpMode ? "text-cyan-400" : "text-orange-400"}`}>{isWarpMode ? "WARP" : "IDLE"}</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-600"></div>
              <div className="flex items-center space-x-2">
                <button onClick={audio.toggleMasterMute} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors" title={audio.masterMute ? "Unmute Audio" : "Mute Audio"}>
                  <span className="text-xs">{audio.masterMute ? "🔇" : "🔊"}</span>
                </button>
                <button onClick={showSplash} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg border border-slate-600 transition-colors text-xs" title="Main Menu (ESC)">MENU</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mouse Steering Indicator - appears when clicking and holding */}
      {isMouseSteering && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative">
            {/* Crosshair */}
            <div className="w-8 h-8 border-2 border-cyan-400 rounded-full opacity-60 animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full"></div>
            {/* Steering text */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-cyan-400 text-xs font-mono whitespace-nowrap">
              MOUSE STEERING
            </div>
          </div>
        </div>
      )}

      {/* Flight Controls Toggle */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={() => setShowControls(!showControls)}
          className="bg-slate-800/90 border border-slate-600 rounded-xl p-2 text-slate-400 hover:text-white transition-colors backdrop-blur-sm"
          title="Toggle Flight Controls"
        >
          ?
        </button>

        {showControls && (
          <div className="absolute top-12 right-0 bg-slate-800/90 border border-slate-600 rounded-xl p-3 text-xs backdrop-blur-sm w-56">
            <div className="text-cyan-400 mb-2">FLIGHT CONTROLS</div>
            <div className="space-y-1 text-white">
              <div>WASD - Navigation</div>
              <div>QE - Up/Down</div>
              <div>Click & Hold - Mouse Steering</div>
              <div>SPACE - Fire Lasers</div>
              <div>L - Land</div>
              <div>C - Center View</div>
              <div>I - Toggle Info</div>
              <div>ESC - Menu</div>
            </div>
            <button
              onClick={() => setShowControls(false)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Click to hide
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
