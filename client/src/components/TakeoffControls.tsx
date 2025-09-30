import { useLandedState } from "../lib/stores/useLandedState";
import { useMining } from "../lib/stores/useMining";
import { useAudio } from "../lib/stores/useAudio";
import { SpaceUIPanel } from "./SpaceUIPanel";

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
    <SpaceUIPanel
      id="surface-operations"
      title="SURFACE OPERATIONS"
      icon="🚀"
      zone="left-sidebar"
      priority={5}
      defaultExpanded={false}
    >
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
          className="bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center"
          title="Take Off"
        >
          <span className="text-xl">🚀</span>
        </button>
      </div>
    </SpaceUIPanel>
  );
}
