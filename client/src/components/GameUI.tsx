import { useState, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { PlanetInfo } from "./PlanetInfo";
import { CoordinatesDisplay } from "./CoordinatesDisplay";
import { MiniMap } from "./MiniMap";
import { ShipStatusHUD } from "./ShipStatusHUD";
import { LandingTransition } from "./LandingTransition";
import { CockpitOverlay } from "./CockpitOverlay";
import { LandingWarning } from "./LandingWarning";
import { MissionsPanel } from "./MissionsPanel";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useAudio } from "../lib/stores/useAudio";
import { useGame } from "../lib/stores/useGame";
import { useCredits } from "../lib/stores/useCredits";
import { useLandingWarning } from "../lib/stores/useLandingWarning";
import { useAutopilot } from "../lib/stores/useAutopilot";
import { planets } from "../lib/planetData";

enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
  shoot = 'shoot',
  land = 'land',
  info = 'info',
  menu = 'menu',
  center = 'center'
}

export function GameUI() {
  const [showInfo, setShowInfo] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showMissions, setShowMissions] = useState(false);
  const { selectedPlanet, isLanding, time } = useSolarSystem();
  const { toggleMute, isMuted } = useAudio();
  const { showSplash } = useGame();
  const { credits } = useCredits();
  const { isVisible: showLandingWarning, planetName, currentDistance, requiredDistance, hideWarning } = useLandingWarning();
  const { activate: activateAutopilot } = useAutopilot();
  const [, get] = useKeyboardControls<Controls>();

  // Autopilot activation function
  const handleAutopilot = () => {
    if (selectedPlanet) {
      const planetData = planets.find(p => p.name === selectedPlanet);
      if (planetData) {
        // Calculate target position near the planet
        const angle = time * planetData.orbitalSpeed;
        const planetX = Math.cos(angle) * planetData.distance;
        const planetZ = Math.sin(angle) * planetData.distance;
        const targetPosition = new THREE.Vector3(planetX, 0, planetZ);
        
        // Move to a safe distance from the planet (slightly closer than landing range)
        const approachDirection = new THREE.Vector3(0, 10, 50); // Assume current camera position
        const safeDistance = planetData.size * 6;
        targetPosition.add(approachDirection.normalize().multiplyScalar(safeDistance));
        
        activateAutopilot(targetPosition);
        console.log(`Autopilot activated! Navigating to ${selectedPlanet}`);
      }
    }
  };

  // Handle info toggle
  useEffect(() => {
    const handleInfoToggle = () => {
      const controls = get();
      if (controls.info) {
        setShowInfo(prev => !prev);
        console.log("Toggling info display");
      }
    };

    const interval = setInterval(handleInfoToggle, 100);
    return () => clearInterval(interval);
  }, [get]);

  // Auto-hide controls after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 8000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Cockpit Overlay */}
      <CockpitOverlay />
      
      {/* Ship Status HUD */}
      <ShipStatusHUD />
      
      {/* Landing Transition */}
      <LandingTransition />
      
      {/* Planet Information Panel */}
      {showInfo && <PlanetInfo />}

      {/* Coordinates Display */}
      <CoordinatesDisplay />

      {/* Mini Map */}
      <MiniMap />

      {/* Controls Help Panel */}
      {showControls && (
        <div className="absolute top-36 right-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-3 text-blue-400">Flight Controls</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Move:</span>
              <span className="text-white">WASD / Arrow Keys</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Up/Down:</span>
              <span className="text-white">Q / E</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Shoot:</span>
              <span className="text-white">Space</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Land:</span>
              <span className="text-white">L</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Toggle Info:</span>
              <span className="text-white">I</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Menu:</span>
              <span className="text-white">ESC</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Center Camera:</span>
              <span className="text-white">C</span>
            </div>
          </div>
          <button
            onClick={() => setShowControls(false)}
            className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Click to hide
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${selectedPlanet ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="text-gray-300">Target:</span>
            <span className="text-white">{selectedPlanet || "None"}</span>
          </div>
          
          {isLanding && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-orange-400">Landing...</span>
            </div>
          )}
          
          <button
            onClick={() => {
              toggleMute();
              console.log(`Audio ${isMuted ? 'unmuted' : 'muted'}`);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          
          <button
            onClick={() => {
              showSplash();
            }}
            className="text-gray-400 hover:text-white transition-colors text-xs px-2 py-1 rounded border border-gray-600"
            title="Return to Main Menu (ESC)"
          >
            Menu
          </button>
          
          <div className="text-yellow-400 text-xs font-mono">
            💰 {credits}
          </div>
        </div>
      </div>

      {/* Landing Warning Dialog */}
      <LandingWarning
        isVisible={showLandingWarning}
        planetName={planetName}
        currentDistance={currentDistance}
        requiredDistance={requiredDistance}
        onClose={hideWarning}
        onAutopilot={handleAutopilot}
      />

      {/* Missions Panel */}
      <MissionsPanel
        isVisible={showMissions}
        onToggle={() => setShowMissions(!showMissions)}
      />

    </>
  );
}
