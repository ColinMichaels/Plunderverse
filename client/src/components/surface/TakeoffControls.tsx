import { useLandedState } from "../../lib/stores/surface/useLandedState";
import { useMining } from "../../lib/stores/economy/useMining";
import { useAudio } from "../../lib/stores/ui/useAudio";

export function TakeoffControls() {
  const { isLanded, landedPlanet, setIsTakingOff, isTakingOff } =
    useLandedState();
  const { isActive: isMining, stopMining } = useMining();
  const { playTakeoff } = useAudio();

  if (!isLanded) return null;

  const handleTakeoff = () => {
    if (isMining) {
      stopMining();
      console.log("Mining operations stopped for takeoff");
    }

    // Trigger the takeoff sequence
    setIsTakingOff(true);
    playTakeoff();
    console.log(`Initiating takeoff sequence from ${landedPlanet}`);
  };

  return (
    <div className="space-y-3">
      <div className="space-status-bar">
        <div className="space-status-item col-span-2">
          <span className="text-orange-400 font-mono">LOCATION:</span>
          <span className="font-mono">{landedPlanet}</span>
        </div>
      </div>

      {isMining && (
        <div className="p-2 bg-yellow-900/30 border border-yellow-400/50 rounded text-yellow-400 text-xs font-mono">
          ⚠️ Mining in progress - will stop on takeoff
        </div>
      )}

      <button
        onClick={handleTakeoff}
        disabled={isTakingOff}
        className={`bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center ${isTakingOff ? "opacity-50 cursor-not-allowed" : ""}`}
        title={isTakingOff ? "Taking off..." : "Take Off"}
      >
        <span className="text-xl">🚀</span>
      </button>
    </div>
  );
}
