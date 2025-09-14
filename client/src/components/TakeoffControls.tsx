import { useLandedState } from "../lib/stores/useLandedState";
import { useMining } from "../lib/stores/useMining";
import { useAudio } from "../lib/stores/useAudio";

export function TakeoffControls() {
  const { isLanded, landedPlanet, setNotLanded } = useLandedState();
  const { isActive: isMining, stopMining } = useMining();
  const { playSuccess } = useAudio();

  if (!isLanded) return null;

  const handleTakeoff = () => {
    if (isMining) {
      stopMining();
      console.log("Mining operations stopped for takeoff");
    }
    
    setNotLanded();
    playSuccess();
    console.log(`Taking off from ${landedPlanet}`);
  };

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="bg-gray-900/90 border border-orange-400 rounded-lg p-4 max-w-sm">
        <h3 className="text-lg font-bold text-orange-400 mb-2">
          🚀 Surface Operations
        </h3>
        <p className="text-gray-300 text-sm mb-3">
          Landed on {landedPlanet}
        </p>
        
        {isMining && (
          <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-400 rounded text-yellow-400 text-sm">
            ⚠️ Mining in progress - will stop on takeoff
          </div>
        )}
        
        <button
          onClick={handleTakeoff}
          className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition-colors"
        >
          🚀 Take Off
        </button>
      </div>
    </div>
  );
}