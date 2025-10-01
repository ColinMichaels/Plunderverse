import { useLandedState } from "../../lib/stores/useLandedState";
import { useMining } from "../../lib/stores/useMining";
import { useAudio } from "../../lib/stores/useAudio";
import { useSolarSystem } from "../../lib/stores/useSolarSystem";
import { planets } from "../../lib/planetData";
import * as THREE from "three";
import { SpaceUIPanel } from "../ui/SpaceUIPanel";

export function TakeoffControls() {
  const { isLanded, landedPlanet, setNotLanded } = useLandedState();
  const { isActive: isMining, stopMining } = useMining();
  const { playSuccess } = useAudio();
  const { time, setCameraPosition } = useSolarSystem();

  if (!isLanded) return null;

  const handleTakeoff = () => {
    if (isMining) {
      stopMining();
      console.log("Mining operations stopped for takeoff");
    }
    
    // Find the planet we're taking off from
    const planet = planets.find((p) => p.name === landedPlanet);
    
    if (planet) {
      // Calculate the planet's current orbital position
      const angle = time * planet.orbitalSpeed;
      const orbitX = Math.cos(angle) * planet.distance;
      const orbitZ = Math.sin(angle) * planet.distance;
      
      // Position player slightly above and offset from planet in its orbit
      // Using planet size to ensure we're just outside the planet
      const orbitOffset = planet.size * 8; // 8x planet radius for comfortable viewing distance
      const orbitY = 10; // Slight elevation above orbital plane
      
      const takeoffPosition = new THREE.Vector3(
        orbitX + Math.cos(angle) * orbitOffset,
        orbitY,
        orbitZ + Math.sin(angle) * orbitOffset
      );
      
      // Set camera to orbital position
      setCameraPosition(takeoffPosition);
      console.log(`Taking off from ${landedPlanet} to orbital position:`, takeoffPosition);
    }
    
    setNotLanded();
    playSuccess();
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
