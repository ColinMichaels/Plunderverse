import { useState, useEffect } from "react";
import { useGame } from "../lib/stores/useGame";
import { useAudio } from "../lib/stores/useAudio";

export function SplashScreen() {
  const [showOptions, setShowOptions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Removed mouse tracking for smoother space travel animation
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
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50 overflow-hidden">
      {/* Enhanced photorealistic starfield background */}
      <div className="absolute inset-0">
        {/* Traveling through space - stars with zoom parallax */}
        <div className="absolute inset-0">
          {Array.from({ length: 300 }).map((_, i) => {
            const size = Math.random() * 4 + 0.5;
            const brightness = Math.random() * 0.9 + 0.3;
            const twinkleSpeed = Math.random() * 6 + 4;
            const color = Math.random() > 0.7 ? 
              (Math.random() > 0.5 ? '#E6F3FF' : '#FFF8E1') : '#FFFFFF';
            const depth = Math.random() * 5 + 1; // Deeper parallax layers
            const travelSpeed = Math.random() * 20 + 15; // Travel animation speed
            const driftX = (Math.random() - 0.5) * 4; // Random horizontal drift
            const driftY = (Math.random() - 0.5) * 4; // Random vertical drift
            
            return (
              <div
                key={i}
                className="absolute rounded-full star-travel"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: color,
                  opacity: brightness,
                  boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}40`,
                  animationDuration: `${twinkleSpeed}s, ${travelSpeed}s`,
                  animationDelay: `${Math.random() * 6}s, ${Math.random() * 10}s`,
                  '--drift-x': `${driftX}px`,
                  '--drift-y': `${driftY}px`,
                  '--depth': depth,
                } as React.CSSProperties}
              />
            );
          })}
        </div>

        {/* Nebula particles with travel effect */}
        <div className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => {
            const depth = Math.random() * 3 + 1;
            const glowSpeed = Math.random() * 4 + 6;
            const travelSpeed = Math.random() * 25 + 20;
            const driftX = (Math.random() - 0.5) * 6;
            const driftY = (Math.random() - 0.5) * 6;
            
            return (
              <div
                key={`particle-${i}`}
                className="absolute rounded-full nebula-travel"
                style={{
                  width: '3px',
                  height: '3px',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: '#4FC3F7',
                  boxShadow: '0 0 8px #4FC3F7, 0 0 16px #4FC3F760',
                  animationDuration: `${glowSpeed}s, ${travelSpeed}s`,
                  animationDelay: `${Math.random() * 8}s, ${Math.random() * 12}s`,
                  '--drift-x': `${driftX}px`,
                  '--drift-y': `${driftY}px`,
                  '--depth': depth,
                } as React.CSSProperties}
              />
            );
          })}
        </div>

        {/* Space dust with travel effect */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-gray-900/10 to-gray-950/20 space-travel"></div>
      </div>

      {/* Custom CSS animations for space travel */}
      <style>{`
        .star-travel {
          animation: starTwinkle linear infinite, spaceTravel linear infinite;
        }
        
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes spaceTravel {
          0% { 
            transform: translate(0, 0) scale(1); 
          }
          25% { 
            transform: translate(calc(var(--drift-x) * 0.5), calc(var(--drift-y) * 0.5)) scale(calc(1 + var(--depth) * 0.1)); 
          }
          50% { 
            transform: translate(var(--drift-x), var(--drift-y)) scale(calc(1 + var(--depth) * 0.2)); 
          }
          75% { 
            transform: translate(calc(var(--drift-x) * 0.7), calc(var(--drift-y) * 0.7)) scale(calc(1 + var(--depth) * 0.15)); 
          }
          100% { 
            transform: translate(0, 0) scale(1); 
          }
        }
        
        .nebula-travel {
          animation: nebulaGlow ease-in-out infinite, nebulaTravel linear infinite;
        }
        
        @keyframes nebulaGlow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
        
        @keyframes nebulaTravel {
          0% { 
            transform: translate(0, 0) scale(1); 
          }
          33% { 
            transform: translate(calc(var(--drift-x) * 0.6), calc(var(--drift-y) * 0.6)) scale(calc(1 + var(--depth) * 0.15)); 
          }
          66% { 
            transform: translate(var(--drift-x), var(--drift-y)) scale(calc(1 + var(--depth) * 0.25)); 
          }
          100% { 
            transform: translate(0, 0) scale(1); 
          }
        }
        
        .space-travel {
          animation: spaceDust 30s ease-in-out infinite;
        }
        
        @keyframes spaceDust {
          0%, 100% { 
            transform: translateX(0) translateY(0) scale(1) rotate(0deg); 
            opacity: 0.3;
          }
          50% { 
            transform: translateX(3px) translateY(-2px) scale(1.05) rotate(0.5deg); 
            opacity: 0.6;
          }
        }
        
        .content-float {
          animation: contentFloat 8s ease-in-out infinite;
        }
        
        @keyframes contentFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
      `}</style>

      <div className="relative z-10 text-center max-w-4xl px-8 content-float">
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
