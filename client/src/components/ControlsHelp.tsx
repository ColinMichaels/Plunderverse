import { useState, useEffect } from "react";
import { Button } from "./ui/button";

const HELP_SHOWN_KEY = 'space_game_controls_help_shown';

export function ControlsHelp() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const hasSeenHelp = localStorage.getItem(HELP_SHOWN_KEY);
    if (!hasSeenHelp) {
      setIsVisible(true);
      setIsFirstTime(true);
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (isFirstTime) {
      localStorage.setItem(HELP_SHOWN_KEY, 'true');
      setIsFirstTime(false);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 left-4 bg-blue-600/80 hover:bg-blue-500/80 text-white px-3 py-2 rounded-lg border border-blue-400 transition-colors z-40 text-sm backdrop-blur-sm"
        title="Show Controls (F1)"
      >
        ❓ Help
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900/95 border-2 border-cyan-400 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-1">🚀 FLIGHT CONTROLS</h2>
            {isFirstTime && (
              <p className="text-sm text-yellow-400">Welcome, Commander! Here are your basic controls:</p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Controls Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Movement Controls */}
          <div className="space-y-3">
            <h3 className="text-cyan-300 font-semibold text-sm uppercase border-b border-cyan-700 pb-1">
              🎮 Ship Movement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                <span className="text-gray-300">Move Forward</span>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">W</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                <span className="text-gray-300">Move Backward</span>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">S</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                <span className="text-gray-300">Move Left</span>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">A</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                <span className="text-gray-300">Move Right</span>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">D</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                <span className="text-gray-300">Move Up</span>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">Q</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                <span className="text-gray-300">Move Down</span>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">E</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                <span className="text-gray-300">Look Around</span>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">Mouse</kbd>
              </div>
            </div>
          </div>

          {/* Navigation & Actions */}
          <div className="space-y-3">
            <h3 className="text-cyan-300 font-semibold text-sm uppercase border-b border-cyan-700 pb-1">
              🌍 Navigation & Actions
            </h3>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-300 mb-1">Select Planet:</div>
                <div className="text-xs text-cyan-400">Click planet on minimap (bottom-left)</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-300 mb-1">Engage Autopilot:</div>
                <div className="text-xs text-cyan-400">Click "Engage Autopilot" after selecting planet</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-300 mb-1">Land on Planet:</div>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono text-xs">L</kbd>
                <div className="text-xs text-yellow-400 mt-1">Must be close to selected planet</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-300 mb-1">Fire Lasers:</div>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono text-xs">Space</kbd>
              </div>
              <div className="bg-gray-800/50 p-2 rounded">
                <div className="text-gray-300 mb-1">Toggle Help:</div>
                <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono text-xs">F1</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-blue-900/30 border border-blue-400/30 rounded p-4 mb-6">
          <h3 className="text-blue-300 font-semibold text-sm mb-2">💡 QUICK TIPS</h3>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Use autopilot for long-distance travel between planets</li>
            <li>• Monitor your fuel levels - refuel when needed</li>
            <li>• Mine resources on planet surfaces to earn credits and crypto</li>
            <li>• Keep your ship systems repaired for optimal performance</li>
            <li>• Double-tap W to activate warp speed (requires fuel or upgrade)</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleDismiss}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-8 py-3"
          >
            {isFirstTime ? "🚀 GOT IT! LET'S FLY" : "Close Help (F1)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
