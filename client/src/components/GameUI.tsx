import { useState, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { PlanetInfo } from "./PlanetInfo";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useAudio } from "../lib/stores/useAudio";

enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
  shoot = 'shoot',
  land = 'land',
  info = 'info'
}

export function GameUI() {
  const [showInfo, setShowInfo] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const { selectedPlanet, isLanding } = useSolarSystem();
  const { toggleMute, isMuted } = useAudio();
  const [, get] = useKeyboardControls<Controls>();

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
      {/* Planet Information Panel */}
      {showInfo && <PlanetInfo />}

      {/* Controls Help Panel */}
      {showControls && (
        <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm">
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
        </div>
      </div>

      {/* Welcome Message */}
      <div className="absolute bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm max-w-md">
        <h3 className="text-lg font-bold mb-2 text-blue-400">Welcome to Solar System Explorer</h3>
        <p className="text-sm text-gray-300">
          Use your mouse to look around and keyboard to navigate through space. 
          Approach planets to learn more about them, or land on their surfaces!
        </p>
      </div>
    </>
  );
}
