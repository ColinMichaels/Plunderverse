import { useState, useEffect } from "react";
import { useGame } from "../lib/stores/useGame";
import { useAudio } from "../lib/stores/useAudio";

export function SplashScreen() {
  const [showOptions, setShowOptions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { start } = useGame();
  const {
    toggleMute,
    isMuted,
    setAmbientMusic,
    setLaserSound,
    playAmbientMusic,
    stopAmbientMusic,
  } = useAudio();

  // Initialize sounds and start ambient music
  useEffect(() => {
    // Load space ambience
    const ambientAudio = new Audio("/sounds/space-ambience.mp3");
    setAmbientMusic(ambientAudio);

    // Load new laser sound (zap)
    const zapAudio = new Audio("/sounds/zap.mp3");
    setLaserSound(zapAudio);

    // Play ambient music when splash screen loads
    playAmbientMusic();

    // Cleanup when component unmounts
    return () => {
      stopAmbientMusic();
    };
  }, [setAmbientMusic, setLaserSound, playAmbientMusic, stopAmbientMusic]);

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
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 overflow-hidden">
      {/* Enhanced animated starfield background */}
      <div className="absolute inset-0">
        {/* Moving stars */}
        <div className="animate-pulse">
          {Array.from({ length: 150 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.8 + 0.2,
                animationDuration: `${Math.random() * 4 + 2}s`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        {/* Subtle space effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/3 to-transparent animate-pulse opacity-40"></div>
      </div>

      <div className="relative z-10 text-center max-w-4xl px-8">
        {/* Enhanced Main Title with animations */}
        <div className="relative mb-4">
          <h1 className="text-6xl md:text-8xl font-bold text-cyan-400 mb-4 tracking-wider">
            SOLAR SYSTEM
          </h1>
        </div>

        <div className="relative mb-8">
          <h2 className="text-3xl md:text-4xl font-light text-cyan-300 tracking-wide">
            EXPLORER
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
          Pilot your spacecraft through the vastness of space. Explore planets,
          engage targets, and experience realistic rocket propulsion physics.
        </p>

        {/* Main Action Button */}
        <button
          onClick={handleEnterCockpit}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-4 px-12 rounded-xl text-xl mb-8 
                     transform transition-all duration-300 hover:scale-105 shadow-lg"
        >
          🚀 ENTER THE COCKPIT
        </button>

        {/* Menu Buttons */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => setShowOptions(true)}
            className="bg-slate-700 hover:bg-slate-600 text-cyan-400 font-semibold py-3 px-8 
                       rounded-xl border border-slate-600 hover:border-cyan-400 transition-all duration-300 hover:scale-105"
          >
            ⚙️ OPTIONS
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="bg-slate-700 hover:bg-slate-600 text-cyan-400 font-semibold py-3 px-8 
                       rounded-xl border border-slate-600 hover:border-cyan-400 transition-all duration-300 hover:scale-105"
          >
            ❓ HELP
          </button>
        </div>

        {/* Version/Credits */}
        <p className="text-slate-500 text-sm">
          Built with React Three Fiber • Press any key for controls
        </p>
      </div>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-cyan-400 mb-6">Options</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Audio</span>
                <button
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isMuted
                      ? "bg-red-600 hover:bg-red-500 text-white"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                  }`}
                >
                  {isMuted ? "🔇 Muted" : "🔊 Enabled"}
                </button>
              </div>

              <div className="border-t border-slate-600 pt-4">
                <p className="text-sm text-slate-400">
                  Experience realistic space flight with momentum-based controls
                  and authentic rocket physics.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowOptions(false)}
              className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-cyan-400 mb-6">
              Flight Manual
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">
                  Controls
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {keyBindings.map((binding, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-slate-700 p-2 rounded-lg"
                    >
                      <span className="text-slate-300 text-sm">
                        {binding.action}
                      </span>
                      <kbd className="bg-slate-600 text-cyan-400 px-2 py-1 rounded text-xs font-mono">
                        {binding.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">
                  Gameplay Tips
                </h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>
                    • Use realistic momentum-based movement - thrusters build up
                    speed gradually
                  </li>
                  <li>
                    • Approach planets to learn about them and see detailed
                    information
                  </li>
                  <li>• Use the mini map to navigate the solar system</li>
                  <li>
                    • Fire lasers to defend yourself in the vastness of space
                  </li>
                  <li>• Land on planets by pressing 'L' when near them</li>
                  <li>
                    • Your coordinates are displayed in the top-right corner
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
            >
              Launch Mission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
