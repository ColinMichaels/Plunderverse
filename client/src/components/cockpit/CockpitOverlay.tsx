import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useEnemies } from "../../lib/stores/combat/useEnemies";
import { useHUDContext } from "../../lib/stores/ui/useHUDContext";

export function CockpitOverlay() {
  const { isThrusting } = useShipStatus();
  const { selectedPlanet } = useSolarSystem();
  const { enemies } = useEnemies();
  const { isInCombat } = useHUDContext();

  // Only show overlay when:
  // 1. A planet is selected/targeted
  // 2. In active combat (enemies nearby or actively fighting)
  const shouldShowOverlay = selectedPlanet || isInCombat || enemies.length > 0;

  // If conditions aren't met, don't render the overlay
  if (!shouldShowOverlay) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Central crosshair - smaller and fade when thrusting */}
      <div
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
          isThrusting ? "opacity-20" : "opacity-60"
        }`}
      >
        <div className="relative">
          {/* Main crosshair */}
          <div className="w-6 h-6 border-2 border-cyan-400 rounded-full">
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-full h-0.5 bg-cyan-400" />
              <div className="w-0.5 h-full bg-cyan-400 absolute top-0 left-1/2 transform -translate-x-1/2" />
            </div>
          </div>

          {/* Crosshair lines extending outward */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {/* Horizontal lines */}
            <div className="absolute top-1/2 -left-10 w-6 h-0.5 bg-cyan-400/40 transform -translate-y-1/2" />
            <div className="absolute top-1/2 left-4 w-6 h-0.5 bg-cyan-400/40 transform -translate-y-1/2" />
            {/* Vertical lines */}
            <div className="absolute -top-10 left-1/2 w-0.5 h-6 bg-cyan-400/40 transform -translate-x-1/2" />
            <div className="absolute top-4 left-1/2 w-0.5 h-6 bg-cyan-400/40 transform -translate-x-1/2" />
          </div>
        </div>
      </div>

      {/* Corner decorative elements */}
      <div className="absolute top-4 left-4">
        <div className="w-8 h-8 border-l-2 border-t-2 border-cyan-400/30" />
      </div>
      <div className="absolute top-4 right-4">
        <div className="w-8 h-8 border-r-2 border-t-2 border-cyan-400/30" />
      </div>
      <div className="absolute bottom-4 left-4">
        <div className="w-8 h-8 border-l-2 border-b-2 border-cyan-400/30" />
      </div>
      <div className="absolute bottom-4 right-4">
        <div className="w-8 h-8 border-r-2 border-b-2 border-cyan-400/30" />
      </div>

      {/* Side instrument panels */}
      <div className="absolute top-20 left-2 space-y-2"></div>
    </div>
  );
}
