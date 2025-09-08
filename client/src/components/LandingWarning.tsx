import { useState } from "react";
import { useCredits } from "../lib/stores/useCredits";

interface LandingWarningProps {
  isVisible: boolean;
  planetName: string;
  currentDistance: number;
  requiredDistance: number;
  onClose: () => void;
  onAutopilot: () => void;
}

export function LandingWarning({
  isVisible,
  planetName,
  currentDistance,
  requiredDistance,
  onClose,
  onAutopilot
}: LandingWarningProps) {
  const { credits, spendCredits } = useCredits();
  const [isActivatingAutopilot, setIsActivatingAutopilot] = useState(false);
  
  const autopilotCost = 50; // Credits required for autopilot
  const canAffordAutopilot = credits >= autopilotCost;

  const handleAutopilot = () => {
    if (spendCredits(autopilotCost)) {
      setIsActivatingAutopilot(true);
      onAutopilot();
      setTimeout(() => {
        setIsActivatingAutopilot(false);
        onClose();
      }, 2000);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-red-500 p-6 rounded-lg max-w-md mx-4">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="text-red-400 text-4xl mb-3">⚠️</div>
          
          <h2 className="text-xl font-bold text-red-400 mb-4">
            Unable to Land on {planetName}
          </h2>
          
          <div className="text-gray-300 text-sm mb-4 space-y-2">
            <p>Your ship is too far from the planet to initiate landing sequence.</p>
            <div className="bg-gray-800 p-3 rounded border">
              <div>Current Distance: <span className="text-yellow-400">{Math.round(currentDistance)} units</span></div>
              <div>Required Distance: <span className="text-green-400">{Math.round(requiredDistance)} units</span></div>
            </div>
          </div>

          {/* Autopilot Option */}
          <div className="bg-blue-900/30 border border-blue-500 p-4 rounded mb-4">
            <h3 className="text-blue-400 font-semibold mb-2">🤖 Autopilot Available</h3>
            <p className="text-gray-300 text-sm mb-3">
              Activate autopilot to automatically navigate to {planetName} landing zone.
            </p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Cost:</span>
              <span className="text-yellow-400 font-mono">{autopilotCost} Credits</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Your Credits:</span>
              <span className={`font-mono ${canAffordAutopilot ? 'text-green-400' : 'text-red-400'}`}>
                {credits} Credits
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAutopilot}
              disabled={!canAffordAutopilot || isActivatingAutopilot}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                canAffordAutopilot && !isActivatingAutopilot
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isActivatingAutopilot ? 'Activating...' : 'Use Autopilot'}
            </button>
          </div>

          {!canAffordAutopilot && (
            <p className="text-red-400 text-xs mt-2">
              Insufficient credits for autopilot assistance
            </p>
          )}
        </div>
      </div>
    </div>
  );
}