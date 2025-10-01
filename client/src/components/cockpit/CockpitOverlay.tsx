import { useShipStatus } from "../../lib/stores/ship/useShipStatus";

export function CockpitOverlay() {
  const { isThrusting } = useShipStatus();

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Cockpit frame - top and bottom bars */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-900/80 to-transparent border-b border-gray-600/50" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900/80 to-transparent border-t border-gray-600/50" />

      {/* Side panels */}
      <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-gray-900/80 to-transparent border-r border-gray-600/50" />
      <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-gray-900/80 to-transparent border-l border-gray-600/50" />

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

      {/* Right side digital readouts */}
      <div className="absolute top-20 right-2 space-y-2 text-right text-xs font-mono text-cyan-400">
        <div className="bg-black/40 border border-cyan-400/30 px-2 py-1">
          <div>VEL: 245.7</div>
        </div>
        <div className="bg-black/40 border border-cyan-400/30 px-2 py-1">
          <div>ALT: 1.2K</div>
        </div>
        <div className="bg-black/40 border border-cyan-400/30 px-2 py-1">
          <div>TMP: 23°C</div>
        </div>
      </div>
    </div>
  );
}
