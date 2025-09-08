import { useState } from "react";
import { useGame } from "../lib/stores/useGame";
import { useAudio } from "../lib/stores/useAudio";

export function SplashScreen() {
  const [showOptions, setShowOptions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { start } = useGame();
  const { toggleMute, isMuted } = useAudio();

  const handleEnterCockpit = () => {
    start();
  };

  const keyBindings = [
    { action: "Move Forward", keys: "W / ↑" },
    { action: "Move Backward", keys: "S / ↓" },
    { action: "Move Left", keys: "A / ←" },
    { action: "Move Right", keys: "D / →" },
    { action: "Move Up", keys: "Q" },
    { action: "Move Down", keys: "E" },
    { action: "Fire Lasers", keys: "Space" },
    { action: "Land on Planet", keys: "L" },
    { action: "Toggle Info", keys: "I" },
    { action: "Look Around", keys: "Mouse" },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-black via-blue-900/20 to-black flex items-center justify-center z-50">
      {/* Starfield background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="animate-pulse">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-80"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 text-center max-w-4xl px-8">
        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-wider">
          SOLAR SYSTEM
        </h1>
        <h2 className="text-3xl md:text-4xl font-light text-blue-300 mb-8 tracking-wide">
          EXPLORER
        </h2>
        
        {/* Subtitle */}
        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
          Pilot your spacecraft through the vastness of space. Explore planets, engage targets, 
          and experience realistic rocket propulsion physics.
        </p>

        {/* Main Action Button */}
        <button
          onClick={handleEnterCockpit}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 
                     text-white font-bold py-4 px-12 rounded-lg text-xl mb-8 
                     transform transition-all duration-300 hover:scale-105 hover:shadow-2xl
                     border border-blue-400 shadow-lg"
        >
          🚀 ENTER THE COCKPIT
        </button>

        {/* Menu Buttons */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => setShowOptions(true)}
            className="bg-gray-800/80 hover:bg-gray-700 text-white font-semibold py-3 px-8 
                       rounded-lg border border-gray-600 transition-all duration-300 hover:scale-105"
          >
            ⚙️ OPTIONS
          </button>
          
          <button
            onClick={() => setShowHelp(true)}
            className="bg-gray-800/80 hover:bg-gray-700 text-white font-semibold py-3 px-8 
                       rounded-lg border border-gray-600 transition-all duration-300 hover:scale-105"
          >
            ❓ HELP
          </button>
        </div>

        {/* Version/Credits */}
        <p className="text-gray-500 text-sm">
          Built with React Three Fiber • Press any key for controls
        </p>
      </div>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-6">Options</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Audio</span>
                <button
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded transition-colors ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-500 text-white' 
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  {isMuted ? '🔇 Muted' : '🔊 Enabled'}
                </button>
              </div>
              
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400">
                  Experience realistic space flight with momentum-based controls and authentic rocket physics.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowOptions(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Flight Manual</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-blue-300 mb-3">Controls</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {keyBindings.map((binding, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                      <span className="text-gray-300 text-sm">{binding.action}</span>
                      <kbd className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono">
                        {binding.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-blue-300 mb-3">Gameplay Tips</h4>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• Use realistic momentum-based movement - thrusters build up speed gradually</li>
                  <li>• Approach planets to learn about them and see detailed information</li>
                  <li>• Use the mini map to navigate the solar system</li>
                  <li>• Fire lasers to defend yourself in the vastness of space</li>
                  <li>• Land on planets by pressing 'L' when near them</li>
                  <li>• Your coordinates are displayed in the top-right corner</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded transition-colors"
            >
              Launch Mission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}